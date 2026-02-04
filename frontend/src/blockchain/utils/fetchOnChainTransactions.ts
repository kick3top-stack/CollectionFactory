import { ethers } from 'ethers';
import { getMarketplaceContract } from '../contracts/marketplaceContract';
import { getCollectionFactoryContract } from '../contracts/factoryContract';
import nftAbi from '@/abi/nftAbi.json';

export type OnChainTxType = 'sale' | 'purchase' | 'mint' | 'bid';

export type OnChainTransaction = {
  id: string;
  type: OnChainTxType;
  nft: string;
  nftCollectionAddress?: string;
  tokenId?: string;
  price: number;
  date: Date;
  blockNumber: number;
  from: string;
  to: string;
};

const zeroAddress = ethers.ZeroAddress;

/**
 * Fetch transaction history for a wallet from chain (Marketplace Sale/Bid + NFT mints).
 * Only returns events where the wallet is seller, buyer, bidder, or minter.
 */
export async function fetchOnChainTransactions(
  provider: ethers.Provider,
  walletAddress: string
): Promise<OnChainTransaction[]> {
  const wallet = walletAddress.toLowerCase();
  const marketplace = getMarketplaceContract(provider);
  const factory = getCollectionFactoryContract(provider);
  const txs: OnChainTransaction[] = [];

  try {
    // 1. Collections from factory
    const createdEvents = await factory.queryFilter(factory.filters.CollectionCreated());
    const collections = createdEvents.map(
      (e) => (e.args?.collection ?? e.args?.[0]) as string
    ).filter(Boolean);

    // 2. Purchases: Sale(buyer = wallet)
    const purchaseEvents = await marketplace.queryFilter(
      marketplace.filters.Sale(null, walletAddress, null)
    );
    for (const e of purchaseEvents) {
      const listingId = e.args?.listingId ?? e.args?.[0];
      const amount = e.args?.amount ?? e.args?.[2];
      const block = await e.getBlock();
      let nftLabel = `#${listingId}`;
      let nftCollectionAddress: string | undefined;
      let tokenIdStr: string | undefined;
      let seller = '';
      try {
        const listing = await marketplace.listings(listingId);
        tokenIdStr = listing?.tokenId?.toString?.() ?? '';
        seller = (listing?.seller ?? '') as string;
        if (listing?.nft && tokenIdStr) {
          nftLabel = `Token #${tokenIdStr}`;
          nftCollectionAddress = listing.nft;
        }
      } catch {
        // keep defaults
      }
      const buyer = walletAddress;
      txs.push({
        id: `purchase-${e.transactionHash}-${e.logIndex}`,
        type: 'purchase',
        nft: nftLabel,
        nftCollectionAddress,
        tokenId: tokenIdStr,
        price: Number(ethers.formatEther(amount ?? 0)),
        date: new Date((block?.timestamp ?? 0) * 1000),
        blockNumber: e.blockNumber,
        from: seller,
        to: buyer,
      });
    }

    // 3. Sales: Sale events where listing.seller === wallet
    const allSales = await marketplace.queryFilter(marketplace.filters.Sale());
    for (const e of allSales) {
      const listingId = e.args?.listingId ?? e.args?.[0];
      const amount = e.args?.amount ?? e.args?.[2];
      try {
        const listing = await marketplace.listings(listingId);
        const sellerAddr = (listing?.seller ?? '') as string;
        if (sellerAddr.toLowerCase() !== wallet) continue;
        const buyerAddr = (e.args?.buyer ?? e.args?.[1]) as string ?? '';
        const block = await e.getBlock();
        const tokenIdStr = listing?.tokenId?.toString?.() ?? '';
        txs.push({
          id: `sale-${e.transactionHash}-${e.logIndex}`,
          type: 'sale',
          nft: tokenIdStr ? `Token #${tokenIdStr}` : `#${listingId}`,
          nftCollectionAddress: listing.nft,
          tokenId: tokenIdStr,
          price: Number(ethers.formatEther(amount ?? 0)),
          date: new Date((block?.timestamp ?? 0) * 1000),
          blockNumber: e.blockNumber,
          from: sellerAddr,
          to: buyerAddr,
        });
      } catch {
        // skip
      }
    }

    // 4. Bids: Bid(bidder = wallet)
    const bidEvents = await marketplace.queryFilter(
      marketplace.filters.Bid(null, walletAddress, null)
    );
    for (const e of bidEvents) {
      const listingId = e.args?.listingId ?? e.args?.[0];
      const amount = e.args?.amount ?? e.args?.[2];
      const block = await e.getBlock();
      let nftLabel = `#${listingId}`;
      let sellerAddr = '';
      try {
        const listing = await marketplace.listings(listingId);
        const tokenIdStr = listing?.tokenId?.toString?.() ?? '';
        sellerAddr = (listing?.seller ?? '') as string;
        if (listing?.nft && tokenIdStr) nftLabel = `Token #${tokenIdStr}`;
      } catch {
        // keep default
      }
      const bidderAddr = (e.args?.bidder ?? e.args?.[1]) as string ?? walletAddress;
      txs.push({
        id: `bid-${e.transactionHash}-${e.logIndex}`,
        type: 'bid',
        nft: nftLabel,
        price: Number(ethers.formatEther(amount ?? 0)),
        date: new Date((block?.timestamp ?? 0) * 1000),
        blockNumber: e.blockNumber,
        from: bidderAddr,
        to: sellerAddr,
      });
    }

    // 5. Mints: Transfer(0, wallet) per collection
    const abi = (nftAbi as { abi: ethers.InterfaceAbi }).abi;
    for (const colAddress of collections) {
      try {
        const nftContract = new ethers.Contract(colAddress, abi, provider);
        const transferEvents = await nftContract.queryFilter(
          nftContract.filters.Transfer(zeroAddress, walletAddress)
        );
        for (const e of transferEvents) {
          const tokenId = (e.args?.tokenId ?? e.args?.[2])?.toString?.() ?? '';
          const block = await e.getBlock();
          const toAddr = (e.args?.to ?? e.args?.[1]) as string ?? walletAddress;
          let mintFeeWei = 0n;
          try {
            const mintTx = await provider.getTransaction(e.transactionHash);
            if (mintTx?.value != null) mintFeeWei = mintTx.value;
          } catch {
            // keep 0
          }
          txs.push({
            id: `mint-${colAddress}-${tokenId}-${e.blockNumber}-${e.logIndex}`,
            type: 'mint',
            nft: tokenId ? `Token #${tokenId}` : 'NFT',
            nftCollectionAddress: colAddress,
            tokenId,
            price: Number(ethers.formatEther(mintFeeWei)),
            date: new Date((block?.timestamp ?? 0) * 1000),
            blockNumber: e.blockNumber,
            from: zeroAddress,
            to: toAddr,
          });
        }
      } catch {
        // skip collection
      }
    }

    // Sort by block number desc (newest first)
    txs.sort((a, b) => b.blockNumber - a.blockNumber);
    return txs;
  } catch (err) {
    console.error('fetchOnChainTransactions error:', err);
    return [];
  }
}
