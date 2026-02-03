import { useState } from 'react';
import { Clock, Hammer } from 'lucide-react';
import { NFT, AppContextType } from '../App';
import { NFTModal } from './NFTModal';

type NFTCardProps = {
  nft: NFT;
  context: AppContextType;
  compact?: boolean;
};

export function NFTCard({ nft, context, compact = false }: NFTCardProps) {
  const [showModal, setShowModal] = useState(false);

  const getTimeRemaining = (endTime: Date) => {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ended';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        className="group cursor-pointer bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-800 hover:border-[#00FFFF] transition-all hover:scale-105"
      >
        <div className={`${compact ? 'aspect-square' : 'aspect-square'} overflow-hidden relative`}>
          <img 
            src={nft.image} 
            alt={nft.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
          {nft.status === 'auction' && (
            <div className="absolute top-3 right-3 bg-red-500/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {nft.auctionEndTime && getTimeRemaining(nft.auctionEndTime)}
            </div>
          )}
          {nft.status === 'unlisted' && (
            <div className="absolute top-3 right-3 bg-gray-600/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium">
              Unlisted
            </div>
          )}
        </div>
        
        <div className="p-4">
          <h3 className="font-bold mb-1 truncate">{nft.name}</h3>
          <p className="text-sm text-gray-400 mb-3 line-clamp-1">{nft.description}</p>
          
          <div className="flex justify-between items-center">
            {nft.status === 'auction' ? (
              <>
                <div>
                  <div className="text-xs text-gray-500">Current Bid</div>
                  <div className="font-bold text-[#00FFFF] flex items-center gap-1">
                    <Hammer className="w-3 h-3" />
                    {nft.highestBid || nft.minBid} ETH
                  </div>
                </div>
              </>
            ) : nft.status === 'listed' ? (
              <>
                <div>
                  <div className="text-xs text-gray-500">Price</div>
                  <div className="font-bold text-[#00FFFF]">{nft.price} ETH</div>
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500">Not listed</div>
            )}
            
            {nft.rarity && (
              <div className="text-xs bg-white/5 px-2 py-1 rounded">
                {nft.rarity}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <NFTModal
          nft={nft}
          context={context}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
