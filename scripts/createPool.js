const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n=== Створення пулу ліквідності ===\n");

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const files = fs.readdirSync(deploymentsDir);
  const latestDeployment = files
    .filter(f => f.startsWith(hre.network.name))
    .sort()
    .pop();

  if (!latestDeployment) {
    console.error("❌ Не знайдено deployment файл");
    process.exit(1);
  }

  const deploymentPath = path.join(deploymentsDir, latestDeployment);
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  const [signer] = await hre.ethers.getSigners();
  console.log("Signer:", signer.address);

  const dex = await hre.ethers.getContractAt(
    "DEXCore",
    deploymentInfo.contracts.DEXCore
  );

  const tokenAAddress = process.argv[2] || deploymentInfo.tokens.USDC;
  const tokenBAddress = process.argv[3] || deploymentInfo.tokens.WETH;

  console.log("Створюю пул для:");
  console.log("  Token A:", tokenAAddress);
  console.log("  Token B:", tokenBAddress);
  console.log("");

  const tx = await dex.createPool(tokenAAddress, tokenBAddress);
  console.log("Транзакція:", tx.hash);

  const receipt = await tx.wait();
  console.log("✅ Пул створено успішно!");

  const poolId = await dex.getPoolId(tokenAAddress, tokenBAddress);
  const pool = await dex.getPool(tokenAAddress, tokenBAddress);

  console.log("");
  console.log("📋 Інформація про пул:");
  console.log("Pool ID:   ", poolId);
  console.log("LP Token:  ", pool.lpToken);
  console.log("Token A:   ", pool.tokenA);
  console.log("Token B:   ", pool.tokenB);
  console.log("Reserve A: ", pool.reserveA.toString());
  console.log("Reserve B: ", pool.reserveB.toString());
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Помилка:", error);
    process.exit(1);
  });
