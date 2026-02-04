// Chain IDs and labels for wallet / provider
export const SEPOLIA_CHAIN_ID = 11155111;

export const SUPPORTED_NETWORKS = {
  [SEPOLIA_CHAIN_ID]: {
    chainId: SEPOLIA_CHAIN_ID,
    name: "Sepolia",
    // Optional: block explorer
    blockExplorerUrls: ["https://sepolia.etherscan.io"],
  },
};

export function isSupportedChain(chainId) {
  return Object.prototype.hasOwnProperty.call(
    SUPPORTED_NETWORKS,
    String(chainId)
  );
}
