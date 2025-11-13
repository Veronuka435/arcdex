const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n=== Розгортання DEX з Vault Architecture на Arc Network ===\n");

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log("Deployer адреса:", deployer.address);
  console.log("Deployer баланс:", hre.ethers.formatEther(balance), "USDC");
  console.log("Мережа:", hre.network.name);
  console.log("Chain ID:", (await hre.ethers.provider.getNetwork()).chainId.toString());
  console.log("");

  console.log("1️⃣  Розгортаю тестові токени...");
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");

  const weth = await MockERC20.deploy("Wrapped Ether", "WETH", 18);
  await weth.waitForDeployment();
  const wethAddress = await weth.getAddress();
  console.log("✅ Mock WETH розгорнуто:", wethAddress);

  const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("✅ Mock USDC розгорнуто:", usdcAddress);

  const dai = await MockERC20.deploy("Dai Stablecoin", "DAI", 18);
  await dai.waitForDeployment();
  const daiAddress = await dai.getAddress();
  console.log("✅ Mock DAI розгорнуто:", daiAddress);
  console.log("");

  console.log("2️⃣  Mint тестові токени для deployer...");
  await weth.mint(deployer.address, hre.ethers.parseEther("10000"));
  await usdc.mint(deployer.address, hre.ethers.parseUnits("1000000", 6));
  await dai.mint(deployer.address, hre.ethers.parseEther("1000000"));
  console.log("✅ Mint: 10,000 WETH, 1M USDC, 1M DAI");
  console.log("");

  console.log("3️⃣  Розгортаю Vault...");
  const Vault = await hre.ethers.getContractFactory("Vault");
  const vault = await Vault.deploy(wethAddress);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("✅ Vault розгорнуто:", vaultAddress);
  console.log("");

  console.log("4️⃣  Розгортаю PoolFactory...");
  const PoolFactory = await hre.ethers.getContractFactory("PoolFactory");
  const factory = await PoolFactory.deploy(vaultAddress);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("✅ PoolFactory розгорнуто:", factoryAddress);
  console.log("");

  console.log("5️⃣  Розгортаю Router...");
  const Router = await hre.ethers.getContractFactory("Router");
  const router = await Router.deploy(vaultAddress, factoryAddress, wethAddress);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("✅ Router розгорнуто:", routerAddress);
  console.log("");

  console.log("6️⃣  Створюю пули ліквідності...");

  console.log("   Створюю USDC/WETH пул...");
  const tx1 = await factory.createPool(usdcAddress, wethAddress);
  await tx1.wait();
  const usdcWethPool = await factory.getPool(usdcAddress, wethAddress);
  console.log("✅ USDC/WETH пул:", usdcWethPool);

  console.log("   Створюю DAI/USDC пул...");
  const tx2 = await factory.createPool(daiAddress, usdcAddress);
  await tx2.wait();
  const daiUsdcPool = await factory.getPool(daiAddress, usdcAddress);
  console.log("✅ DAI/USDC пул:", daiUsdcPool);

  console.log("   Створюю WETH/DAI пул...");
  const tx3 = await factory.createPool(wethAddress, daiAddress);
  await tx3.wait();
  const wethDaiPool = await factory.getPool(wethAddress, daiAddress);
  console.log("✅ WETH/DAI пул:", wethDaiPool);
  console.log("");

  console.log("7️⃣  Авторизую пули у Vault...");
  await vault.authorizePool(usdcWethPool, true);
  await vault.authorizePool(daiUsdcPool, true);
  await vault.authorizePool(wethDaiPool, true);
  console.log("✅ Пули авторизовано");
  console.log("");

  console.log("8️⃣  Зберігаю адреси контрактів...");
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    architecture: "Vault-Based DEX (SyncSwap-style)",
    contracts: {
      Vault: vaultAddress,
      PoolFactory: factoryAddress,
      Router: routerAddress,
    },
    pools: {
      "USDC/WETH": usdcWethPool,
      "DAI/USDC": daiUsdcPool,
      "WETH/DAI": wethDaiPool,
    },
    tokens: {
      WETH: wethAddress,
      USDC: usdcAddress,
      DAI: daiAddress,
    },
    deployedAt: new Date().toISOString(),
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const deploymentPath = path.join(
    deploymentsDir,
    `vault-dex-${hre.network.name}-${Date.now()}.json`
  );
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("✅ Адреси збережено в:", deploymentPath);
  console.log("");

  console.log("=== Розгортання завершено успішно! ===\n");
  console.log("📋 Підсумок:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Vault Address:         ", vaultAddress);
  console.log("PoolFactory Address:   ", factoryAddress);
  console.log("Router Address:        ", routerAddress);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n📦 Пули:");
  console.log("USDC/WETH Pool:        ", usdcWethPool);
  console.log("DAI/USDC Pool:         ", daiUsdcPool);
  console.log("WETH/DAI Pool:         ", wethDaiPool);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n💰 Токени:");
  console.log("WETH Address:          ", wethAddress);
  console.log("USDC Address:          ", usdcAddress);
  console.log("DAI Address:           ", daiAddress);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("📝 Наступні кроки:");
  console.log("1. Додайте ліквідність до пулів через Router");
  console.log("2. Протестуйте swap функціональність");
  console.log("3. Перевірте flash loans через Vault");
  console.log("4. Верифікуйте контракти на Arc Explorer");
  console.log("");

  console.log("🔗 Корисні посилання:");
  console.log("Arc Testnet Explorer: https://explorer-testnet.arc.network");
  console.log("Arc Faucet:          https://faucet-testnet.arc.network");
  console.log("Arc Docs:            https://docs.arc.network");
  console.log("");

  console.log("💡 Особливості архітектури:");
  console.log("- Vault централізує всі токени (менше газу)");
  console.log("- Внутрішні трансфери без ERC20 transferFrom");
  console.log("- Flash loans вбудовані у Vault");
  console.log("- Модульні пули (можна додати StablePool)");
  console.log("- Router для зручності користувачів");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Помилка розгортання:", error);
    process.exit(1);
  });
