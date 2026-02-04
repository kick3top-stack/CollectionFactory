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

  const topNFTs = (() => {
    const listedNFTs = context.nfts.filter((nft) => nft.status === 'listed' && nft.price);
    const auctionNFTs = context.nfts
      .filter((nft) => nft.status === 'auction')
      .map((nft) => ({ ...nft, currentValue: nft.highestBid ?? nft.minBid ?? 0 }));
    const allAvailableNFTs = [
      ...listedNFTs.map((nft) => ({ ...nft, currentValue: nft.price ?? 0 })),
      ...auctionNFTs,
    ];
    return allAvailableNFTs.sort((a, b) => b.currentValue - a.currentValue).slice(0, 6);
  })();

  const trendingNFTs = context.nfts.filter((nft) => nft.status === 'auction').slice(0, 3);

  return (
    <div className="min-h-screen">
      <section className="app-hero">
        <div className="absolute inset-0">
          {bubbles.map((bubble) => (
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
        <div className="app-hero-content fade-in">
          <h1 className="app-hero-title">Discover Unique NFTs</h1>
          <p className="app-hero-desc">
            Explore, collect, and trade extraordinary digital assets in the world's most innovative
            NFT marketplace
          </p>
          <div className="app-hero-actions">
            <button type="button" onClick={() => onNavigate('collections')} className="app-btn app-btn--primary">
              Browse Collections
            </button>
            <button type="button" onClick={() => onNavigate('create')} className="app-btn app-btn--secondary">
              Start Minting
            </button>
          </div>
        </div>
        <style>{`
          .bubble-hero {
            bottom: -50px;
            background: radial-gradient(circle at 30% 30%, rgba(0, 255, 255, 0.3), rgba(0, 255, 255, 0.05));
            border-radius: 50%;
            animation: float-hero infinite ease-in-out;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.2);
          }
          @keyframes float-hero {
            0% { transform: translateY(0) scale(1); opacity: 0; }
            10% { opacity: 0.6; }
            90% { opacity: 0.6; }
            100% { transform: translateY(-110vh) scale(1.5); opacity: 0; }
          }
          .fade-in {
            animation: fadeIn 1s ease-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </section>

      <section className="app-section app-container py-10 sm:py-16">
        <h2 className="app-section-title">
          <Sparkles style={{ color: 'var(--app-primary)', width: 24, height: 24, flexShrink: 0 }} />
          Featured Collections
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {context.loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="app-card">
                  <div className="app-card-image">
                    <Skeleton className="w-full h-full rounded-none bg-[var(--app-border)]" />
                  </div>
                  <div className="app-card-body space-y-3">
                    <Skeleton className="h-6 w-3/4 max-w-[180px] rounded-lg bg-[var(--app-border)]" />
                    <Skeleton className="h-4 w-full max-w-[240px] rounded-lg bg-[var(--app-border)]" />
                    <div className="flex justify-between gap-4 pt-2">
                      <Skeleton className="h-6 w-20 rounded-lg bg-[var(--app-border)]" />
                      <Skeleton className="h-6 w-14 rounded-lg bg-[var(--app-border)]" />
                    </div>
                  </div>
                </div>
              ))
            : featuredCollections.map((collection) => (
                <div
                  key={collection.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onNavigate('collection-detail', collection.id)}
                  onKeyDown={(e) => e.key === 'Enter' && onNavigate('collection-detail', collection.id)}
                  className="app-card app-card--clickable"
                >
                  <div className="app-card-image">
                    <img src={collection.image} alt={collection.name} />
                  </div>
                  <div className="app-card-body">
                    <h3 className="app-card-title text-xl">{collection.name}</h3>
                    <p className="app-card-desc">{collection.description}</p>
                    <div className="app-card-meta">
                      <div>
                        <div className="app-meta-label">Floor Price</div>
                        <div className="app-price text-lg">
                          {collection.floorPrice > 0 ? `${collection.floorPrice} ETH` : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="app-meta-label">Items</div>
                        <div className="text-lg font-bold">{collection.nftCount}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
        </div>
      </section>

      <section className="app-section app-container py-10 sm:py-16">
        <h2 className="app-section-title">Top NFTs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {context.loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="app-card">
                  <div className="app-card-image">
                    <Skeleton className="w-full h-full rounded-none" />
                  </div>
                  <div className="app-card-body space-y-2">
                    <Skeleton className="h-5 w-2/3 max-w-[140px] rounded-lg" />
                    <Skeleton className="h-4 w-full max-w-[180px] rounded-lg" />
                    <Skeleton className="h-5 w-24 rounded-lg mt-1" />
                  </div>
                </div>
              ))
            : topNFTs.map((nft) => <NFTCard key={nft.id} nft={nft} context={context} compact />)}
        </div>
      </section>

      {trendingNFTs.length > 0 && (
        <section className="app-section app-container py-10 sm:py-16">
          <h2 className="app-section-title">
            <TrendingUp style={{ color: 'var(--app-primary)', width: 24, height: 24, flexShrink: 0 }} />
            Trending Auctions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {trendingNFTs.map((nft) => (
              <NFTCard key={nft.id} nft={nft} context={context} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
