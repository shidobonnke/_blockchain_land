import "@nomicfoundation/hardhat-toolbox";
import { HardhatUserConfig } from "hardhat/config";

const privateKey = process.env.BLOCKCHAIN_SIGNER_PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // Besu's built-in development genesis may use pre-Shanghai rules.
      // Target Paris to avoid newer opcodes such as PUSH0 (0x5f).
      evmVersion: "paris"
    }
  },
  networks: {
    localhost: {
      url: process.env.RPC_URL ?? "http://127.0.0.1:8545",
      accounts: privateKey ? [privateKey] : []
    }
  }
};

export default config;
