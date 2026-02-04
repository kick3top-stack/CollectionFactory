const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const CollectionFactoryModule = buildModule("CollectionFactoryModule", (m) => {
  const CollectionFactory = m.contract("CollectionFactory");

  return { CollectionFactory };
});

module.exports = CollectionFactoryModule;