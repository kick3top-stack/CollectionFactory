import { ethers } from "ethers";
import nftAbi from "../../abi/nftAbi.json";

/**
 * Get an NFTCollection contract instance at the given address.
 * Each collection has its own contract address (from CollectionCreated event).
 * @param {ethers.Signer | ethers.Provider} signerOrProvider
 * @param {string} collectionAddress - The NFTCollection contract address
 * @returns {ethers.Contract}
 */
export function getNFTContract(signerOrProvider, collectionAddress) {
  if (!collectionAddress) {
    throw new Error("collectionAddress is required for getNFTContract");
  }
  return new ethers.Contract(
    collectionAddress,
    nftAbi.abi,
    signerOrProvider
  );
}
