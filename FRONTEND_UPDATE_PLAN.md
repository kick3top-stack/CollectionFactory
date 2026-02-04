# Frontend Update Plan — Align with Deployed Smart Contracts

This document compares your **deployed smart contracts** (CollectionFactory, Marketplace, NFTCollection) with the **current frontend** (copied from another project) and lists the changes needed so the frontend works with your contracts **without changing contract logic**.

---

## 1. Smart Contract Summary (No Changes)

### Deployed addresses (Sepolia, chainId 11155111)

| Contract            | Address |
|---------------------|--------|
| CollectionFactory   | `0x24C81c2c0A9a22a8bE905A412388bb234523e0bd` |
| Marketplace         | `0x382617d07b48EC99b8B3dad21BFdE7EBDa1B8934` |

**NFTCollection** — one contract per collection, created by the factory (address known from `CollectionCreated` event).

### CollectionFactory

- `createCollection(name, symbol, baseURI)` — **payable** (≥ `creationFee`, default 0.05 ETH). Returns collection address. Emits `CollectionCreated(collection, name, creator)`.
- `creationFee`, `protocolMintFee` (default 0.01 ETH), `setFees`, `withdrawAllFees` (owner).

### Marketplace

- **Listing key**: `listingId` (uint256, starts at 1, `nextListingId`).
- **Fixed price**: `listFixedPrice(nft, tokenId, price)`.
- **Auction**: `listAuction(nft, tokenId, minPrice, duration)` — `duration` in **seconds**.
- **Buy**: `buy(listingId)` payable.
- **Bid**: `bid(listingId)` payable.
- **Auction end**: `finalizeAuction(listingId)` (anyone, after `endTime`).
- **Withdraw**: `withdraw()` — users pull their `pendingWithdrawals`.
- **No** `cancelListing`; no listing cancellation in contract.
- **Events**: `ListingCreated(listingId, seller, nft, tokenId, price, saleType)`, `Sale(listingId, buyer, amount)`, `Bid(listingId, bidder, amount)`.
- **Read**: `listings(listingId)`, `auctions(listingId)`, `nextListingId`, `pendingWithdrawals(address)`.

### NFTCollection (per collection)

- `mint(to, uri)` — **payable** (≥ `protocolMintFee`, 0.01 ETH). Returns tokenId. Token IDs start at **1** (`_nextTokenId`).
- `tokenURI(tokenId)`, `ownerOf(tokenId)`, `name()`, `symbol()`.
- **No** `tokenCounter()`, **no** `collections(tokenId)`.

---

## 2. Current Frontend vs Contracts

| Area              | Current frontend (other project)        | Your contracts                         |
|-------------------|------------------------------------------|----------------------------------------|
| **NFT contract**  | Single `NFT_ADDRESS`                     | Many collections (factory-created)    |
| **NFT**           | `tokenCounter()`, `collections(tokenId)`| None; tokenIds from 1, no per-token collection name |
| **Mint**          | `mintNFT(metadataURL, collectionName)`  | `mint(to, uri)` on **collection contract** |
| **Collections**   | Derived from single contract metadata   | From factory `CollectionCreated` + collection address |
| **Marketplace**   | Keyed by `(tokenAddress, tokenId)`      | Keyed by **listingId**                 |
| **List**          | `listItem(nft, tokenId, price)`         | `listFixedPrice(nft, tokenId, price)`  |
| **Buy**           | `buyItem(nft, tokenId)`                  | `buy(listingId)`                       |
| **Auction**       | `createAuction(nft, tokenId, minBid, duration)`, `endAuction(nft, tokenId)` | `listAuction(nft, tokenId, minPrice, duration)`, `finalizeAuction(listingId)` |
| **Bid**           | `bid(nft, tokenId)`                      | `bid(listingId)`                       |
| **Read listing**  | `getListing(nft, tokenId)`              | `listings(listingId)` (need mapping nft+tokenId → listingId) |
| **Read auction**  | `getAuction(nft, tokenId)`               | `auctions(listingId)`                  |
| **Cancel**        | `cancelListing(nft, tokenId)`            | Not supported                          |
| **Withdraw**      | —                                        | `withdraw()` for `pendingWithdrawals`  |

---

## 3. Update Plan (Frontend Only)

### Phase 1 — Config, ABIs, addresses

1. **`frontend/src/blockchain/contracts/addresses.js`**
   - Set `MARKETPLACE_ADDRESS` to `0x382617d07b48EC99b8B3dad21BFdE7EBDa1B8934`.
   - Add `COLLECTION_FACTORY_ADDRESS = "0x24C81c2c0A9a22a8bE905A412388bb234523e0bd"`.
   - Remove or stop using a single `NFT_ADDRESS`; NFT contracts are per-collection (address from factory).

2. **`frontend/src/abi/networks.js`**
   - Define Sepolia (e.g. chainId `11155111`) so wallet and provider use the correct network.

