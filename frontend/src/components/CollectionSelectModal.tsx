import { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { Collection } from '../App';

type CollectionSelectModalProps = {
  collections: Collection[];
  onSelect: (collectionId: string) => void;
  onClose: () => void;
};

export function CollectionSelectModal({ collections, onSelect, onClose }: CollectionSelectModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [displayedCollections, setDisplayedCollections] = useState<Collection[]>([]);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const filteredCollections = collections.filter(collection =>
    collection.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    setDisplayedCollections(filteredCollections.slice(0, page * itemsPerPage));
  }, [searchQuery, page, collections]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
      if (displayedCollections.length < filteredCollections.length) {
        setPage(prev => prev + 1);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col border border-gray-800">
        {/* Header */}
        <div className="border-b border-gray-800 p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Select Collection</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search collections..."
              className="w-full pl-10 pr-4 py-3 bg-[#121212] border border-gray-700 rounded-lg focus:outline-none focus:border-[#00FFFF]"
            />
          </div>
        </div>

        {/* Collections List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2" onScroll={handleScroll}>
          {displayedCollections.length > 0 ? (
            displayedCollections.map(collection => (
              <div
                key={collection.id}
                onClick={() => onSelect(collection.id)}
                className="flex items-center gap-4 p-3 bg-[#121212] hover:bg-white/5 rounded-lg cursor-pointer transition-colors border border-gray-800 hover:border-[#00FFFF]"
              >
                <img
                  src={collection.image}
                  alt={collection.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-bold">{collection.name}</h3>
                  <p className="text-sm text-gray-400 line-clamp-1">{collection.description}</p>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500">
                    <span>{collection.nftCount} items</span>
                    {collection.floorPrice > 0 && (
                      <span>Floor: {collection.floorPrice} ETH</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-400 py-8">
              No collections found
            </div>
          )}

          {displayedCollections.length < filteredCollections.length && (
            <div className="text-center py-4 text-gray-400 text-sm">
              Loading more...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
