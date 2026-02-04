const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const NFTCollectionModule = buildModule("NFTCollectionModule", (m) => {
  const NFTCollection = m.contract("NFTCollection");

  return { NFTCollection };
});

module.exports = NFTCollectionModule;