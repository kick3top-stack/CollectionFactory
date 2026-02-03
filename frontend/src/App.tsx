import { useState, useEffect } from 'react';
import { Home } from './components/Home';
import { MintPage } from './components/MintPage';
import { CollectionsPage } from './components/CollectionsPage';
import { CollectionDetailPage } from './components/CollectionDetailPage';
import { AuctionsPage } from './components/AuctionsPage';
import { ProfilePage } from './components/ProfilePage';
import { Navigation } from './components/Navigation';
import { PreloadEffect } from './components/PreloadEffect';
import { AlertModal } from './components/AlertModal';
import { ethers } from 'ethers';
import { NFT_ADDRESS } from './blockchain/contracts/addresses';
import { MARKETPLACE_ADDRESS } from './blockchain/contracts/addresses';
import nftJson from "@/abi/nftAbi.json"
import marketplaceJson from "@/abi/marketplaceAbi.json"
import { getErrorMessage, isUserRejection } from './blockchain/utils/errorMessages';

export type NFT = {
  id: string;
  name: string;
  description: string;
  image: string;
  price?: number;
  collection: string;
  creator: string;
  owner: string;
  status: 'listed' | 'unlisted' | 'auction';
  highestBid?: number;
  auctionEndTime?: Date;
  minBid?: number;
  rarity?: string;
  createdAt: Date;
};

