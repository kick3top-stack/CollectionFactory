import { ethers } from "ethers";
import { COLLECTION_FACTORY_ADDRESS } from "./addresses";
import collectionFactoryAbi from "../../abi/collectionFactoryAbi.json";

/**
 * Get the CollectionFactory contract instance.
 * @param {ethers.Signer | ethers.Provider} signerOrProvider
 * @returns {ethers.Contract}
 */
export function getCollectionFactoryContract(signerOrProvider) {
  return new ethers.Contract(
    COLLECTION_FACTORY_ADDRESS,
    collectionFactoryAbi.abi,
    signerOrProvider
  );
}
