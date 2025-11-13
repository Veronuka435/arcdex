require("@nomicfoundation/hardhat-toolbox");
require("dotenv/config");

const ARC_TESTNET_RPC = process.env.ARC_TESTNET_RPC || "https://rpc-testnet.arc.network";
const ARC_MAINNET_RPC = process.env.ARC_MAINNET_RPC || "https://rpc.arc.network";
const PRIVATE_KEY = process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== "your_private_key_here"
  ? process.env.PRIVATE_KEY
  : "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    arcTestnet: {
      url: ARC_TESTNET_RPC,
      chainId: 4655, // Arc testnet chainId (приклад - уточніть актуальний)
      accounts: [PRIVATE_KEY],
      gasPrice: "auto",
      // Arc використовує стабількоін для газу, тому параметри можуть відрізнятися
    },
    arcMainnet: {
      url: ARC_MAINNET_RPC,
      chainId: 4656, // Arc mainnet chainId (приклад - уточніть після запуску mainnet 2026)
      accounts: [PRIVATE_KEY],
      gasPrice: "auto",
    },
  },
  etherscan: {
    apiKey: {
      arcTestnet: process.env.ARC_API_KEY || "your-arc-explorer-api-key",
      arcMainnet: process.env.ARC_API_KEY || "your-arc-explorer-api-key",
    },
    customChains: [
      {
        network: "arcTestnet",
        chainId: 4655,
        urls: {
          apiURL: "https://explorer-testnet.arc.network/api",
          browserURL: "https://explorer-testnet.arc.network",
        },
      },
      {
        network: "arcMainnet",
        chainId: 4656,
        urls: {
          apiURL: "https://explorer.arc.network/api",
          browserURL: "https://explorer.arc.network",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
};
