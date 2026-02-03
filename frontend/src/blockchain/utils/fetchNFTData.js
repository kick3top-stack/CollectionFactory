import { getNFTContract } from "../contracts/nftContract";
import { ethers } from "ethers";

/**
 * Fetch NFTs owned by connected wallet
 * Optionally filter by collection name
 */
export async function fetchAllNFTData(selectedCollection = null) {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const userAddress = await signer.getAddress();
  const nftContract = getNFTContract(signer);

  // tokenCounter is PUBLIC
  const totalMinted = Number(await nftContract.tokenCounter());

  const allNFTs = [];

  for (let tokenId = 0; tokenId < totalMinted; tokenId++) {
    try {
      const tokenURI = await nftContract.tokenURI(tokenId);

      // 3. Fetch metadata JSON
      const metadataURL = fixIPFS(tokenURI);
      const response = await fetch(metadataURL);
      if (!response.ok) continue;

      const metadata = await response.json();

      // 4. Collection name (ON-CHAIN)
      const collectionName = await nftContract.collections(tokenId);

      allNFTs.push({
        id: tokenId,
        tokenURI: metadataURL,
        name: metadata.name || `NFT #${tokenId}`,
        description: metadata.description || "",
        image: metadata.image,
        collectionName,
        metadata,
      });
    } catch (err) {
      // tokenId may not exist or reverted
      console.warn(`Skipping tokenId ${tokenId}`, err);
    }
  }

  return allNFTs;
}

/**
 * Convert ipfs:// → https://ipfs.io/ipfs/
 */
function fixIPFS(url) {
  if (!url) return "";
  return url.startsWith("ipfs://")
    ? url.replace("ipfs://", "https://ipfs.io/ipfs/")
    : url;
}
