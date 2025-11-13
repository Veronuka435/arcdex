const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("DEXCore", function () {
  async function deployDEXFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    const TokenWhitelist = await ethers.getContractFactory("TokenWhitelist");
    const whitelist = await TokenWhitelist.deploy(owner.address);

    const DEXCore = await ethers.getContractFactory("DEXCore");
    const dex = await DEXCore.deploy(await whitelist.getAddress(), owner.address);

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    const weth = await MockERC20.deploy("Wrapped Ether", "WETH", 18);
    const dai = await MockERC20.deploy("Dai Stablecoin", "DAI", 18);

    await whitelist.addToken(
      await usdc.getAddress(),
      "USD Coin",
      "USDC",
      6
    );
    await whitelist.addToken(
      await weth.getAddress(),
      "Wrapped Ether",
      "WETH",
      18
    );
    await whitelist.addToken(
      await dai.getAddress(),
      "Dai Stablecoin",
      "DAI",
      18
    );

    const usdcAmount = ethers.parseUnits("10000", 6);
    const wethAmount = ethers.parseEther("100");
    const daiAmount = ethers.parseEther("10000");

    await usdc.mint(user1.address, usdcAmount);
    await weth.mint(user1.address, wethAmount);
    await dai.mint(user1.address, daiAmount);

    await usdc.mint(user2.address, usdcAmount);
    await weth.mint(user2.address, wethAmount);

    return { dex, whitelist, usdc, weth, dai, owner, user1, user2 };
  }

  describe("Deployment", function () {
    it("Should deploy with correct whitelist", async function () {
      const { dex, whitelist } = await loadFixture(deployDEXFixture);
      expect(await dex.whitelist()).to.equal(await whitelist.getAddress());
    });

    it("Should have correct initial swap fee", async function () {
      const { dex } = await loadFixture(deployDEXFixture);
      expect(await dex.swapFee()).to.equal(30);
    });

    it("Should set correct owner", async function () {
      const { dex, owner } = await loadFixture(deployDEXFixture);
      expect(await dex.owner()).to.equal(owner.address);
    });
  });

  describe("Pool Creation", function () {
    it("Should create a new pool", async function () {
      const { dex, usdc, weth } = await loadFixture(deployDEXFixture);

      await expect(dex.createPool(await usdc.getAddress(), await weth.getAddress()))
        .to.emit(dex, "PoolCreated");

      const poolId = await dex.getPoolId(await usdc.getAddress(), await weth.getAddress());
      const pool = await dex.getPool(await usdc.getAddress(), await weth.getAddress());

      expect(pool.exists).to.be.true;
      expect(pool.lpToken).to.not.equal(ethers.ZeroAddress);
    });

    it("Should fail to create pool with non-whitelisted token", async function () {
      const { dex, usdc } = await loadFixture(deployDEXFixture);
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const fakeToken = await MockERC20.deploy("Fake Token", "FAKE", 18);

      await expect(
        dex.createPool(await usdc.getAddress(), await fakeToken.getAddress())
      ).to.be.revertedWith("DEXCore: tokenB not whitelisted");
    });

    it("Should fail to create duplicate pool", async function () {
      const { dex, usdc, weth } = await loadFixture(deployDEXFixture);

      await dex.createPool(await usdc.getAddress(), await weth.getAddress());

      await expect(
        dex.createPool(await usdc.getAddress(), await weth.getAddress())
      ).to.be.revertedWith("DEXCore: pool already exists");
    });

    it("Should fail to create pool with identical tokens", async function () {
      const { dex, usdc } = await loadFixture(deployDEXFixture);

      await expect(
        dex.createPool(await usdc.getAddress(), await usdc.getAddress())
      ).to.be.revertedWith("DEXCore: identical tokens");
    });

    it("Should fail when non-owner tries to create pool", async function () {
      const { dex, usdc, weth, user1 } = await loadFixture(deployDEXFixture);

      await expect(
        dex.connect(user1).createPool(await usdc.getAddress(), await weth.getAddress())
      ).to.be.revertedWithCustomError(dex, "OwnableUnauthorizedAccount");
    });
  });

  describe("Add Liquidity", function () {
    it("Should add initial liquidity to pool", async function () {
      const { dex, usdc, weth, user1 } = await loadFixture(deployDEXFixture);

      await dex.createPool(await usdc.getAddress(), await weth.getAddress());

      const usdcAmount = ethers.parseUnits("1000", 6);
      const wethAmount = ethers.parseEther("1");

      await usdc.connect(user1).approve(await dex.getAddress(), usdcAmount);
      await weth.connect(user1).approve(await dex.getAddress(), wethAmount);

      await expect(
        dex.connect(user1).addLiquidity(
          await usdc.getAddress(),
          await weth.getAddress(),
          usdcAmount,
          wethAmount,
          0
        )
      ).to.emit(dex, "LiquidityAdded");

      const pool = await dex.getPool(await usdc.getAddress(), await weth.getAddress());
      expect(pool.reserveA).to.equal(usdcAmount);
      expect(pool.reserveB).to.equal(wethAmount);
    });

    it("Should add subsequent liquidity proportionally", async function () {
      const { dex, usdc, weth, user1, user2 } = await loadFixture(deployDEXFixture);

      await dex.createPool(await usdc.getAddress(), await weth.getAddress());

      const usdcAmount1 = ethers.parseUnits("1000", 6);
      const wethAmount1 = ethers.parseEther("1");

      await usdc.connect(user1).approve(await dex.getAddress(), usdcAmount1);
      await weth.connect(user1).approve(await dex.getAddress(), wethAmount1);
      await dex.connect(user1).addLiquidity(
        await usdc.getAddress(),
        await weth.getAddress(),
        usdcAmount1,
        wethAmount1,
        0
      );

      const usdcAmount2 = ethers.parseUnits("500", 6);
      const wethAmount2 = ethers.parseEther("0.5");

      await usdc.connect(user2).approve(await dex.getAddress(), usdcAmount2);
      await weth.connect(user2).approve(await dex.getAddress(), wethAmount2);
      await dex.connect(user2).addLiquidity(
        await usdc.getAddress(),
        await weth.getAddress(),
        usdcAmount2,
        wethAmount2,
        0
      );

      const pool = await dex.getPool(await usdc.getAddress(), await weth.getAddress());
      expect(pool.reserveA).to.equal(usdcAmount1 + usdcAmount2);
      expect(pool.reserveB).to.equal(wethAmount1 + wethAmount2);
    });

    it("Should fail to add liquidity with zero amounts", async function () {
      const { dex, usdc, weth, user1 } = await loadFixture(deployDEXFixture);

      await dex.createPool(await usdc.getAddress(), await weth.getAddress());

      await expect(
        dex.connect(user1).addLiquidity(
          await usdc.getAddress(),
          await weth.getAddress(),
          0,
          ethers.parseEther("1"),
          0
        )
      ).to.be.revertedWith("DEXCore: amountA is zero");
    });

    it("Should fail to add liquidity to non-existent pool", async function () {
      const { dex, usdc, weth, user1 } = await loadFixture(deployDEXFixture);

      const usdcAmount = ethers.parseUnits("1000", 6);
      const wethAmount = ethers.parseEther("1");

      await usdc.connect(user1).approve(await dex.getAddress(), usdcAmount);
      await weth.connect(user1).approve(await dex.getAddress(), wethAmount);

      await expect(
        dex.connect(user1).addLiquidity(
          await usdc.getAddress(),
          await weth.getAddress(),
          usdcAmount,
          wethAmount,
          0
        )
      ).to.be.revertedWith("DEXCore: pool does not exist");
    });

    it("Should fail when minLiquidity not met (slippage protection)", async function () {
      const { dex, usdc, weth, user1 } = await loadFixture(deployDEXFixture);

      await dex.createPool(await usdc.getAddress(), await weth.getAddress());

      const usdcAmount = ethers.parseUnits("1000", 6);
      const wethAmount = ethers.parseEther("1");

      await usdc.connect(user1).approve(await dex.getAddress(), usdcAmount);
      await weth.connect(user1).approve(await dex.getAddress(), wethAmount);

      await expect(
        dex.connect(user1).addLiquidity(
          await usdc.getAddress(),
          await weth.getAddress(),
          usdcAmount,
          wethAmount,
          ethers.parseEther("1000000")
        )
      ).to.be.revertedWith("DEXCore: insufficient liquidity");
    });
  });

  describe("Remove Liquidity", function () {
    async function setupPoolWithLiquidity() {
      const fixture = await loadFixture(deployDEXFixture);
      const { dex, usdc, weth, user1 } = fixture;

      await dex.createPool(await usdc.getAddress(), await weth.getAddress());

      const usdcAmount = ethers.parseUnits("1000", 6);
      const wethAmount = ethers.parseEther("1");

      await usdc.connect(user1).approve(await dex.getAddress(), usdcAmount);
      await weth.connect(user1).approve(await dex.getAddress(), wethAmount);
      await dex.connect(user1).addLiquidity(
        await usdc.getAddress(),
        await weth.getAddress(),
        usdcAmount,
        wethAmount,
        0
      );

      return fixture;
    }

    it("Should remove liquidity from pool", async function () {
      const { dex, usdc, weth, user1 } = await setupPoolWithLiquidity();

      const pool = await dex.getPool(await usdc.getAddress(), await weth.getAddress());
      const LPToken = await ethers.getContractAt("LPToken", pool.lpToken);
      const lpBalance = await LPToken.balanceOf(user1.address);

      await LPToken.connect(user1).approve(await dex.getAddress(), lpBalance);

      await expect(
        dex.connect(user1).removeLiquidity(
          await usdc.getAddress(),
          await weth.getAddress(),
          lpBalance,
          0,
          0
        )
      ).to.emit(dex, "LiquidityRemoved");
    });

    it("Should fail to remove liquidity with zero amount", async function () {
      const { dex, usdc, weth, user1 } = await setupPoolWithLiquidity();

      await expect(
        dex.connect(user1).removeLiquidity(
          await usdc.getAddress(),
          await weth.getAddress(),
          0,
          0,
          0
        )
      ).to.be.revertedWith("DEXCore: liquidity is zero");
    });

    it("Should fail when minAmount not met (slippage protection)", async function () {
      const { dex, usdc, weth, user1 } = await setupPoolWithLiquidity();

      const pool = await dex.getPool(await usdc.getAddress(), await weth.getAddress());
      const LPToken = await ethers.getContractAt("LPToken", pool.lpToken);
      const lpBalance = await LPToken.balanceOf(user1.address);

      await LPToken.connect(user1).approve(await dex.getAddress(), lpBalance);

      await expect(
        dex.connect(user1).removeLiquidity(
          await usdc.getAddress(),
          await weth.getAddress(),
          lpBalance,
          ethers.parseUnits("10000", 6),
          0
        )
      ).to.be.revertedWith("DEXCore: insufficient amountA");
    });
  });

  describe("Swap", function () {
    async function setupPoolWithLiquidity() {
      const fixture = await loadFixture(deployDEXFixture);
      const { dex, usdc, weth, user1 } = fixture;

      await dex.createPool(await usdc.getAddress(), await weth.getAddress());

      const usdcAmount = ethers.parseUnits("10000", 6);
      const wethAmount = ethers.parseEther("10");

      await usdc.connect(user1).approve(await dex.getAddress(), usdcAmount);
      await weth.connect(user1).approve(await dex.getAddress(), wethAmount);
      await dex.connect(user1).addLiquidity(
        await usdc.getAddress(),
        await weth.getAddress(),
        usdcAmount,
        wethAmount,
        0
      );

      return fixture;
    }

    it("Should swap tokens successfully", async function () {
      const { dex, usdc, weth, user2 } = await setupPoolWithLiquidity();

      const swapAmount = ethers.parseUnits("100", 6);
      await usdc.connect(user2).approve(await dex.getAddress(), swapAmount);

      const balanceBefore = await weth.balanceOf(user2.address);

      await expect(
        dex.connect(user2).swap(
          await usdc.getAddress(),
          await weth.getAddress(),
          swapAmount,
          0
        )
      ).to.emit(dex, "Swap");

      const balanceAfter = await weth.balanceOf(user2.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should calculate correct output amount", async function () {
      const { dex, usdc, weth, user2 } = await setupPoolWithLiquidity();

      const swapAmount = ethers.parseUnits("100", 6);
      const expectedOut = await dex.getAmountOut(
        await usdc.getAddress(),
        await weth.getAddress(),
        swapAmount
      );

      await usdc.connect(user2).approve(await dex.getAddress(), swapAmount);
      await dex.connect(user2).swap(
        await usdc.getAddress(),
        await weth.getAddress(),
        swapAmount,
        0
      );

      expect(expectedOut).to.be.gt(0);
    });

    it("Should respect swap fee", async function () {
      const { dex, usdc, weth, user2 } = await setupPoolWithLiquidity();

      const swapAmount = ethers.parseUnits("1000", 6);
      const expectedOut = await dex.getAmountOut(
        await usdc.getAddress(),
        await weth.getAddress(),
        swapAmount
      );

      const swapFee = await dex.swapFee();
      const expectedOutWithoutFee = (swapAmount * BigInt(10000)) / (BigInt(10000) + swapAmount / BigInt(10000));

      expect(expectedOut).to.be.lt(expectedOutWithoutFee);
    });

    it("Should fail when slippage exceeded", async function () {
      const { dex, usdc, weth, user2 } = await setupPoolWithLiquidity();

      const swapAmount = ethers.parseUnits("100", 6);
      await usdc.connect(user2).approve(await dex.getAddress(), swapAmount);

      await expect(
        dex.connect(user2).swap(
          await usdc.getAddress(),
          await weth.getAddress(),
          swapAmount,
          ethers.parseEther("100")
        )
      ).to.be.revertedWith("DEXCore: slippage exceeded");
    });

    it("Should fail with zero swap amount", async function () {
      const { dex, usdc, weth, user2 } = await setupPoolWithLiquidity();

      await expect(
        dex.connect(user2).swap(
          await usdc.getAddress(),
          await weth.getAddress(),
          0,
          0
        )
      ).to.be.revertedWith("DEXCore: amountIn is zero");
    });

    it("Should fail to swap identical tokens", async function () {
      const { dex, usdc, user2 } = await setupPoolWithLiquidity();

      await expect(
        dex.connect(user2).swap(
          await usdc.getAddress(),
          await usdc.getAddress(),
          ethers.parseUnits("100", 6),
          0
        )
      ).to.be.revertedWith("DEXCore: identical tokens");
    });
  });

  describe("Admin Functions", function () {
    it("Should update swap fee", async function () {
      const { dex } = await loadFixture(deployDEXFixture);

      await expect(dex.setSwapFee(50))
        .to.emit(dex, "SwapFeeUpdated")
        .withArgs(30, 50);

      expect(await dex.swapFee()).to.equal(50);
    });

    it("Should fail to set fee above maximum", async function () {
      const { dex } = await loadFixture(deployDEXFixture);

      await expect(dex.setSwapFee(101)).to.be.revertedWith("DEXCore: fee too high");
    });

    it("Should pause and unpause contract", async function () {
      const { dex, usdc, weth, user1 } = await loadFixture(deployDEXFixture);

      await dex.createPool(await usdc.getAddress(), await weth.getAddress());
      await dex.pause();

      const usdcAmount = ethers.parseUnits("1000", 6);
      const wethAmount = ethers.parseEther("1");

      await usdc.connect(user1).approve(await dex.getAddress(), usdcAmount);
      await weth.connect(user1).approve(await dex.getAddress(), wethAmount);

      await expect(
        dex.connect(user1).addLiquidity(
          await usdc.getAddress(),
          await weth.getAddress(),
          usdcAmount,
          wethAmount,
          0
        )
      ).to.be.revertedWithCustomError(dex, "EnforcedPause");

      await dex.unpause();

      await expect(
        dex.connect(user1).addLiquidity(
          await usdc.getAddress(),
          await weth.getAddress(),
          usdcAmount,
          wethAmount,
          0
        )
      ).to.not.be.reverted;
    });

    it("Should fail when non-owner tries admin functions", async function () {
      const { dex, user1 } = await loadFixture(deployDEXFixture);

      await expect(
        dex.connect(user1).setSwapFee(50)
      ).to.be.revertedWithCustomError(dex, "OwnableUnauthorizedAccount");

      await expect(
        dex.connect(user1).pause()
      ).to.be.revertedWithCustomError(dex, "OwnableUnauthorizedAccount");
    });
  });

  describe("Helper Functions", function () {
    it("Should return correct pool ID", async function () {
      const { dex, usdc, weth } = await loadFixture(deployDEXFixture);

      const poolId1 = await dex.getPoolId(await usdc.getAddress(), await weth.getAddress());
      const poolId2 = await dex.getPoolId(await weth.getAddress(), await usdc.getAddress());

      expect(poolId1).to.equal(poolId2);
    });

    it("Should return correct pool count", async function () {
      const { dex, usdc, weth, dai } = await loadFixture(deployDEXFixture);

      expect(await dex.getPoolCount()).to.equal(0);

      await dex.createPool(await usdc.getAddress(), await weth.getAddress());
      expect(await dex.getPoolCount()).to.equal(1);

      await dex.createPool(await usdc.getAddress(), await dai.getAddress());
      expect(await dex.getPoolCount()).to.equal(2);
    });

    it("Should return all pool IDs", async function () {
      const { dex, usdc, weth, dai } = await loadFixture(deployDEXFixture);

      await dex.createPool(await usdc.getAddress(), await weth.getAddress());
      await dex.createPool(await usdc.getAddress(), await dai.getAddress());

      const poolIds = await dex.getAllPoolIds();
      expect(poolIds.length).to.equal(2);
    });
  });
});
