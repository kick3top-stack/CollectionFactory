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
    <nav className="app-nav">
      <div className="app-container px-3 sm:px-6 lg:px-8">
        <div className="app-nav-inner">
          <div className="app-nav-logo" onClick={() => handleNavigate('home')}>
            <div className="app-nav-logo-icon" />
            <span className="app-nav-logo-text hidden sm:block">NFT Marketplace</span>
          </div>

          <div className="app-nav-items">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`app-nav-item ${currentPage === item.id ? 'app-nav-item--active' : ''}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="app-wallet-area">
            {context.wallet ? (
              <div className="app-wallet-badge">
                <Wallet style={{ width: 16, height: 16, flexShrink: 0 }} />
                <span className="truncate">
                  {context.wallet.slice(0, 6)}...{context.wallet.slice(-4)}
                </span>
              </div>
            ) : (
              <button type="button" onClick={context.connectWallet} className="app-btn-connect">
                <Wallet style={{ width: 16, height: 16 }} />
                <span className="whitespace-nowrap">Connect Wallet</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="app-nav-mobile-trigger"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="app-nav-mobile md:hidden">
          <div className="app-nav-mobile-list">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`app-nav-mobile-item ${currentPage === item.id ? 'app-nav-mobile-item--active' : ''}`}
              >
                {item.label}
              </button>
            ))}
            {context.wallet ? (
              <div className="app-nav-mobile-wallet">
                <Wallet style={{ width: 16, height: 16, flexShrink: 0 }} />
                <span className="truncate font-mono text-sm">
                  {context.wallet.slice(0, 6)}...{context.wallet.slice(-4)}
                </span>
              </div>
            ) : (
              <button type="button" onClick={context.connectWallet} className="app-nav-mobile-connect">
                <Wallet style={{ width: 16, height: 16 }} />
                <span>Connect Wallet</span>
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
