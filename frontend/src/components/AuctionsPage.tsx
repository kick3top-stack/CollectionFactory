import { useState } from 'react';
import { AppContextType } from '../App';
import { NFTCard } from './NFTCard';
import { Trophy, ArrowUpDown } from 'lucide-react';

type AuctionsPageProps = {
  context: AppContextType;
};

type SortOption = 'bid-high' | 'bid-low' | 'time-soon' | 'time-later';

export function AuctionsPage({ context }: AuctionsPageProps) {
  const [sortBy, setSortBy] = useState<SortOption>('bid-high');

  // Filter only auction NFTs
  let auctionNFTs = context.nfts.filter(nft => nft.status === 'auction');

  // Sort auctions
  auctionNFTs = [...auctionNFTs].sort((a, b) => {
    switch (sortBy) {
      case 'bid-high':
        return (b.highestBid || 0) - (a.highestBid || 0);
      case 'bid-low':
        return (a.highestBid || 0) - (b.highestBid || 0);
      case 'time-soon':
        if (!a.auctionEndTime || !b.auctionEndTime) return 0;
        return a.auctionEndTime.getTime() - b.auctionEndTime.getTime();
      case 'time-later':
        if (!a.auctionEndTime || !b.auctionEndTime) return 0;
        return b.auctionEndTime.getTime() - a.auctionEndTime.getTime();
      default:
        return 0;
    }
  });

  // Separate featured auctions (highest bids)
  const featuredAuctions = [...auctionNFTs]
    .sort((a, b) => (b.highestBid || 0) - (a.highestBid || 0))
    .slice(0, 3);

  const getTimeRemaining = (endTime: Date) => {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="app-page">
      <div className="app-container">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8">Live Auctions</h1>

        {/* Featured Auctions */}
        {featuredAuctions.length > 0 && (
          <section className="mb-10 sm:mb-16">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 shrink-0" />
              <h2 className="text-xl sm:text-2xl font-bold">Featured Auctions</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {featuredAuctions.map(nft => (
                <div key={nft.id} className="relative">
                  <div className="absolute -top-3 -right-3 z-10 bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-bold">
                    Top Bid
                  </div>
                  <NFTCard nft={nft} context={context} compact />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All Auctions */}
        <section>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold">All Auctions ({auctionNFTs.length})</h2>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <ArrowUpDown className="w-4 h-4 text-gray-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg focus:outline-none focus:border-[#00FFFF]"
              >
                <option value="bid-high">Highest Bid</option>
                <option value="bid-low">Lowest Bid</option>
                <option value="time-soon">Ending Soon</option>
                <option value="time-later">Ending Later</option>
              </select>
            </div>
          </div>

          {auctionNFTs.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-x-auto mb-6 sm:mb-8">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-[#121212] border-b border-gray-800">
                    <tr>
                      <th className="text-left p-4">NFT</th>
                      <th className="text-left p-4">Collection</th>
                      <th className="text-left p-4">Current Bid</th>
                      <th className="text-left p-4">Time Remaining</th>
                      <th className="text-left p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auctionNFTs.map(nft => {
                      const collection = context.collections.find(c => c.id === nft.collection);
                      const timeRemaining = nft.auctionEndTime ? getTimeRemaining(nft.auctionEndTime) : 'N/A';
                      const isEnding = nft.auctionEndTime && 
                        (nft.auctionEndTime.getTime() - new Date().getTime()) < 3600000; // Less than 1 hour

                      return (
                        <tr
                          key={nft.id}
                          className="border-b border-gray-800 hover:bg-white/5 cursor-pointer transition-colors"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={nft.image}
                                alt={nft.name}
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                              <div>
                                <div className="font-bold">{nft.name}</div>
                                <div className="text-sm text-gray-400 line-clamp-1">
                                  {nft.description}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">{collection?.name || 'Unknown'}</td>
                          <td className="p-4">
                            <div className="text-[#00FFFF] font-bold">
                              {nft.highestBid || nft.minBid} ETH
                            </div>
                          </td>
                          <td className="p-4">
                            <div className={isEnding ? 'text-red-400 font-medium' : ''}>
                              {timeRemaining}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium">
                              Live
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {auctionNFTs.map(nft => (
                  <NFTCard key={nft.id} nft={nft} context={context} compact />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16 bg-[#1a1a1a] rounded-xl border border-gray-800">
              <p className="text-gray-400 text-lg mb-2">No live auctions at the moment</p>
              <p className="text-sm text-gray-500">Check back later for new auctions</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
