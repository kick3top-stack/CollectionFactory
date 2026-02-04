// Upload image/file to IPFS
import axios from "axios";

const PINATA_API_KEY = import.meta.env.VITE_APP_PINATA_KEY;
const PINATA_SECRET_API_KEY = import.meta.env.VITE_APP_PINATA_SECRET;

export async function uploadToIPFS(file) {
  if (!file) return;

  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        maxBodyLength: Infinity,
        timeout: 120000, // ⬅️ 2 minutes
        headers: {
          "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_API_KEY,
        },
      }
    );

    return `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`;
  } catch (error) {
    console.error("IPFS image upload error:", error);
    return undefined;
  }
}

export async function uploadJSONToIPFS(json) {
  if (!json) return;

  try {
    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      json,
      {
        headers: {
          "Content-Type": "application/json",
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_API_KEY,
        },
      }
    );

    return `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`;
  } catch (error) {
    console.error("IPFS JSON upload error:", error);
    return undefined;
  }
}
