import { useState } from 'react';
import { AppContextType } from '../App';
import { Sparkles, TrendingUp } from 'lucide-react';
import { NFTCard } from './NFTCard';
import { Skeleton } from '@/components/ui/skeleton';

type HomeProps = {
  context: AppContextType;
  onNavigate: (page: string, collectionId?: string) => void;
};

export function Home({ context, onNavigate }: HomeProps) {
  const [bubbles] = useState(() => 
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 5 + Math.random() * 5,
      size: 3 + Math.random() * 6,
    }))
  );

  const featuredCollections = context.collections.slice(0, 3);
  
  // Calculate top NFTs: listed NFTs + auction NFTs sorted by highest price/bid
  const topNFTs = (() => {
    // Get all listed NFTs
    const listedNFTs = context.nfts.filter(nft => nft.status === 'listed' && nft.price);
    
    // Get all auction NFTs with their current bid value (highestBid or minBid)
    const auctionNFTs = context.nfts
      .filter(nft => nft.status === 'auction')
      .map(nft => ({
        ...nft,
        // Use highestBid if available, otherwise use minBid, default to 0
        currentValue: nft.highestBid ?? nft.minBid ?? 0
      }));
    
    // Combine listed and auction NFTs
    const allAvailableNFTs = [
      ...listedNFTs.map(nft => ({
        ...nft,
        currentValue: nft.price ?? 0
      })),
      ...auctionNFTs
    ];
    
    // Sort by currentValue (price for listed, bid for auction) in descending order
    const sorted = allAvailableNFTs.sort((a, b) => b.currentValue - a.currentValue);
    
    // Return top 6
    return sorted.slice(0, 6);
  })();
  
  const trendingNFTs = context.nfts.filter(nft => nft.status === 'auction').slice(0, 3);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Floating bubbles background */}
        <div className="absolute inset-0">
          {bubbles.map(bubble => (
            <div
              key={bubble.id}
              className="absolute bubble-hero"
              style={{
                left: `${bubble.x}%`,
                width: `${bubble.size}px`,
                height: `${bubble.size}px`,
                animationDelay: `${bubble.delay}s`,
                animationDuration: `${bubble.duration}s`,
              }}
            />
          ))}
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto fade-in">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-[#00FFFF] to-white bg-clip-text text-transparent">
            Discover Unique NFTs
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Explore, collect, and trade extraordinary digital assets in the world's most innovative NFT marketplace
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => onNavigate('collections')}
              className="px-8 py-4 bg-[#00FFFF] text-black rounded-lg hover:bg-[#00DDDD] transition-all hover:scale-105 font-medium"
            >
              Browse Collections
            </button>
            <button 
              onClick={() => onNavigate('create')}
              className="px-8 py-4 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-all hover:scale-105 font-medium"
            >
              Start Minting
            </button>
          </div>
        </div>

        <style>{`
          .bubble-hero {
            position: absolute;
            bottom: -50px;
            background: radial-gradient(circle at 30% 30%, rgba(0, 255, 255, 0.3), rgba(0, 255, 255, 0.05));
            border-radius: 50%;
            animation: float-hero infinite ease-in-out;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.2);
          }

          @keyframes float-hero {
            0% {
              transform: translateY(0) translateX(0) scale(1);
              opacity: 0;
            }
            10% {
              opacity: 0.6;
            }
            90% {
              opacity: 0.6;
            }
            100% {
              transform: translateY(-110vh) translateX(${Math.random() * 60 - 30}px) scale(1.5);
              opacity: 0;
            }
          }

          .fade-in {
            animation: fadeIn 1s ease-out;
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </section>

      {/* Featured Collections */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <Sparkles className="w-6 h-6 text-[#00FFFF]" />
          <h2 className="text-3xl font-bold">Featured Collections</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {context.loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-800">
                <Skeleton className="aspect-square w-full rounded-none bg-gray-700/50" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-6 w-3/4 bg-gray-700/50" />
                  <Skeleton className="h-4 w-full bg-gray-700/50" />
                  <Skeleton className="h-4 w-2/3 bg-gray-700/50" />
                  <div className="flex justify-between gap-4 pt-2">
                    <Skeleton className="h-8 w-20 bg-gray-700/50" />
                    <Skeleton className="h-8 w-16 bg-gray-700/50" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            featuredCollections.map(collection => (
              <div
                key={collection.id}
                onClick={() => onNavigate('collection-detail', collection.id)}
                className="group cursor-pointer bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-800 hover:border-[#00FFFF] transition-all hover:scale-105"
              >
                <div className="aspect-square overflow-hidden">
                  <img 
                    src={collection.image} 
                    alt={collection.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-bold mb-2">{collection.name}</h3>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{collection.description}</p>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs text-gray-500">Floor Price</div>
                      <div className="text-lg font-bold text-[#00FFFF]">
                        {collection.floorPrice > 0 ? `${collection.floorPrice} ETH` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Items</div>
                      <div className="text-lg font-bold">{collection.nftCount}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Top NFTs */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold mb-8">Top NFTs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {context.loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-800">
                <Skeleton className="aspect-square w-full rounded-none bg-gray-700/50" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-5 w-2/3 bg-gray-700/50" />
                  <Skeleton className="h-4 w-full bg-gray-700/50" />
                  <Skeleton className="h-6 w-24 bg-gray-700/50 mt-2" />
                </div>
              </div>
            ))
          ) : (
            topNFTs.map(nft => (
              <NFTCard key={nft.id} nft={nft} context={context} compact />
            ))
          )}
        </div>
      </section>

      {/* Trending Auctions */}
      {trendingNFTs.length > 0 && (
        <section className="py-16 px-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <TrendingUp className="w-6 h-6 text-[#00FFFF]" />
            <h2 className="text-3xl font-bold">Trending Auctions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {trendingNFTs.map(nft => (
              <NFTCard key={nft.id} nft={nft} context={context} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
