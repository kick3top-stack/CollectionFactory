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
        role="button"
        tabIndex={0}
        onClick={() => setShowModal(true)}
        onKeyDown={(e) => e.key === 'Enter' && setShowModal(true)}
        className="app-card app-card--clickable"
      >
        <div className={`app-card-image ${compact ? 'aspect-square' : ''} relative`}>
          <img src={nft.image} alt={nft.name} />
          {nft.status === 'auction' && (
            <div className="app-badge app-badge--auction absolute top-3 right-3">
              <Clock style={{ width: 12, height: 12 }} />
              {nft.auctionEndTime && getTimeRemaining(nft.auctionEndTime)}
            </div>
          )}
          {nft.status === 'unlisted' && (
            <div className="app-badge app-badge--unlisted absolute top-3 right-3">
              Unlisted
            </div>
          )}
        </div>
        <div className="app-card-body">
          <h3 className="app-card-title">{nft.name}</h3>
          <p className="app-card-desc text-sm mb-3 line-clamp-1">{nft.description}</p>
          <div className="flex justify-between items-center">
            {nft.status === 'auction' && (
              <div>
                <div className="app-meta-label">Current Bid</div>
                <div className="app-price flex items-center gap-1">
                  <Hammer style={{ width: 12, height: 12 }} />
                  {nft.highestBid || nft.minBid} ETH
                </div>
              </div>
            )}
            {nft.status === 'listed' && (
              <div>
                <div className="app-meta-label">Price</div>
                <div className="app-price">{nft.price} ETH</div>
              </div>
            )}
            {nft.status === 'unlisted' && (
              <div className="text-sm text-[var(--app-text-dim)]">Not listed</div>
            )}
            {nft.rarity && (
              <div className="text-xs bg-white/5 px-2 py-1 rounded">{nft.rarity}</div>
            )}
          </div>
        </div>
      </div>
      {showModal && (
        <NFTModal nft={nft} context={context} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