3. **ABIs**
   - **Replace** `frontend/src/abi/marketplaceAbi.json` with the ABI from `smartcontract/artifacts/contracts/Marketplace.sol/Marketplace.json` (listingId-based functions and events).
   - **Add** `frontend/src/abi/collectionFactoryAbi.json` — copy from `smartcontract/artifacts/contracts/CollectionFactory.sol/CollectionFactory.json` (only the `abi` array).
   - **Replace** `frontend/src/abi/nftAbi.json` with the ABI from `smartcontract/artifacts/contracts/NFTCollection.sol/NFTCollection.json` (so it matches `mint(to, uri)`, `tokenURI`, `name`, `symbol`; no `tokenCounter`/`collections`).

4. **Blockchain contracts**
   - **New** `frontend/src/blockchain/contracts/factoryContract.js`: `getCollectionFactoryContract(signerOrProvider)` using `COLLECTION_FACTORY_ADDRESS` and `collectionFactoryAbi`.
   - **Update** `frontend/src/blockchain/contracts/nftContract.js`: `getNFTContract(signerOrProvider, collectionAddress)` — same ABI, but contract instance at **collectionAddress** (each collection is one NFTCollection).
   - **Update** `frontend/src/blockchain/contracts/marketplaceContract.js`: keep `MARKETPLACE_ADDRESS`, switch to new marketplace ABI (already done if you replaced the JSON).

---

### Phase 2 — Data model

5. **Types (`App.tsx` or a shared types file)**
   - **NFT**: add `collectionAddress: string` (the NFTCollection contract). Keep `id` as tokenId (string). Treat `(collectionAddress, id)` as unique key where needed.
   - **Collection**: add `contractAddress: string` (same as NFTCollection address). Keep `id` for routing/UI (can stay normalized name or use `contractAddress` as id).

6. **Listing/auction in UI**
   - When an NFT is listed or in auction, store **listingId** (from marketplace) on the NFT or in a map so modals can call `buy(listingId)`, `bid(listingId)`, `finalizeAuction(listingId)`.

---

### Phase 3 — Fetching NFTs and listings

7. **Strategy**
   - **Collections**: Query `CollectionCreated` from CollectionFactory; each event gives `(collection address, name, creator)`. Build list of collections with `contractAddress` and name.
   - **Tokens**: NFTCollection has no `tokenCounter` or enumerable. Options:
     - **A)** Index `Transfer(from = 0x0, to, tokenId)` per collection contract to get minted tokenIds, then for each `(collectionAddress, tokenId)` call `tokenURI`, `ownerOf`.
     - **B)** For each collection, try `tokenId = 1, 2, 3, ...` until `ownerOf` fails or you hit a chosen max (fragile if there are gaps).
   - **Listings**: Either:
     - Query `ListingCreated` from Marketplace and build `(nft, tokenId) → listingId`, then for each listingId read `listings(listingId)` and `auctions(listingId)`; or
     - Iterate `listingId = 1 .. nextListingId - 1` and for each call `listings(listingId)` / `auctions(listingId)`, then merge with NFT data by `(nft, tokenId)`.

8. **`App.tsx` — `fetchNFTs()`**
   - Use factory + marketplace providers/contracts.
   - Fetch collections from `CollectionCreated` (collection address, name, creator).
   - For each collection address, get minted tokenIds (event-based or scan).
   - For each `(collectionAddress, tokenId)` fetch `tokenURI`, `ownerOf`; fetch metadata from URI.
   - Fetch all active listings/auctions (listingId → nft, tokenId, price, saleType, auction fields).
   - Merge: for each NFT, if `(nftAddress, tokenId)` has a listing, set `status: 'listed' | 'auction'`, `price`, `listingId`, `highestBid`, `auctionEndTime`, etc. from `listings`/`auctions`.
   - Set `collection` for each NFT from the collection name (or id) of the collection that matches `collectionAddress`.
   - Populate `nfts` and `collections` (with `contractAddress`) in state.

9. **`blockchain/utils/fetchNFTData.js`**
   - Refactor for **multi-collection**: accept `collectionAddress` (and optionally listing data). Use NFTCollection ABI at that address; no `tokenCounter()` or `collections(tokenId)`. If still used for “my NFTs”, either pass list of (collectionAddress, tokenId) from events or a similar source.

---

### Phase 4 — Mint flow

10. **MintPage**
    - **New collection**: Call `factory.createCollection(name, symbol, baseURI)` with `value: creationFee` (read `creationFee` from factory). Parse `CollectionCreated` to get collection address; add to app state with `contractAddress` and name.
    - **Existing collection**: User selects a collection (by id / `contractAddress`). Call `getNFTContract(signer, collection.contractAddress).mint(userAddress, metadataURI)` with `value: protocolMintFee` (read `protocolMintFee` from factory).
    - Use `mint(to, uri)` only; remove `mintNFT(metadataURL, collectionName)` and `tokenCounter()` usage. Display `creationFee` and `protocolMintFee` from contract in the UI.

