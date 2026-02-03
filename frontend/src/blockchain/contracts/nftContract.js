import { ethers } from "ethers";
import { NFT_ADDRESS } from "./addresses";
import nftJson from "../../abi/nftAbi.json";
import { getSigner } from "../signer";

export function getNFTContract(signerOrProvider) {
  return new ethers.Contract(
    NFT_ADDRESS,
    nftJson.abi,
    signerOrProvider
  );
}
