require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.20",  // Or whatever version you want
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
  // networks: {
  //   sepolia: {
  //     url: `https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID`,
  //     accounts: [`0x${process.env.PRIVATE_KEY}`],
  //   },
  // },
};