---

### Phase 5 — Marketplace (list / buy / auction / bid / finalize)

11. **NFTModal (and any other place that lists/buys/bids)**
    - **List fixed price**: `marketplace.listFixedPrice(nft.collectionAddress, nft.id, priceInWei)`. Ensure marketplace is approved for that collection: `nftContract(collectionAddress).approve(marketplaceAddress, tokenId)` before listing.
    - **List auction**: `marketplace.listAuction(nft.collectionAddress, nft.id, minPriceInWei, durationInSeconds)`. UI: user enters min price and duration (e.g. days/hours converted to seconds); no “end date” in contract.
    - **Buy**: `marketplace.buy(listingId, { value: priceInWei })` — use `listingId` from NFT/listing data, not (nft, tokenId).
    - **Bid**: `marketplace.bid(listingId, { value: bidInWei })`.
    - **End auction**: `marketplace.finalizeAuction(listingId)` (replace any `endAuction(nft, tokenId)`).
    - Remove **cancel listing** (not in contract) or hide/disable in UI.
    - **Withdraw**: Add a “Withdraw” action that calls `marketplace.withdraw()` and optionally show `pendingWithdrawals(user)`.

12. **App.tsx** (or wherever listing/auction state is resolved)
    - When building NFT list, attach `listingId` to each listed/auction NFT so modals can pass it to `buy` / `bid` / `finalizeAuction`.

---

### Phase 6 — UI and hooks

13. **CollectionSelectModal / Collections**
    - Collections must include `contractAddress`. When user selects “existing collection” for mint or for listing, use `collection.contractAddress` as the NFT contract address.

14. **ProfilePage / Withdraw**
    - If you have a “Withdraw” or “Earnings” section, call `marketplace.pendingWithdrawals(user)` and `marketplace.withdraw()`. Reuse or add `WithdrawConfirmationModal` for withdraw.

15. **NFTCard / NFTModal**
    - Pass `nft` with `collectionAddress` and `listingId` (when applicable). All contract calls that take “nft” use `nft.collectionAddress`; all marketplace calls that take listing use `nft.listingId` (or equivalent from your state).

16. **Hooks**
    - `useMarketplace.js` / `useNFT.js`: implement against new ABIs and addresses (marketplace by listingId; NFT by collection address). Optional but keeps logic in one place.
    - `useAuction.js`: align with `finalizeAuction(listingId)` and auction data from `auctions(listingId)`.

---

### Phase 7 — Cleanup and checks

17. Remove or refactor any code that:
    - Uses a single global `NFT_ADDRESS` for all NFTs.
    - Calls `tokenCounter()`, `collections(tokenId)`, `mintNFT(...)`, `listItem`, `buyItem`, `createAuction`, `endAuction`, `getListing`, `getAuction`, `cancelListing` with the old signatures.

18. **Network**
    - Ensure wallet and provider target Sepolia (11155111) and that `networks.js` (or your config) matches.

19. **Error handling**
    - Keep `getErrorMessage` / `isUserRejection`; contract revert messages will differ (e.g. “Insufficient fee”, “Invalid listing”), but no code change needed beyond using correct function names and parameters.

---

## 4. Order of implementation (suggested)

1. Phase 1 — addresses, networks, ABIs, factory/nft/marketplace contract modules.  
2. Phase 2 — NFT and Collection types + `listingId` in state.  
3. Phase 3 — `fetchNFTs()` and listing/auction indexing; then `fetchNFTData.js`.  
4. Phase 4 — Mint (factory + mint per collection).  
5. Phase 5 — List / buy / bid / finalize / withdraw in NFTModal and related UI.  
6. Phase 6 — CollectionSelectModal, Profile/Withdraw, NFTCard/NFTModal wiring.  
7. Phase 7 — Remove old API usage, verify network and errors.

---

## 5. Quick reference — contract calls

| Action              | Contract / function |
|---------------------|---------------------|
| Create collection   | Factory: `createCollection(name, symbol, baseURI)` payable (creationFee) |
| Mint                | NFTCollection(collectionAddress): `mint(to, uri)` payable (protocolMintFee) |
| List fixed          | Marketplace: `listFixedPrice(nft, tokenId, price)` (after approve) |
| List auction        | Marketplace: `listAuction(nft, tokenId, minPrice, durationSeconds)` |
| Buy                 | Marketplace: `buy(listingId)` payable |
| Bid                 | Marketplace: `bid(listingId)` payable |
| Finalize auction    | Marketplace: `finalizeAuction(listingId)` |
| Withdraw            | Marketplace: `withdraw()` |

All “nft” arguments are the **NFTCollection contract address** for that collection.

---

This plan keeps your smart contract logic unchanged and only updates the frontend to match your deployed CollectionFactory, Marketplace, and NFTCollection contracts.
