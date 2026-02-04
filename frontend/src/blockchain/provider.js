import { ethers } from "ethers";

export const getProvider = () => {
  if (!window.ethereum) {
    throw new Error("MetaMask not detected!");
  }
  return new ethers.BrowserProvider(window.ethereum);
};
