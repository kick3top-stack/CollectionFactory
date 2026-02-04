import { ethers } from "ethers";
import { MARKETPLACE_ADDRESS } from "./addresses";
import marketplaceAbi from "../../abi/marketplaceAbi.json";

export function getMarketplaceContract(signerOrProvider) {
  return new ethers.Contract(
    MARKETPLACE_ADDRESS,
    marketplaceAbi.abi,
    signerOrProvider
  );
}
