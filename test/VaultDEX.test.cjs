const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Vault-Based DEX", function () {
  let vault, factory, router, pool;
  let weth, usdc, dai;
  let owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    weth = await MockERC20.deploy("Wrapped Ether", "WETH", 18);
    usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    dai = await MockERC20.deploy("Dai Stablecoin", "DAI", 18);

    await weth.mint(owner.address, ethers.parseEther("1000"));
    await usdc.mint(owner.address, ethers.parseUnits("1000000", 6));
    await dai.mint(owner.address, ethers.parseEther("1000000"));

    const Vault = await ethers.getContractFactory("Vault");
    vault = await Vault.deploy(await weth.getAddress());

    const PoolFactory = await ethers.getContractFactory("PoolFactory");
    factory = await PoolFactory.deploy(await vault.getAddress());

    const Router = await ethers.getContractFactory("Router");
    router = await Router.deploy(
      await vault.getAddress(),
      await factory.getAddress(),
      await weth.getAddress()
    );

    await factory.createPool(await usdc.getAddress(), await weth.getAddress());
    const poolAddress = await factory.getPool(await usdc.getAddress(), await weth.getAddress());
    pool = await ethers.getContractAt("ClassicPool", poolAddress);

    await vault.authorizePool(poolAddress, true);
  });

  describe("Vault", function () {
    it("Should deposit tokens", async function () {
      const amount = ethers.parseEther("100");
      await weth.approve(await vault.getAddress(), amount);
      await vault.deposit(await weth.getAddress(), owner.address, amount);

      expect(await vault.balanceOf(await weth.getAddress(), owner.address)).to.equal(amount);
      expect(await vault.reserves(await weth.getAddress())).to.equal(amount);
    });

    it("Should withdraw tokens", async function () {
      const amount = ethers.parseEther("100");
      await weth.approve(await vault.getAddress(), amount);
      await vault.deposit(await weth.getAddress(), owner.address, amount);

      const balanceBefore = await weth.balanceOf(owner.address);
      await vault.withdraw(await weth.getAddress(), owner.address, amount);

      expect(await weth.balanceOf(owner.address)).to.equal(balanceBefore + amount);
      expect(await vault.balanceOf(await weth.getAddress(), owner.address)).to.equal(0);
    });

    it("Should handle internal transfers", async function () {
      const amount = ethers.parseEther("100");
      await weth.approve(await vault.getAddress(), amount);
      await vault.deposit(await weth.getAddress(), owner.address, amount);

      await vault.internalTransfer(await weth.getAddress(), owner.address, user1.address, amount);

      expect(await vault.balanceOf(await weth.getAddress(), owner.address)).to.equal(0);
      expect(await vault.balanceOf(await weth.getAddress(), user1.address)).to.equal(amount);
    });
  });

  describe("PoolFactory", function () {
    it("Should create pool", async function () {
      const tx = await factory.createPool(await dai.getAddress(), await weth.getAddress());
      await tx.wait();

      const poolAddr = await factory.getPool(await dai.getAddress(), await weth.getAddress());
      expect(poolAddr).to.not.equal(ethers.ZeroAddress);
    });

    it("Should prevent duplicate pools", async function () {
      await expect(
        factory.createPool(await usdc.getAddress(), await weth.getAddress())
      ).to.be.revertedWith("Factory: pool exists");
    });

    it("Should track all pools", async function () {
      const lengthBefore = await factory.allPoolsLength();
      await factory.createPool(await dai.getAddress(), await weth.getAddress());
      const lengthAfter = await factory.allPoolsLength();

      expect(lengthAfter).to.equal(lengthBefore + BigInt(1));
    });
  });

  describe("Router - Swap", function () {
    beforeEach(async function () {
      const usdcAmount = ethers.parseUnits("10000", 6);
      const wethAmount = ethers.parseEther("5");

      await usdc.approve(await router.getAddress(), usdcAmount);
      await weth.approve(await router.getAddress(), wethAmount);

      await router.addLiquidity(
        await usdc.getAddress(),
        await weth.getAddress(),
        usdcAmount,
        wethAmount,
        0,
        0,
        owner.address,
        Math.floor(Date.now() / 1000) + 3600
      );
    });

    it("Should swap tokens", async function () {
      const swapAmount = ethers.parseUnits("100", 6);
      await usdc.mint(owner.address, swapAmount);
      await usdc.approve(await router.getAddress(), swapAmount);

      const path = [await usdc.getAddress(), await weth.getAddress()];
      const amounts = await router.getAmountOut(swapAmount, path);

      await router.swapExactTokensForTokens(
        swapAmount,
        0,
        path,
        owner.address,
        Math.floor(Date.now() / 1000) + 3600
      );

      expect(amounts[1]).to.be.gt(0);
    });

    it("Should calculate amount out correctly", async function () {
      const swapAmount = ethers.parseUnits("100", 6);
      const path = [await usdc.getAddress(), await weth.getAddress()];
      const amounts = await router.getAmountOut(swapAmount, path);

      expect(amounts[0]).to.equal(swapAmount);
      expect(amounts[1]).to.be.gt(0);
    });
  });

  describe("Router - Liquidity", function () {
    it("Should add liquidity", async function () {
      const usdcAmount = ethers.parseUnits("1000", 6);
      const wethAmount = ethers.parseEther("1");

      await usdc.approve(await router.getAddress(), usdcAmount);
      await weth.approve(await router.getAddress(), wethAmount);

      const tx = await router.addLiquidity(
        await usdc.getAddress(),
        await weth.getAddress(),
        usdcAmount,
        wethAmount,
        0,
        0,
        owner.address,
        Math.floor(Date.now() / 1000) + 3600
      );

      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });
  });

  describe("Pool", function () {
    it("Should have correct tokens", async function () {
      expect(await pool.token0()).to.equal(await usdc.getAddress());
      expect(await pool.token1()).to.equal(await weth.getAddress());
    });

    it("Should have correct fees", async function () {
      expect(await pool.swapFee()).to.equal(30);
      expect(await pool.protocolFee()).to.equal(5);
    });
  });
});
