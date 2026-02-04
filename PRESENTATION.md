## CollectionFactory · NFT Marketplace — Presentation Outline

### 1. Project Overview

- **Name**: CollectionFactory · NFT Marketplace  
- **What it is**: A full-stack Web3 marketplace where users can:
  - Deploy **ERC‑721 NFT collections** via a factory,
  - Mint NFTs with IPFS-hosted metadata,
  - Trade via **fixed-price listings** and **on-chain auctions**,
  - Track activity and earnings in a modern, responsive UI.
- **Tech stack**: Solidity 0.8.20+, OpenZeppelin v5, Hardhat, React, TypeScript, Vite.

---

### 2. Architecture

**Smart contracts**

1. `CollectionFactory.sol`  
   - Deploys new `NFTCollection` contracts.  
   - Stores `creationFee` and `protocolMintFee`.  
   - Owner can update fees and withdraw ETH.

2. `NFTCollection.sol`  
   - ERC‑721 with URI storage (`ERC721URIStorage`).  
   - Default 5% royalties via `ERC2981`.  
   - Enforces mint fee using the factory’s `protocolMintFee()`.

3. `Marketplace.sol`  
   - Handles fixed-price listings and timed auctions.  
   - Escrows NFTs but keeps the **seller** as logical owner in the UI.  
   - Uses EIP‑2981 royalty info from `NFTCollection`.

**Frontend**

- React + TypeScript + Vite.  
- Talks to contracts via ABIs in `frontend/src/abi/`.  
- Dark, responsive UI with design-system classes (`app-shell`, `app-container`, etc.).

---

### 3. User Journey / Features

**Home**
- Hero section explaining the value proposition.  
- Featured collections, top NFTs, trending auctions.  
- Smooth skeleton loading while data fetches from chain.

**Create**
- **Create Collection** tab:
  - Enter name and optional cover image.
  - Calls `CollectionFactory.createCollection` and stores collection metadata on IPFS.
- **Mint NFT** tab:
  - Choose existing collection.
  - Upload image and metadata (name, description).
  - Calls `NFTCollection.mint` with protocol mint fee.

**Collections**
- Collections index:
  - Desktop table + mobile cards.
  - Each row/card shows image, name, description, floor, items.
- Collection detail:
  - Banner image, floor price, items, creator.  
  - Contract address with “View on Etherscan” link.  
  - Filters (all / listed / auction) and sorting (price, date, rarity).

**Marketplace / Auctions**
- Fixed-price listings:
  - List / buy NFTs via `Marketplace.listings` and `buy`.  
  - UI validates balance and listing state.
- Auctions:
  - Create auction (min price + end time).  
  - Place bids with live validations (min bid, auction status).  
  - Finalize auctions once ended.

**Profile (My NFTs)**
- Shows NFTs owned or escrowed on behalf of the user:
  - Listed, auction, and unlisted sections.
- Admin-style balances:
  - Pending withdrawals, platform fees, factory fees.  
  - Withdraw flows with confirmations.
- On-chain transaction history:
  - Sale, purchase, mint, bid events.  
  - Paginated table + mobile cards with color-coded amounts.

**Footer**
- Identity: **Victor Valdes · © {year} All rights reserved · kick.3top@gmail.com**.  
- GitHub link: `https://github.com/kick3top-stack`.

---

### 4. Technical Highlights

- **EIP‑2981 Royalties**: Native royalty support across secondary sales.  
- **Pull-based withdrawals**: Safer funds handling, less reentrancy risk.  
- **Factory pattern**: Scales to many independent NFT collections.  
- **UI/UX**:
  - Fixed navbar and consistent max-width containers,
  - Skeleton loaders for key views,
  - Clear error messages and toasts for transactions.

---

### 5. How to Run / Deploy (Short)

**Contracts**

```bash
cd smartcontract
npm install
npx hardhat compile
npx hardhat test
# deploy to desired network (e.g. Sepolia)
npx hardhat run scripts/deploy.ts --network sepolia
```

After deploy:

```bash
cd ..
node frontend/copy-abis.js
```

**Frontend**

```bash
cd frontend
npm install
npm run dev   # local
npm run build # production
```

Deploy `frontend/dist/` to Vercel, Netlify, or any static host.  
Ensure env vars (Pinata, RPC) and contract addresses match the target network.

