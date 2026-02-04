const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const MarketplaceModule = buildModule("MarketplaceModule", (m) => {
  const Marketplace = m.contract("Marketplace");

  return { Marketplace };
});

module.exports = MarketplaceModule;