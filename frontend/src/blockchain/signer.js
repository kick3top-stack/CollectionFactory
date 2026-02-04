import { getProvider } from "./provider";
import { ethers } from "ethers";

export const getSigner = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask not detected!");
  }

  // Request wallet access
  await window.ethereum.request({ method: "eth_requestAccounts" });

  // Use ethers v6 BrowserProvider
  const provider = new ethers.BrowserProvider(window.ethereum);

  // Get signer
  const signer = await provider.getSigner();
  return signer;
};
