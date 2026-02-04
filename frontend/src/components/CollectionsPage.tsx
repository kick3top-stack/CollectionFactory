import { useState, useEffect } from 'react';
import { AppContextType } from '../App';
import { ArrowUpDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type CollectionsPageProps = {
  context: AppContextType;
  onNavigate: (page: string, collectionId?: string) => void;
};

type SortField = 'name' | 'floorPrice' | 'nftCount';
type SortDirection = 'asc' | 'desc';

export function CollectionsPage({ context, onNavigate }: CollectionsPageProps) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [displayedCollections, setDisplayedCollections] = useState(context.collections.slice(0, 10));
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const sortedCollections = [...context.collections].sort((a, b) => {
    let aVal, bVal;
    
    switch (sortField) {
      case 'name':
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        break;
      case 'floorPrice':
        aVal = a.floorPrice;
        bVal = b.floorPrice;
        break;
      case 'nftCount':
        aVal = a.nftCount;
        bVal = b.nftCount;
        break;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  useEffect(() => {
    setDisplayedCollections(sortedCollections.slice(0, page * itemsPerPage));
  }, [sortField, sortDirection, page, context.collections]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleScroll = () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
      if (displayedCollections.length < sortedCollections.length) {
        setPage(prev => prev + 1);
      }
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [displayedCollections.length, sortedCollections.length]);

  return (
    <div className="app-page">
      <div className="app-container">
        <h1 className="app-page-title">Collections</h1>

        {/* Desktop Table View */}
        <div className="hidden md:block app-card overflow-x-auto rounded-xl">
          <div className="app-table-wrap">
            <table className="app-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>
                  <button type="button" onClick={() => handleSort('name')} className="flex items-center gap-2 hover:text-[var(--app-primary)] transition-colors bg-transparent border-none cursor-pointer text-inherit">
                    Name
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th>Description</th>
                <th>
                  <button type="button" onClick={() => handleSort('nftCount')} className="flex items-center gap-2 hover:text-[var(--app-primary)] transition-colors bg-transparent border-none cursor-pointer text-inherit">
                    NFTs
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th>
                  <button type="button" onClick={() => handleSort('floorPrice')} className="flex items-center gap-2 hover:text-[var(--app-primary)] transition-colors bg-transparent border-none cursor-pointer text-inherit">
                    Floor Price
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {context.loading ? (
                Array.from({ length: 9 }).map((_, i) => (
                  <tr key={i}>
                    <td><Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" /></td>
                    <td><Skeleton className="h-4 w-40 rounded-lg" /></td>
                    <td><Skeleton className="h-4 max-w-xs w-full rounded-lg" /></td>
                    <td><Skeleton className="h-4 w-12 rounded-lg" /></td>
                    <td><Skeleton className="h-4 w-20 rounded-lg" /></td>
                  </tr>
                ))
              ) : (
                displayedCollections.map((collection) => (
                  <tr
                    key={collection.id}
                    data-clickable
                    onClick={() => onNavigate('collection-detail', collection.id)}
                  >
                    <td>
                      <img src={collection.image} alt={collection.name} className="w-16 h-16 rounded-lg object-cover" />
                    </td>
                    <td className="font-bold">{collection.name}</td>
                    <td className="text-[var(--app-text-muted)] max-w-xs truncate">{collection.description}</td>
                    <td>{collection.nftCount}</td>
                    <td className="app-price">{collection.floorPrice > 0 ? `${collection.floorPrice} ETH` : 'N/A'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button type="button" onClick={() => handleSort('name')} className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors min-h-[var(--app-touch-min)] ${sortField === 'name' ? 'bg-[var(--app-primary)] text-[var(--app-text-inverse)]' : 'bg-[var(--app-surface)] text-[var(--app-text-muted)]'}`}>Name</button>
            <button type="button" onClick={() => handleSort('floorPrice')} className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors min-h-[var(--app-touch-min)] ${sortField === 'floorPrice' ? 'bg-[var(--app-primary)] text-[var(--app-text-inverse)]' : 'bg-[var(--app-surface)] text-[var(--app-text-muted)]'}`}>Floor Price</button>
            <button type="button" onClick={() => handleSort('nftCount')} className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors min-h-[var(--app-touch-min)] ${sortField === 'nftCount' ? 'bg-[var(--app-primary)] text-[var(--app-text-inverse)]' : 'bg-[var(--app-surface)] text-[var(--app-text-muted)]'}`}>NFT Count</button>
          </div>

          {context.loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="app-card">
                <div className="flex gap-4 p-4">
                  <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <Skeleton className="h-5 w-3/4 max-w-[160px] rounded-lg" />
                    <Skeleton className="h-3 w-full max-w-[200px] rounded-lg" />
                    <div className="flex gap-4 pt-1">
                      <Skeleton className="h-4 w-16 rounded-lg" />
                      <Skeleton className="h-4 w-20 rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            displayedCollections.map((collection) => (
              <div
                key={collection.id}
                role="button"
                tabIndex={0}
                onClick={() => onNavigate('collection-detail', collection.id)}
                onKeyDown={(e) => e.key === 'Enter' && onNavigate('collection-detail', collection.id)}
                className="app-card app-card--clickable"
              >
                <div className="flex gap-4 p-4">
                  <img
                    src={collection.image}
                    alt={collection.name}
                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold mb-1">{collection.name}</h3>
                    <p className="text-sm text-[var(--app-text-muted)] line-clamp-2 mb-2">{collection.description}</p>
                    <div className="flex gap-4 text-sm">
                      <div><span className="app-meta-label">Items: </span><span>{collection.nftCount}</span></div>
                      <div><span className="app-meta-label">Floor: </span><span className="app-price">{collection.floorPrice > 0 ? `${collection.floorPrice} ETH` : 'N/A'}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {!context.loading && displayedCollections.length < sortedCollections.length && (
          <div className="text-center py-8 text-gray-400">
            Loading more collections...
          </div>
        )}
      </div>
    </div>
  );
}
