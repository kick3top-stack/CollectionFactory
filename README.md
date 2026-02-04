# 🎨 CollectionFactory · NFT Marketplace

A full-stack Web3 marketplace where creators can:

- Deploy **ERC‑721 NFT collections** via a factory,
- Mint NFTs with IPFS-hosted metadata,
- Trade via **fixed-price listings** and **on-chain auctions**,
- Track activity and earnings in a modern, responsive UI.

Built with **Solidity 0.8.20+**, **OpenZeppelin v5**, **React + TypeScript**, and **Vite**.

---

## 🚀 Features

- **Collection Factory**
  - One transaction to deploy a new `NFTCollection` contract.
  - Stores global protocol fees for creation and minting.

- **NFT Collections**
  - ERC‑721 with per-token URIs (`ERC721URIStorage`).
  - Default 5% royalties using `ERC2981`.
  - Collection-level metadata (name, image, description) stored on IPFS and surfaced in the UI.

- **Marketplace**
  - Fixed-price listings (instant buy).
  - Timed auctions with bid management and finalization.
  - Pull-based withdrawals to reduce reentrancy risk.

- **Royalties & Fees**
  - EIP‑2981 compliant royalties for creators.
  - Creation and mint fees configurable in `CollectionFactory`.
  - Platform fee on marketplace sales for the treasury.

- **Frontend**
  - Dark, responsive design with a fixed navbar and elegant footer.
  - Skeleton loading states and clear error handling.
  - Profile dashboard with:
    - My NFTs (owned + escrowed listings/auctions),
    - Admin-style balances (withdrawable, platform fees, factory fees),
    - On-chain transaction history (with pagination).

---

## 🧱 Smart contracts

Located in `smartcontract/contracts`:

1. **`CollectionFactory.sol`**
   - Deploys and tracks `NFTCollection` contracts.
   - Holds `creationFee` and `protocolMintFee`.
   - Owner can adjust fees and withdraw accumulated ETH.

2. **`NFTCollection.sol`**
   - ERC‑721 token contract with URI storage.
   - Uses `IFactory(protocolMintFee)` to enforce mint fee.
   - Sets default royalty to the collection creator.

3. **`Marketplace.sol`**
   - Global listing/auction contract.
   - Handles:
     - Fixed-price listings,
     - Auctions (with end time and bid state),
     - Finalization and withdrawals.
   - Uses EIP‑2981 royalty info from `NFTCollection`.

### 💰 Default fee model

| Action                  | Fee      | Recipient                         |
| ----------------------- | -------- | --------------------------------- |
| Collection creation     | 0.05 ETH | Factory contract (owner withdraws)|
| Token minting           | 0.01 ETH | Factory owner                     |
| Marketplace sale        | 2.5%     | Marketplace treasury              |
| Creator royalty (resale)| 5.0%     | Collection creator                |

> Tune these values before deploying to mainnet.

---

## 🖥 Frontend

Located in `frontend/`:

- **Home:** Hero, featured collections, top NFTs, trending auctions.
- **Collections:** Desktop table + mobile cards, per-collection detail pages.
- **Create:** Tabs for “Create Collection” and “Mint NFT”.
- **Auctions:** Featured auctions and full list with sort options.
- **Profile:** My NFTs (including escrowed ones), withdraw panels, on-chain history.
- **Footer:** Minimal identity (Victor Valdes), copyright, email, and GitHub link.

The frontend talks to the deployed contracts via ABIs in `frontend/src/abi/`.

---

## 🛠 Development

### Smart contracts

From `smartcontract/`:

```bash
npm install
npx hardhat compile
npx hardhat test
```

To deploy (example: Sepolia; adjust in `hardhat.config.js`):

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

After deployment, run the ABI copy script from the repo root:

```bash
node frontend/copy-abis.js
```

This ensures the frontend ABIs match the deployed bytecode.

### Frontend

From `frontend/`:

```bash
npm install
npm run dev
```

Create a `.env` file in `frontend/`:

```bash
VITE_APP_PINATA_KEY=your_pinata_key
VITE_APP_PINATA_SECRET=your_pinata_secret
```

Then open the dev server (usually `http://localhost:5173`).

---

## 📦 Production build & deploy

From `frontend/`:

```bash
npm run build
```

Deploy the contents of `frontend/dist/` to your preferred static host:

- Vercel
- Netlify
- S3 + CloudFront
- Any static file hosting

Make sure:

- Contract addresses used in the frontend match the current network.
- Environment variables are configured in your deployment environment.

---

## 👤 Author

Created by **Victor Valdes**  
GitHub: [`@kick3top-stack`](https://github.com/kick3top-stack)  
Email: `kick.3top@gmail.com`

