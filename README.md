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

## Local Setup

1. **Clone the repo**
   ```bash
   git clone <repo-url>
   cd CollectionFactory
   ```

2. **Install dependencies** (run in both folders)
   ```bash
   cd smartcontract && npm install && cd ..
   cd frontend && npm install && cd ..
   ```

3. **Start a local Hardhat node** (in a separate terminal)
   ```bash
   cd smartcontract
   npx hardhat node
   ```
   Keep this running (default: `http://127.0.0.1:8545`).

4. **Deploy contracts** to the local node (see [Deployment guide](#deployment-guide) below). For local dev:
   ```bash
   cd smartcontract
   npx hardhat run scripts/deploy.js --network localhost
   ```
   Copy the printed Factory and Marketplace addresses.

5. **Connect the frontend to your deployment**
   - From the repo root, copy ABIs into the frontend:
     ```bash
     node frontend/copy-abis.js
     ```
   - Update `frontend/src/blockchain/contracts/addresses.js` with the addresses from step 4.
   - For local chain, add chain ID `31337` to `frontend/src/abi/networks.js` (see [Supported networks](#supported-networks)).

6. **Run the frontend**
   ```bash
   cd frontend
   npm run dev
   ```
   Open the dev server (usually `http://localhost:5173`). In your wallet, switch to the local Hardhat network (e.g. add `http://127.0.0.1:8545` with chain ID `31337`).

Optional: create `frontend/.env` with Pinata keys for IPFS uploads:
```bash
VITE_APP_PINATA_KEY=your_pinata_key
VITE_APP_PINATA_SECRET=your_pinata_secret
```

---

## Supported networks

The app can run against:

| Environment | Network        | Chain ID | Use case |
| ----------- | --------------- | -------- | -------- |
| **Local**   | Hardhat node    | 31337    | Development; run `npx hardhat node` then deploy with `--network localhost`. |
| **Testnet** | Sepolia         | 11155111 | Staging; configure `INFURA_API_KEY` and `SEPOLIA_PRIVATE_KEY` in Hardhat (see below). |
| **Mainnet** | Ethereum mainnet| 1        | Production; add mainnet in `hardhat.config.js` and in `frontend/src/abi/networks.js`; tune fees before deploying. |

- **Frontend:** Supported chain IDs and labels are in `frontend/src/abi/networks.js`. Contract addresses are in `frontend/src/blockchain/contracts/addresses.js`. For a new network, add an entry to both (and deploy contracts to that network first).
- **Wallet:** Users must connect to one of the supported chains; the UI will prompt to switch if they’re on a different network.

---

## Connecting the frontend to contracts

1. **ABIs** – After compiling or changing contracts, sync ABIs to the frontend:
   ```bash
   node frontend/copy-abis.js
   ```
   This copies from `smartcontract/artifacts/contracts/` into `frontend/src/abi/` (`collectionFactoryAbi.json`, `marketplaceAbi.json`, `nftAbi.json`).

2. **Addresses** – Edit `frontend/src/blockchain/contracts/addresses.js` and set:
   - `COLLECTION_FACTORY_ADDRESS` – from Factory deployment.
   - `MARKETPLACE_ADDRESS` – from Marketplace deployment.  
   NFT collection addresses are per collection and come from the app (e.g. `CollectionCreated` events), not from this file.

3. **Networks** – In `frontend/src/abi/networks.js`, ensure the chain ID you’re using (e.g. 31337 for local, 11155111 for Sepolia) is present in `SUPPORTED_NETWORKS` so the wallet and UI recognize it.

---

## Deployment guide

### Local (Hardhat node)

1. Start the node: `cd smartcontract && npx hardhat node`.
2. In another terminal: `npx hardhat run scripts/deploy.js --network localhost`.
3. Copy the logged Factory and Marketplace addresses into `frontend/src/blockchain/contracts/addresses.js`.
4. Run `node frontend/copy-abis.js`, then start the frontend with `npm run dev` from `frontend/`.

### Sepolia (testnet)

1. In `smartcontract/`, configure [Hardhat vars](https://hardhat.org/hardhat-runner/docs/advanced/hardhat-runtime-environment#configuration-variables):
   ```bash
   npx hardhat vars set INFURA_API_KEY <your-infura-key>
   npx hardhat vars set SEPOLIA_PRIVATE_KEY <your-sepolia-account-private-key>
   ```
2. Deploy:
   ```bash
   npx hardhat run scripts/deploy.js --network sepolia
   ```
3. Update `frontend/src/blockchain/contracts/addresses.js` with the new addresses and run `node frontend/copy-abis.js`. Sepolia (chain ID 11155111) is already in `frontend/src/abi/networks.js`.

### Mainnet

1. Add a mainnet entry in `smartcontract/hardhat.config.js` (e.g. `url`, `accounts`) and set any API keys via `vars` or env.
2. **Tune fees** in the contracts (e.g. creation fee, mint fee, marketplace fee) and in the factory/marketplace logic before deploying.
3. Run:
   ```bash
   npx hardhat run scripts/deploy.js --network mainnet
   ```
4. Add chain ID `1` and a label to `frontend/src/abi/networks.js`, and set the deployed addresses in `frontend/src/blockchain/contracts/addresses.js`.

---

## Development (reference)

### Smart contracts

From `smartcontract/`:

```bash
npm install
npx hardhat compile
npx hardhat test
```

### Frontend

From `frontend/`:

```bash
npm install
npm run dev
```

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

