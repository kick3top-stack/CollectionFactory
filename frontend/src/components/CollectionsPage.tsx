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
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Collections</h1>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#121212] border-b border-gray-800">
              <tr>
                <th className="text-left p-4">Image</th>
                <th className="text-left p-4">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-2 hover:text-[#00FFFF] transition-colors"
                  >
                    Name
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="text-left p-4">Description</th>
                <th className="text-left p-4">
                  <button
                    onClick={() => handleSort('nftCount')}
                    className="flex items-center gap-2 hover:text-[#00FFFF] transition-colors"
                  >
                    NFTs
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="text-left p-4">
                  <button
                    onClick={() => handleSort('floorPrice')}
                    className="flex items-center gap-2 hover:text-[#00FFFF] transition-colors"
                  >
                    Floor Price
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {context.loading ? (
                Array.from({ length: 9 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-800">
                    <td className="p-4">
                      <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0 bg-gray-700/50" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-40 rounded-lg bg-gray-700/50" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 max-w-xs w-full rounded-lg bg-gray-700/50" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-12 rounded-lg bg-gray-700/50" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-20 rounded-lg bg-gray-700/50" />
                    </td>
                  </tr>
                ))
              ) : (
                displayedCollections.map(collection => (
                  <tr
                    key={collection.id}
                    onClick={() => onNavigate('collection-detail', collection.id)}
                    className="border-b border-gray-800 hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <td className="p-4">
                      <img
                        src={collection.image}
                        alt={collection.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    </td>
                    <td className="p-4 font-bold">{collection.name}</td>
                    <td className="p-4 text-gray-400 max-w-xs truncate">
                      {collection.description}
                    </td>
                    <td className="p-4">{collection.nftCount}</td>
                    <td className="p-4 text-[#00FFFF] font-bold">
                      {collection.floorPrice > 0 ? `${collection.floorPrice} ETH` : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => handleSort('name')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                sortField === 'name'
                  ? 'bg-[#00FFFF] text-black'
                  : 'bg-[#1a1a1a] text-gray-400'
              }`}
            >
              Name
            </button>
            <button
              onClick={() => handleSort('floorPrice')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                sortField === 'floorPrice'
                  ? 'bg-[#00FFFF] text-black'
                  : 'bg-[#1a1a1a] text-gray-400'
              }`}
            >
              Floor Price
            </button>
            <button
              onClick={() => handleSort('nftCount')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                sortField === 'nftCount'
                  ? 'bg-[#00FFFF] text-black'
                  : 'bg-[#1a1a1a] text-gray-400'
              }`}
            >
              NFT Count
            </button>
          </div>

          {context.loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden hover:border-gray-700 transition-all">
                <div className="flex gap-4 p-4">
                  <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0 bg-gray-700/50" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <Skeleton className="h-5 w-3/4 max-w-[160px] rounded-lg bg-gray-700/50" />
                    <Skeleton className="h-3 w-full max-w-[200px] rounded-lg bg-gray-700/50" />
                    <Skeleton className="h-3 w-2/3 max-w-[140px] rounded-lg bg-gray-700/50" />
                    <div className="flex gap-4 pt-1">
                      <Skeleton className="h-4 w-16 rounded-lg bg-gray-700/50" />
                      <Skeleton className="h-4 w-20 rounded-lg bg-gray-700/50" />
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            displayedCollections.map(collection => (
              <div
                key={collection.id}
                onClick={() => onNavigate('collection-detail', collection.id)}
                className="bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden hover:border-[#00FFFF] transition-all"
              >
                <div className="flex gap-4 p-4">
                  <img
                    src={collection.image}
                    alt={collection.name}
                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold mb-1">{collection.name}</h3>
                    <p className="text-sm text-gray-400 line-clamp-2 mb-2">
                      {collection.description}
                    </p>
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Items: </span>
                        <span>{collection.nftCount}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Floor: </span>
                        <span className="text-[#00FFFF] font-bold">
                          {collection.floorPrice > 0 ? `${collection.floorPrice} ETH` : 'N/A'}
                        </span>
                      </div>
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
