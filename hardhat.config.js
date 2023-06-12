require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.19"
      }
    ]
  },
  // coverage: {
  //   url: 'http://localhost:8545',
  // },
  gasReporter: {
    enabled: true
  },
};