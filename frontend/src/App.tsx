import { useState, useEffect } from 'react';
import { Home } from './components/Home';
import { CreatePage } from './components/CreatePage';
import { CollectionsPage } from './components/CollectionsPage';
import { CollectionDetailPage } from './components/CollectionDetailPage';
import { AuctionsPage } from './components/AuctionsPage';
import { ProfilePage } from './components/ProfilePage';
import { Navigation } from './components/Navigation';
import { AlertModal } from './components/AlertModal';
import { ethers } from 'ethers';
import { getCollectionFactoryContract } from './blockchain/contracts/factoryContract';
import { getNFTContract } from './blockchain/contracts/nftContract';
import { getMarketplaceContract } from './blockchain/contracts/marketplaceContract';
import { getErrorMessage, isUserRejection } from './blockchain/utils/errorMessages';
import nftAbi from '@/abi/nftAbi.json';

/** Resolve ipfs:// to a gateway URL */
function resolveTokenUri(uri: string): string {
  if (!uri) return '';
  if (uri.startsWith('ipfs://')) {
    return uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }
  return uri;
}

export type NFT = {
  /** Unique key: `${collectionAddress}-${tokenId}` */
  id: string;
  /** Token ID on the collection contract */
  tokenId: string;
  /** NFTCollection contract address */
  collectionAddress: string;
  /** Collection id (contract address) for filtering */
  collection: string;
  name: string;
  description: string;
  image: string;
  price?: number;
  creator: string;
  owner: string;
  status: 'listed' | 'unlisted' | 'auction';
  /** When listed or in auction, the marketplace listingId */
  listingId?: number;
  highestBid?: number;
  auctionEndTime?: Date;
  minBid?: number;
  rarity?: string;
  createdAt: Date;
};

export type Collection = {
  /** Contract address (used as id for routing) */
  id: string;
  contractAddress: string;
  name: string;
  description: string;
  image: string;
  creator: string;
  floorPrice: number;
  nftCount: number;
};

export type Transaction = {
  id: string;
  type: 'sale' | 'purchase' | 'mint' | 'bid';
  nft: string;
  price: number;
  date: Date;
};

export type AppContextType = {
  wallet: string | null;
  connectWallet: () => void;
  disconnectWallet: () => void;
  nfts: NFT[];
  collections: Collection[];
  transactions: Transaction[];
  loading: boolean;
  addNFT: (nft: NFT) => void;
  updateNFT: (id: string, updates: Partial<NFT>) => void;
  addCollection: (collection: Collection) => void;
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  showAlert: (message: string, type: 'success' | 'error') => void;
};

