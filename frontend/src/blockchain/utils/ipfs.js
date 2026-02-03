// Upload image/file to IPFS
import axios from "axios";

const PINATA_API_KEY = import.meta.env.VITE_APP_PINATA_KEY;
const PINATA_SECRET_API_KEY = import.meta.env.VITE_APP_PINATA_SECRET;

export async function uploadToIPFS(file) {
  if (!file) return;
  console.log(PINATA_API_KEY, PINATA_SECRET_API_KEY);

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

    const url = `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`;
    console.log("IPFS URL:", url);
    return url;
  } catch (error) {
    console.log("ipfs image upload error:", error);
  }
}

export async function uploadJSONToIPFS(json) {
  if (!json) return;
  console.log(PINATA_API_KEY, PINATA_SECRET_API_KEY);

  try {
    const formData = new FormData();
    formData.append("json", json);

    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      json,
      {
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_API_KEY,
        },
      }
    );

    const url = `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`;
    console.log("IPFS URL:", url);
    return url;
  } catch (error) {
    console.log("ipfs Json upload error:", error);
  }
}
