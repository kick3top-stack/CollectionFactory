const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const base = path.join(root, "smartcontract/artifacts/contracts");
const out = path.join(__dirname, "src/abi");

const files = [
  ["Marketplace.sol/Marketplace.json", "marketplaceAbi.json"],
  ["CollectionFactory.sol/CollectionFactory.json", "collectionFactoryAbi.json"],
  ["NFTCollection.sol/NFTCollection.json", "nftAbi.json"],
];

for (const [src, dest] of files) {
  const art = JSON.parse(fs.readFileSync(path.join(base, src), "utf8"));
  const outObj = {
    contractName: art.contractName,
    sourceName: art.sourceName || "",
    abi: art.abi,
  };
  fs.writeFileSync(path.join(out, dest), JSON.stringify(outObj, null, 2));
  console.log("OK", dest);
}