export type Collection = {
  id: string;
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
  addNFT: (nft: NFT) => void;
  updateNFT: (id: string, updates: Partial<NFT>) => void;
  addCollection: (collection: Collection) => void;
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

  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: '1',
      type: 'purchase',
      nft: 'Galaxy Portal #3',
      price: 4.5,
      date: new Date('2024-01-22'),
    },
    {
      id: '2',
      type: 'mint',
      nft: 'Cosmic Dream #1',
      price: 0.01,
      date: new Date('2024-01-15'),
    },
  ]);

  const fetchNFTs = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const nftContract = new ethers.Contract(
      NFT_ADDRESS,
      nftJson.abi,
      provider
    );
    const marketplaceContract = new ethers.Contract(
      MARKETPLACE_ADDRESS,
      marketplaceJson.abi,
      provider
    );

    const total = Number(await nftContract.tokenCounter());
    const fetchedNFTs: NFT[] = [];

    for (let tokenId = 0; tokenId < total; tokenId++) {
      const tokenURI = await nftContract.tokenURI(tokenId);
      const owner = await nftContract.ownerOf(tokenId);
      // Fetch on-chain collection name from the contract
      const onChainCollectionName = await nftContract.collections(tokenId);
      const metadata = await fetch(tokenURI).then(res => res.json());

      const listing = await marketplaceContract.getListing(
            NFT_ADDRESS,
            tokenId,
          );
          console.log(nftContract.target)
      
      let price: number | undefined;
      let status: 'listed' | 'unlisted' | 'auction' = 'unlisted';

      if (listing.price > 0n) {
        price = parseFloat(ethers.formatEther(listing.price));
        status = 'listed';
      }

      const auction = await marketplaceContract.getAuction(nftContract.target, tokenId);
      if (auction.endTime && auction.endTime > Date.now() / 1000 && !auction.ended) {
          status = 'auction';
      }

      // Fetch auction details if auction exists and is not ended
      let highestBid: number | undefined;
      let auctionEndTime: Date | undefined;
      let minBid: number | undefined;

      if (auction && auction.endTime && !auction.ended) {
          highestBid = auction.highestBid ? parseFloat(ethers.formatEther(auction.highestBid)) : undefined;
          auctionEndTime = new Date(Number(auction.endTime) * 1000); // Convert endTime (seconds) to Date
          minBid = auction.minBid ? parseFloat(ethers.formatEther(auction.minBid)) : undefined;
      }
          
      // Normalize collection name: convert to lowercase and replace spaces with hyphens for consistency
      const normalizedCollection = onChainCollectionName.toLowerCase().replace(/\s+/g, '-');
          
      fetchedNFTs.push({
        id: tokenId.toString(),
        name: metadata.name,
        description: metadata.description,
        image: metadata.image,
        price,
        collection: normalizedCollection, // Use on-chain collection name instead of metadata
        creator: metadata.creator,
        owner: owner,
        status: status,
        highestBid,
        auctionEndTime,
        minBid,
        createdAt: metadata.createdAt,
      });
      console.log({
        id: tokenId.toString(),
        name: metadata.name,
        description: metadata.description,
        image: metadata.image,
        price,
        collection: normalizedCollection,
        onChainCollectionName,
        creator: metadata.creator,
        owner: owner,
        status: status,
        highestBid,
        auctionEndTime,
        minBid,
        createdAt: metadata.createdAt,
      });
    }

    setNfts(fetchedNFTs);
  };

  useEffect(() => {
    fetchNFTs();

    setTimeout(() => {
      setLoading(false);
    }, 3000);
  }, []);

  useEffect(() => {
    if (nfts.length === 0) return;

    // Map to store collection data: key is normalized collection ID, value is Collection object
    const collectionMap = new Map<string, Collection>();
    // Map to store actual on-chain collection names: key is normalized ID, value is actual name
    const collectionNamesMap = new Map<string, string>();

    for (const nft of nfts) {
      // Only count NFTs that are listed or in auction (available for purchase)
      const isAvailable = nft.status === 'listed' || nft.status === 'auction';
      
      // nft.collection is already normalized from fetchNFTs
      const key = nft.collection;

      if (!collectionMap.has(key)) {
        // Try to get the actual collection name from the first NFT's metadata or use formatted key
        // Since we're using normalized IDs, we'll format it for display
        const displayName = key
          .split('-')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        
        collectionMap.set(key, {
          id: key,
          name: displayName,
          description: `Collection of ${displayName} NFTs`,
          image: nft.image,
          creator: nft.creator,
          floorPrice: isAvailable && nft.price ? nft.price : Infinity,
          nftCount: isAvailable ? 1 : 0,
        });
      } else {
        const col = collectionMap.get(key)!;
        
        // Only increment count for listed/auction items
        if (isAvailable) {
          col.nftCount += 1;
        }

        // Update floor price only for available items with a price
        if (isAvailable && nft.price && nft.price < col.floorPrice) {
          col.floorPrice = nft.price;
        }
      }
    }

    // Replace Infinity with 0 for unlisted collections and filter out collections with 0 items
    const finalCollections = Array.from(collectionMap.values())
      .map(c => ({
        ...c,
        floorPrice: c.floorPrice === Infinity ? 0 : c.floorPrice,
      }))
      .filter(c => c.nftCount > 0); // Only show collections with available items

    setCollections(finalCollections);
  }, [nfts]);

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('MetaMask not detected. Please install MetaMask!');
      return;
    }

    try {
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

  const addNFT = (nft: NFT) => {
    setNfts([...nfts, nft]);
    const transaction: Transaction = {
      id: Date.now().toString(),
      type: 'mint',
      nft: nft.name,
      price: 0.01,
      date: new Date(),
    };
    setTransactions([...transactions, transaction]);
  };

  const updateNFT = (id: string, updates: Partial<NFT>) => {
    setNfts(nfts.map(nft => nft.id === id ? { ...nft, ...updates } : nft));
  };

  const addCollection = (collection: Collection) => {
    
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
    addNFT,
    updateNFT,
    addCollection,
    showAlert,
  };

  if (loading) {
    return <PreloadEffect />;
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <Navigation 
        currentPage={currentPage} 
        onNavigate={navigateTo}
        context={appContext}
      />
      
      {currentPage === 'home' && <Home context={appContext} onNavigate={navigateTo} />}
      {currentPage === 'mint' && <MintPage context={appContext} />}
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