function App() {
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const [showAlertModal, setShowAlertModal] = useState(false);

  // Mock data
  const [nfts, setNfts] = useState<NFT[]>([
  ]);

  const [collections, setCollections] = useState<Collection[]>([
    
  ]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const TX_STORAGE_KEY = 'nft_tx_';

  // On refresh or new load, always start disconnected (no auto-reconnect)
  useEffect(() => {
    setWallet(null);
  }, []);

  // Load transactions from localStorage when wallet connects
  useEffect(() => {
    if (!wallet) {
      setTransactions([]);
      return;
    }
    try {
      const raw = localStorage.getItem(TX_STORAGE_KEY + wallet.toLowerCase());
      if (raw) {
        const parsed = JSON.parse(raw) as (Transaction & { date: string })[];
        setTransactions(
          Array.isArray(parsed)
            ? parsed.map((t) => ({ ...t, date: new Date(t.date) }))
            : []
        );
      }
    } catch {
      setTransactions([]);
    }
  }, [wallet]);

  // Persist transactions to localStorage when they or wallet change
  useEffect(() => {
    if (wallet && transactions.length > 0) {
      try {
        localStorage.setItem(TX_STORAGE_KEY + wallet.toLowerCase(), JSON.stringify(transactions));
      } catch {
        // ignore
      }
    }
  }, [wallet, transactions]);

  const fetchNFTs = async () => {
    if (typeof window.ethereum === 'undefined') {
      setNfts([]);
      return;
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    const factory = getCollectionFactoryContract(provider);
    const marketplace = getMarketplaceContract(provider);

    // 1. Get all collections from CollectionCreated events
    const createdEvents = await factory.queryFilter(factory.filters.CollectionCreated());
    const collectionsList: { address: string; name: string; creator: string }[] = createdEvents.map(
      (e) => ({
        address: e.args?.collection ?? e.args?.[0],
        name: (e.args?.name ?? e.args?.[1])?.toString() ?? '',
        creator: (e.args?.creator ?? e.args?.[2]) ?? '',
      })
    );

    const listingMap = new Map<string, { listingId: number; price: bigint; saleType: number; endTime?: bigint; highestBid?: bigint; finalized?: boolean }>();

    // 2. Build listing map from marketplace (listingId 1 .. nextListingId-1)
    try {
      const nextId = await marketplace.nextListingId();
      const maxId = Number(nextId);
      for (let listingId = 1; listingId < maxId; listingId++) {
        const [listing, auction] = await Promise.all([
          marketplace.listings(listingId),
          marketplace.auctions(listingId),
        ]);
        if (!listing.active) continue;
        const key = `${listing.nft.toLowerCase()}-${listing.tokenId.toString()}`;
        listingMap.set(key, {
          listingId,
          price: listing.price,
          saleType: Number(listing.saleType),
          endTime: auction?.endTime,
          highestBid: auction?.highestBid,
          finalized: auction?.finalized,
        });
      }
    } catch (e) {
      console.warn('Marketplace listings fetch failed', e);
    }

    const fetchedNFTs: NFT[] = [];
    const zeroAddress = ethers.ZeroAddress;

    for (const col of collectionsList) {
      const collectionAddress = ethers.getAddress(col.address);
      const nftContract = new ethers.Contract(collectionAddress, nftAbi.abi, provider);

      // 3. Get minted token IDs from Transfer(from=0) events
      const transferEvents = await nftContract.queryFilter(
        nftContract.filters.Transfer(zeroAddress)
      );
      const tokenIds = transferEvents.map((e) => (e.args?.tokenId ?? e.args?.[2])?.toString()).filter(Boolean);

      for (const tokenIdStr of tokenIds) {
        try {
          const tokenId = BigInt(tokenIdStr);
          const [tokenURI, owner] = await Promise.all([
            nftContract.tokenURI(tokenId),
            nftContract.ownerOf(tokenId),
          ]);
          const metadataUrl = resolveTokenUri(tokenURI);
          const metadata = await fetch(metadataUrl).then((res) => res.json()).catch(() => ({}));

          const listKey = `${collectionAddress.toLowerCase()}-${tokenIdStr}`;
          const listInfo = listingMap.get(listKey);

          let status: 'listed' | 'unlisted' | 'auction' = 'unlisted';
          let price: number | undefined;
          let listingId: number | undefined;
          let highestBid: number | undefined;
          let auctionEndTime: Date | undefined;
          let minBid: number | undefined;

          if (listInfo) {
            listingId = listInfo.listingId;
            price = parseFloat(ethers.formatEther(listInfo.price));
            if (listInfo.saleType === 1) {
              status = 'auction';
              if (listInfo.endTime != null) {
                const endSec = Number(listInfo.endTime);
                if (endSec > Date.now() / 1000 && !listInfo.finalized) {
                  auctionEndTime = new Date(endSec * 1000);
                  highestBid = listInfo.highestBid != null ? parseFloat(ethers.formatEther(listInfo.highestBid)) : undefined;
                  minBid = price;
                }
              }
            } else {
              status = 'listed';
            }
          }

          const id = `${collectionAddress}-${tokenIdStr}`;
          fetchedNFTs.push({
            id,
            tokenId: tokenIdStr,
            collectionAddress,
            collection: collectionAddress,
            name: metadata?.name ?? `#${tokenIdStr}`,
            description: metadata?.description ?? '',
            image: metadata?.image ?? '',
            price,
            creator: metadata?.creator ?? col.creator,
            owner,
            status,
            listingId,
            highestBid,
            auctionEndTime,
            minBid,
            createdAt: metadata?.createdAt ? new Date(metadata.createdAt) : new Date(),
          });
        } catch (err) {
          console.warn(`Skip token ${tokenIdStr} in ${collectionAddress}`, err);
        }
      }
    }

    setNfts(fetchedNFTs);

    // 4. Build collections from collectionsList + fetchedNFTs (floorPrice, nftCount)
    const collectionMap = new Map<string, Omit<Collection, 'image'> & { image?: string }>();
    for (const col of collectionsList) {
      const addr = ethers.getAddress(col.address);
      const colNfts = fetchedNFTs.filter((n) => n.collectionAddress.toLowerCase() === addr.toLowerCase());
      const available = colNfts.filter((n) => n.status === 'listed' || n.status === 'auction');
      const floorPrice = available.length
        ? Math.min(...available.map((n) => n.price ?? Infinity).filter((p) => p !== Infinity))
        : 0;
      let collectionImage = colNfts[0]?.image ?? '';
      let collectionName = col.name || `Collection ${addr.slice(0, 10)}...`;
      let collectionDescription = `Collection of ${col.name || 'NFTs'}`;
      try {
        const nftContract = new ethers.Contract(addr, nftAbi.abi, provider);
        const metadataURI = await nftContract.collectionMetadataURI();
        if (metadataURI && String(metadataURI).trim()) {
          const url = resolveTokenUri(String(metadataURI));
          const meta = await fetch(url).then((r) => r.json()).catch(() => null);
          if (meta?.image) collectionImage = meta.image;
          if (meta?.name) collectionName = meta.name;
          if (meta?.description) collectionDescription = meta.description;
        }
      } catch {
        // use defaults from event / first NFT
      }
      collectionMap.set(addr, {
        id: addr,
        contractAddress: addr,
        name: collectionName,
        description: collectionDescription,
        image: collectionImage,
        creator: col.creator,
        floorPrice: Number.isFinite(floorPrice) ? floorPrice : 0,
        nftCount: available.length,
      });
    }
    const newList = Array.from(collectionMap.values());
    setCollections((prev) =>
      newList.map((c) => {
        const existing = prev.find((p) => p.id === c.id);
        const image = (existing?.image && existing.image.trim() !== '') ? existing.image : (c.image || '');
        return { ...c, image };
      })
    );
  };

  useEffect(() => {
    fetchNFTs();

    setTimeout(() => {
      setLoading(false);
    }, 3000);
  }, []);

  useEffect(() => {
    if (nfts.length === 0) return;
    setCollections((prev) =>
      prev.map((c) => {
        const colNfts = nfts.filter((n) => n.collectionAddress.toLowerCase() === c.contractAddress.toLowerCase());
        const available = colNfts.filter((n) => n.status === 'listed' || n.status === 'auction');
        const floorPrice = available.length
          ? Math.min(...available.map((n) => n.price ?? Infinity).filter((p) => p !== Infinity))
          : 0;
        const collectionImage = (c.image && c.image.trim() !== '') ? c.image : (colNfts[0]?.image ?? '');
        return {
          ...c,
          floorPrice: Number.isFinite(floorPrice) ? floorPrice : 0,
          nftCount: available.length,
          image: collectionImage,
        };
      })
    );
  }, [nfts]);

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('MetaMask not detected. Please install MetaMask!');
      return;
    }

    try {
      // Try existing connection first (no popup) – e.g. after refresh if already authorized
      const existing = await window.ethereum.request({ method: 'eth_accounts' });
      if (existing?.length > 0) {
        setWallet(existing[0]);
        showAlert('Wallet connected', 'success');
        return;
      }

      // No prior authorization – show connect popup
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      setWallet(accounts[0]);
      showAlert('Wallet connected', 'success');
    } catch (err) {
      console.error('Wallet connection rejected', err);
      if (!isUserRejection(err)) {
        showAlert(getErrorMessage(err), 'error');
      }
    }
  };

  const disconnectWallet = () => {
    setWallet(null);

  // Optional: clear cached permissions (MetaMask-supported)
    if (window.ethereum?.request) {
      window.ethereum.request({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }],
      }).catch(() => {
        // silently ignore
      });
    }
    showAlert('Wallet disconnected', 'success');
  };

  const addTransaction = (tx: Omit<Transaction, 'id'>) => {
    setTransactions(prev => [...prev, { ...tx, id: Date.now().toString() }]);
  };

  const addNFT = (nft: NFT) => {
    setNfts(prev => [...prev, nft]);
    addTransaction({ type: 'mint', nft: nft.name, price: 0.01, date: new Date() });
  };

  const updateNFT = (id: string, updates: Partial<NFT>) => {
    setNfts(nfts.map(nft => nft.id === id ? { ...nft, ...updates } : nft));
  };

  const addCollection = (collection: Collection) => {
    setCollections((prev) => (prev.some((c) => c.id === collection.id) ? prev : [...prev, collection]));
  };

  const showAlert = (message: string, type: 'success' | 'error') => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlertModal(true);
  };

  const navigateTo = (page: string, collectionId?: string) => {
    setCurrentPage(page);
    if (collectionId) {
      setSelectedCollectionId(collectionId);
    }
  };

  const appContext: AppContextType = {
    wallet,
    connectWallet,
    disconnectWallet,
    nfts,
    collections,
    transactions,
    loading,
    addNFT,
    updateNFT,
    addCollection,
    addTransaction,
    showAlert,
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <Navigation 
        currentPage={currentPage} 
        onNavigate={navigateTo}
        context={appContext}
      />
      
      {currentPage === 'home' && <Home context={appContext} onNavigate={navigateTo} />}
      {currentPage === 'create' && <CreatePage context={appContext} />}
      {currentPage === 'collections' && <CollectionsPage context={appContext} onNavigate={navigateTo} />}
      {currentPage === 'collection-detail' && selectedCollectionId && (
        <CollectionDetailPage 
          collectionId={selectedCollectionId} 
          context={appContext}
        />
      )}
      {currentPage === 'auctions' && <AuctionsPage context={appContext} />}
      {currentPage === 'profile' && <ProfilePage context={appContext} />}

      {showAlertModal && (
        <AlertModal
          message={alertMessage}
          type={alertType}
          onClose={() => setShowAlertModal(false)}
        />
      )}
    </div>
  );
}

export default App;
