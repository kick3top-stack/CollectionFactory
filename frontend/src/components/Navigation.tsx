import { useState } from 'react';
import { Menu, X, Wallet } from 'lucide-react';
import { AppContextType } from '@/App';

type NavigationProps = {
  currentPage: string;
  onNavigate: (page: string) => void;
  context: AppContextType;
};

export function Navigation({ currentPage, onNavigate, context }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'collections', label: 'Collections' },
    { id: 'auctions', label: 'Auctions' },
    { id: 'create', label: 'Create' },
    { id: 'profile', label: 'My NFTs' },
  ];

  const handleNavigate = (page: string) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
  
    <>
      <nav className="sticky top-0 z-40 bg-[#121212]/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => handleNavigate('home')}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-[#00FFFF] to-[#0099CC] rounded-lg" />
              <span className="text-xl font-bold hidden sm:block">NFT Marketplace</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                    currentPage === item.id
                      ? 'bg-[#00FFFF]/10 text-[#00FFFF]'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Wallet Button - fixed width so Create/Auctions don't shift */}
            <div className="flex items-center gap-4 min-w-[180px] sm:min-w-[200px] justify-end">
              {context.wallet ? (
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#00FFFF]/10 border border-[#00FFFF]/30 rounded-lg shrink-0">
                  <Wallet className="w-4 h-4 text-[#00FFFF] shrink-0" />
                  <span className="text-sm text-[#00FFFF] truncate">
                    {context.wallet.slice(0, 6)}...{context.wallet.slice(-4)}
                  </span>
                </div>
              ) : (
                <button
                  onClick={context.connectWallet}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#00FFFF] text-black rounded-lg hover:bg-[#00DDDD] transition-colors shrink-0"
                >
                  <Wallet className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-medium whitespace-nowrap">Connect Wallet</span>
                </button>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-300 hover:text-white"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-800 bg-[#1a1a1a]">
            <div className="px-4 py-3 space-y-2">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                    currentPage === item.id
                      ? 'bg-[#00FFFF]/10 text-[#00FFFF]'
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              {!context.wallet && (
                <button
                  onClick={context.connectWallet}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#00FFFF] text-black rounded-lg hover:bg-[#00DDDD] transition-colors"
                >
                  <Wallet className="w-4 h-4" />
                  <span className="font-medium">Connect Wallet</span>
                </button>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
    
  );
}
