import { useState } from 'react';
import { AppContextType } from '../App';
import { NFTCard } from './NFTCard';
import { ArrowLeft, Filter, ExternalLink, Copy, Check } from 'lucide-react';
import { SUPPORTED_NETWORKS } from '@/abi/networks';

type CollectionDetailPageProps = {
  collectionId: string;
  context: AppContextType;
  /** Called when user clicks the back button */
  onBack: () => void;
};

type SortOption = 'price-low' | 'price-high' | 'date-new' | 'date-old' | 'rarity';
type FilterStatus = 'all' | 'listed' | 'auction';

const DEFAULT_EXPLORER = 'https://sepolia.etherscan.io';

export function CollectionDetailPage({ collectionId, context, onBack }: CollectionDetailPageProps) {
  const [sortBy, setSortBy] = useState<SortOption>('date-new');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [copied, setCopied] = useState(false);

  const collection = context.collections.find(c => c.id === collectionId);
  const contractAddress = collection?.contractAddress ?? collection?.id ?? '';
  const explorerBase = (SUPPORTED_NETWORKS as Record<string, { blockExplorerUrls?: string[] }>)[String(11155111)]?.blockExplorerUrls?.[0] ?? DEFAULT_EXPLORER;
  const explorerAddressUrl = contractAddress ? `${explorerBase.replace(/\/$/, '')}/address/${contractAddress}` : '';

  const handleCopyAddress = () => {
    if (!contractAddress) return;
    navigator.clipboard.writeText(contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  if (!collection) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Collection not found</h2>
          <p className="text-gray-400">The collection you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  // Filter NFTs by collection and status (exclude unlisted)
  let nfts = context.nfts.filter(nft => 
    nft.collection === collectionId && nft.status !== 'unlisted'
  );

  // Apply status filter
  if (filterStatus !== 'all') {
    nfts = nfts.filter(nft => nft.status === filterStatus);
  }

  // Sort NFTs
  nfts = [...nfts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        const priceA = a.price || a.highestBid || 0;
        const priceB = b.price || b.highestBid || 0;
        return priceA - priceB;
      case 'price-high':
        const priceA2 = a.price || a.highestBid || 0;
        const priceB2 = b.price || b.highestBid || 0;
        return priceB2 - priceA2;
      case 'date-new':
        return (
          (b.createdAt instanceof Date && !isNaN(b.createdAt.getTime()) ? b.createdAt.getTime() : 0) -
          (a.createdAt instanceof Date && !isNaN(a.createdAt.getTime()) ? a.createdAt.getTime() : 0)
        );
      case 'date-old':
        return (
          (b.createdAt instanceof Date && !isNaN(b.createdAt.getTime()) ? b.createdAt.getTime() : 0) -
          (a.createdAt instanceof Date && !isNaN(a.createdAt.getTime()) ? a.createdAt.getTime() : 0)
        );
      case 'rarity':
        const rarityOrder: { [key: string]: number } = {
          'Legendary': 0,
          'Epic': 1,
          'Rare': 2,
          'Common': 3,
        };
        return (rarityOrder[a.rarity || 'Common'] || 3) - (rarityOrder[b.rarity || 'Common'] || 3);
      default:
        return 0;
    }
  });

  return (
    <div className="app-page">
      <div className="app-container">
        {/* Back Button - touch friendly */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 sm:mb-6 transition-colors min-h-[44px] -ml-1 pl-1 rounded-lg hover:bg-white/5 active:bg-white/10"
        >
          <ArrowLeft className="w-5 h-5 shrink-0" />
          <span className="text-sm sm:text-base">Back to Collections</span>
        </button>

        {/* Collection Header */}
        <div className="grid grid-cols-1 md:grid-cols-[280px,1fr] lg:grid-cols-[300px,1fr] gap-6 sm:gap-8 mb-8 sm:mb-12">
          <div className="aspect-square max-w-sm md:max-w-none mx-auto md:mx-0 rounded-2xl overflow-hidden">
            <img
              src={collection.image}
              alt={collection.name}
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="min-w-0">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 break-words">{collection.name}</h1>
            <p className="text-gray-400 text-base sm:text-lg mb-4 sm:mb-6 break-words">{collection.description}</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-800">
                <div className="text-sm text-gray-500 mb-1">Floor Price</div>
                <div className="text-2xl font-bold text-[#00FFFF]">
                  {collection.floorPrice > 0 ? `${collection.floorPrice} ETH` : 'N/A'}
                </div>
              </div>
              
              <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-800">
                <div className="text-sm text-gray-500 mb-1">Items</div>
                <div className="text-2xl font-bold">{nfts.length}</div>
              </div>
              
              <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-800">
                <div className="text-sm text-gray-500 mb-1">Creator</div>
                <div className="text-sm font-mono truncate text-[#00FFFF]">
                  {collection.creator}
                </div>
              </div>
            </div>

            {/* Contract address for Etherscan */}
            {contractAddress && (
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-[#121212] rounded-xl border border-gray-800 overflow-hidden">
                <div className="text-sm text-gray-500 mb-2">Collection contract</div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs sm:text-sm text-gray-300 break-all">
                    {contractAddress}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    title="Copy address"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  {explorerAddressUrl && (
                    <a
                      href={explorerAddressUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#00FFFF]/10 text-[#00FFFF] hover:bg-[#00FFFF]/20 transition-colors text-sm font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View on Etherscan
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 sm:mb-8">
          <div className="flex-1">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="sm:hidden w-full min-h-[48px] px-4 py-3 bg-[#1a1a1a] border border-gray-800 rounded-lg flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters & Sort
              </span>
            </button>

            <div className={`${showFilters ? 'block' : 'hidden'} sm:flex gap-3 mt-3 sm:mt-0`}>
              <div className="mb-3 sm:mb-0">
                <label className="block text-sm text-gray-400 mb-2">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                  className="w-full sm:w-auto px-4 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg focus:outline-none focus:border-[#00FFFF]"
                >
                  <option value="all">All</option>
                  <option value="listed">Listed</option>
                  <option value="auction">Auction</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full sm:w-auto px-4 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg focus:outline-none focus:border-[#00FFFF]"
                >
                  <option value="date-new">Newest First</option>
                  <option value="date-old">Oldest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rarity">Rarity</option>
                </select>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-400 flex items-end">
            {nfts.length} {nfts.length === 1 ? 'item' : 'items'}
          </div>
        </div>

        {/* NFTs Grid */}
        {nfts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {nfts.map(nft => (
              <NFTCard key={nft.id} nft={nft} context={context} compact />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">No NFTs found in this collection</p>
          </div>
        )}
      </div>
    </div>
  );
}
