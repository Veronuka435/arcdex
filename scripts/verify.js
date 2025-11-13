const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n=== Верифікація контрактів на Arc Explorer ===\n");

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const files = fs.readdirSync(deploymentsDir);
  const latestDeployment = files
    .filter(f => f.startsWith(hre.network.name))
    .sort()
    .pop();

  if (!latestDeployment) {
    console.error("❌ Не знайдено deployment файл для мережі", hre.network.name);
    process.exit(1);
  }

  const deploymentPath = path.join(deploymentsDir, latestDeployment);
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  console.log("📋 Використовую deployment:", latestDeployment);
  console.log("   DEX Address:      ", deploymentInfo.contracts.DEXCore);
  console.log("   Whitelist Address:", deploymentInfo.contracts.TokenWhitelist);
  console.log("");

  console.log("1️⃣  Верифікую TokenWhitelist...");
  try {
    await hre.run("verify:verify", {
      address: deploymentInfo.contracts.TokenWhitelist,
      constructorArguments: [deploymentInfo.deployer],
    });
    console.log("✅ TokenWhitelist верифіковано");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ TokenWhitelist вже верифіковано");
    } else {
      console.error("❌ Помилка верифікації TokenWhitelist:", error.message);
    }
  }
  console.log("");

  console.log("2️⃣  Верифікую DEXCore...");
  try {
    await hre.run("verify:verify", {
      address: deploymentInfo.contracts.DEXCore,
      constructorArguments: [
        deploymentInfo.contracts.TokenWhitelist,
        deploymentInfo.deployer,
      ],
    });
    console.log("✅ DEXCore верифіковано");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ DEXCore вже верифіковано");
    } else {
      console.error("❌ Помилка верифікації DEXCore:", error.message);
    }
  }
  console.log("");

  console.log("=== Верифікація завершена ===\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Помилка:", error);
    process.exit(1);
  });
