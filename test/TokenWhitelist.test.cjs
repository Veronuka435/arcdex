const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("TokenWhitelist", function () {
  async function deployWhitelistFixture() {
    const [owner, user1] = await ethers.getSigners();

    const TokenWhitelist = await ethers.getContractFactory("TokenWhitelist");
    const whitelist = await TokenWhitelist.deploy(owner.address);

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    const weth = await MockERC20.deploy("Wrapped Ether", "WETH", 18);

    return { whitelist, usdc, weth, owner, user1 };
  }

  describe("Deployment", function () {
    it("Should set correct owner", async function () {
      const { whitelist, owner } = await loadFixture(deployWhitelistFixture);
      expect(await whitelist.owner()).to.equal(owner.address);
    });

    it("Should start with zero tokens", async function () {
      const { whitelist } = await loadFixture(deployWhitelistFixture);
      expect(await whitelist.getTokenCount()).to.equal(0);
    });
  });

  describe("Add Token", function () {
    it("Should add token successfully", async function () {
      const { whitelist, usdc } = await loadFixture(deployWhitelistFixture);

      await expect(
        whitelist.addToken(await usdc.getAddress(), "USD Coin", "USDC", 6)
      )
        .to.emit(whitelist, "TokenWhitelisted")
        .withArgs(await usdc.getAddress(), "USD Coin", "USDC", 6);

      expect(await whitelist.isWhitelisted(await usdc.getAddress())).to.be.true;
    });

    it("Should store token info correctly", async function () {
      const { whitelist, usdc } = await loadFixture(deployWhitelistFixture);

      await whitelist.addToken(await usdc.getAddress(), "USD Coin", "USDC", 6);

      const tokenInfo = await whitelist.getTokenInfo(await usdc.getAddress());
      expect(tokenInfo.isWhitelisted).to.be.true;
      expect(tokenInfo.name).to.equal("USD Coin");
      expect(tokenInfo.symbol).to.equal("USDC");
      expect(tokenInfo.decimals).to.equal(6);
      expect(tokenInfo.addedAt).to.be.gt(0);
    });

    it("Should increment token count", async function () {
      const { whitelist, usdc, weth } = await loadFixture(deployWhitelistFixture);

      await whitelist.addToken(await usdc.getAddress(), "USD Coin", "USDC", 6);
      expect(await whitelist.getTokenCount()).to.equal(1);

      await whitelist.addToken(await weth.getAddress(), "Wrapped Ether", "WETH", 18);
      expect(await whitelist.getTokenCount()).to.equal(2);
    });

    it("Should fail to add zero address", async function () {
      const { whitelist } = await loadFixture(deployWhitelistFixture);

      await expect(
        whitelist.addToken(ethers.ZeroAddress, "Zero", "ZERO", 18)
      ).to.be.revertedWith("TokenWhitelist: zero address");
    });

    it("Should fail to add duplicate token", async function () {
      const { whitelist, usdc } = await loadFixture(deployWhitelistFixture);

      await whitelist.addToken(await usdc.getAddress(), "USD Coin", "USDC", 6);

      await expect(
        whitelist.addToken(await usdc.getAddress(), "USD Coin", "USDC", 6)
      ).to.be.revertedWith("TokenWhitelist: already whitelisted");
    });

    it("Should fail with empty name", async function () {
      const { whitelist, usdc } = await loadFixture(deployWhitelistFixture);

      await expect(
        whitelist.addToken(await usdc.getAddress(), "", "USDC", 6)
      ).to.be.revertedWith("TokenWhitelist: empty name");
    });

    it("Should fail with empty symbol", async function () {
      const { whitelist, usdc } = await loadFixture(deployWhitelistFixture);

      await expect(
        whitelist.addToken(await usdc.getAddress(), "USD Coin", "", 6)
      ).to.be.revertedWith("TokenWhitelist: empty symbol");
    });

    it("Should fail when non-owner tries to add token", async function () {
      const { whitelist, usdc, user1 } = await loadFixture(deployWhitelistFixture);

      await expect(
        whitelist.connect(user1).addToken(await usdc.getAddress(), "USD Coin", "USDC", 6)
      ).to.be.revertedWithCustomError(whitelist, "OwnableUnauthorizedAccount");
    });
  });

  describe("Add Tokens Batch", function () {
    it("Should add multiple tokens", async function () {
      const { whitelist, usdc, weth } = await loadFixture(deployWhitelistFixture);

      const tokens = [await usdc.getAddress(), await weth.getAddress()];
      const names = ["USD Coin", "Wrapped Ether"];
      const symbols = ["USDC", "WETH"];
      const decimals = [6, 18];

      await whitelist.addTokensBatch(tokens, names, symbols, decimals);

      expect(await whitelist.isWhitelisted(await usdc.getAddress())).to.be.true;
      expect(await whitelist.isWhitelisted(await weth.getAddress())).to.be.true;
      expect(await whitelist.getTokenCount()).to.equal(2);
    });

    it("Should skip duplicate tokens in batch", async function () {
      const { whitelist, usdc, weth } = await loadFixture(deployWhitelistFixture);

      await whitelist.addToken(await usdc.getAddress(), "USD Coin", "USDC", 6);

      const tokens = [await usdc.getAddress(), await weth.getAddress()];
      const names = ["USD Coin", "Wrapped Ether"];
      const symbols = ["USDC", "WETH"];
      const decimals = [6, 18];

      await whitelist.addTokensBatch(tokens, names, symbols, decimals);

      expect(await whitelist.getTokenCount()).to.equal(2);
    });

    it("Should fail with array length mismatch", async function () {
      const { whitelist, usdc } = await loadFixture(deployWhitelistFixture);

      const tokens = [await usdc.getAddress()];
      const names = ["USD Coin"];
      const symbols = ["USDC"];
      const decimals = [6, 18];

      await expect(
        whitelist.addTokensBatch(tokens, names, symbols, decimals)
      ).to.be.revertedWith("TokenWhitelist: array length mismatch");
    });
  });

  describe("Remove Token", function () {
    it("Should remove token successfully", async function () {
      const { whitelist, usdc } = await loadFixture(deployWhitelistFixture);

      await whitelist.addToken(await usdc.getAddress(), "USD Coin", "USDC", 6);
      expect(await whitelist.isWhitelisted(await usdc.getAddress())).to.be.true;

      await expect(whitelist.removeToken(await usdc.getAddress()))
        .to.emit(whitelist, "TokenRemoved")
        .withArgs(await usdc.getAddress());

      expect(await whitelist.isWhitelisted(await usdc.getAddress())).to.be.false;
    });

    it("Should decrement token count", async function () {
      const { whitelist, usdc, weth } = await loadFixture(deployWhitelistFixture);

      await whitelist.addToken(await usdc.getAddress(), "USD Coin", "USDC", 6);
      await whitelist.addToken(await weth.getAddress(), "Wrapped Ether", "WETH", 18);
      expect(await whitelist.getTokenCount()).to.equal(2);

      await whitelist.removeToken(await usdc.getAddress());
      expect(await whitelist.getTokenCount()).to.equal(1);
    });

    it("Should fail to remove non-whitelisted token", async function () {
      const { whitelist, usdc } = await loadFixture(deployWhitelistFixture);

      await expect(
        whitelist.removeToken(await usdc.getAddress())
      ).to.be.revertedWith("TokenWhitelist: not whitelisted");
    });

    it("Should fail when non-owner tries to remove token", async function () {
      const { whitelist, usdc, user1 } = await loadFixture(deployWhitelistFixture);

      await whitelist.addToken(await usdc.getAddress(), "USD Coin", "USDC", 6);

      await expect(
        whitelist.connect(user1).removeToken(await usdc.getAddress())
      ).to.be.revertedWithCustomError(whitelist, "OwnableUnauthorizedAccount");
    });
  });

  describe("Update Token Info", function () {
    it("Should update token info successfully", async function () {
      const { whitelist, usdc } = await loadFixture(deployWhitelistFixture);

      await whitelist.addToken(await usdc.getAddress(), "USD Coin", "USDC", 6);

      await expect(
        whitelist.updateTokenInfo(await usdc.getAddress(), "USD Coin v2", "USDC2")
      )
        .to.emit(whitelist, "TokenUpdated")
        .withArgs(await usdc.getAddress(), "USD Coin v2", "USDC2");

      const tokenInfo = await whitelist.getTokenInfo(await usdc.getAddress());
      expect(tokenInfo.name).to.equal("USD Coin v2");
      expect(tokenInfo.symbol).to.equal("USDC2");
    });

    it("Should fail to update non-whitelisted token", async function () {
      const { whitelist, usdc } = await loadFixture(deployWhitelistFixture);

      await expect(
        whitelist.updateTokenInfo(await usdc.getAddress(), "USD Coin", "USDC")
      ).to.be.revertedWith("TokenWhitelist: not whitelisted");
    });

    it("Should fail with empty name", async function () {
      const { whitelist, usdc } = await loadFixture(deployWhitelistFixture);

      await whitelist.addToken(await usdc.getAddress(), "USD Coin", "USDC", 6);

      await expect(
        whitelist.updateTokenInfo(await usdc.getAddress(), "", "USDC")
      ).to.be.revertedWith("TokenWhitelist: empty name");
    });
  });

  describe("Query Functions", function () {
    it("Should return all tokens", async function () {
      const { whitelist, usdc, weth } = await loadFixture(deployWhitelistFixture);

      await whitelist.addToken(await usdc.getAddress(), "USD Coin", "USDC", 6);
      await whitelist.addToken(await weth.getAddress(), "Wrapped Ether", "WETH", 18);

      const allTokens = await whitelist.getAllTokens();
      expect(allTokens.length).to.equal(2);
      expect(allTokens[0]).to.equal(await usdc.getAddress());
      expect(allTokens[1]).to.equal(await weth.getAddress());
    });

    it("Should return false for non-whitelisted token", async function () {
      const { whitelist, usdc } = await loadFixture(deployWhitelistFixture);

      expect(await whitelist.isWhitelisted(await usdc.getAddress())).to.be.false;
    });
  });
});
