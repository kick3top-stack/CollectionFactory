# 🎨 CollectionFactory & Marketplace Ecosystem

An institutional-grade NFT infrastructure suite built on **Solidity 0.8.20+** and **OpenZeppelin v5.0**. This repository provides a complete pipeline for deploying controlled NFT collections, standardizing royalties, and facilitating secure marketplace transactions via Fixed Price sales and Timed Auctions.

## 🚀 Key Features

-   **Factory Pattern**: Deploy customizable NFT collections with a single transaction.
-   **Multi-Tier Revenue**: Sustains the platform through creation fees, protocol mint fees, and marketplace platform fees.
-   **Standardized Royalties**: Full implementation of **EIP-2981** ensuring creators get paid across secondary sales.
-   **Secure Marketplace**: Features both instant-buy listings and bidding-based auctions.
-   **Anti-DOS Pull Pattern**: Industry-best practice "Pull-over-Push" payment logic to prevent fund-locking and reentrancy attacks.

---

## 🏗 Architecture Overview

The system consists of three core smart contracts interaction in a trustless loop:

1.  **`CollectionFactory.sol`**: The entry point. Manages collection deployment permissions and global protocol fees.
2.  **`NFTCollection.sol`**: An ERC721 collection featuring per-token URI storage. Each collection is owned by the creator but contributes a protocol fee to the Factory owner on every mint.
3.  **`Marketplace.sol`**: A global escrow and trading hub. It automatically reads royalty data from the NFT contracts via EIP-2981.

---

## 💰 Financial Model

| Action | Fee | Recipient |
| :--- | :--- | :--- |
| **Collection Creation** | 0.05 ETH | Factory Contract |
| **Token Minting** | 0.01 ETH | Project Builder (Owner) |
| **Marketplace Sale** | 2.5% (BPS) | Platform Treasury |
| **Creator Royalty** | 5.0% (Default) | Original Collection Creator |

---

## 🛠 Usage Guide

### 1. Requirements
Ensure you have [Hardhat](https://hardhat.org/) installed:
```bash
npm install --save-dev hardhat @openzeppelin/contracts
