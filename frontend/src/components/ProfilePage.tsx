import { useState, useEffect } from 'react';
import { AppContextType } from '../App';
import { NFTCard } from './NFTCard';
import { Wallet, LogOut, Package, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { ethers } from 'ethers';
import { getMarketplaceContract } from '@/blockchain/contracts/marketplaceContract';
import { getCollectionFactoryContract } from '@/blockchain/contracts/factoryContract';
import { fetchOnChainTransactions, type OnChainTransaction } from '@/blockchain/utils/fetchOnChainTransactions';
import "../styles/ProfilePage.css"
import { getErrorMessage, isUserRejection } from '@/blockchain/utils/errorMessages';
import { WithdrawConfirmationModal, type WithdrawType } from './WithdrawConfirmationModal';

const TX_PER_PAGE = 10;

type ProfilePageProps = {
  context: AppContextType;
};

type Tab = 'owned' | 'history';

export function ProfilePage({ context }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<Tab>('owned');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isMarketplaceOwner, setIsMarketplaceOwner] = useState(false);
  const [isFactoryOwner, setIsFactoryOwner] = useState(false);
  const [pendingBalance, setPendingBalance] = useState<number>(0);
  const [platformFeesAmount, setPlatformFeesAmount] = useState<number>(0);
  const [factoryBalance, setFactoryBalance] = useState<number>(0);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawableAmount, setWithdrawableAmount] = useState<number>(0);
  const [withdrawType, setWithdrawType] = useState<WithdrawType>('balance');

  const [onChainTxs, setOnChainTxs] = useState<OnChainTransaction[]>([]);
  const [loadingTxs, setLoadingTxs] = useState(false);
  const [txPage, setTxPage] = useState(1);

  useEffect(() => {
    const fetchOwnerAndBalances = async () => {
      if (!context.wallet || typeof window.ethereum === 'undefined') return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const marketplace = getMarketplaceContract(provider);
        const factory = getCollectionFactoryContract(provider);
        const factoryAddress = await factory.getAddress();
        const [mktOwner, pending, fees, factoryOwner, balance] = await Promise.all([
          marketplace.owner(),
          marketplace.pendingWithdrawals(context.wallet),
          marketplace.platformFeesAccrued(),
          factory.owner(),
          provider.getBalance(factoryAddress),
        ]);
        setIsMarketplaceOwner(context.wallet.toLowerCase() === mktOwner.toLowerCase());
        setIsFactoryOwner(context.wallet.toLowerCase() === factoryOwner.toLowerCase());
        setPendingBalance(Number(ethers.formatEther(pending)));
        setPlatformFeesAmount(Number(ethers.formatEther(fees)));
        setFactoryBalance(Number(ethers.formatEther(balance)));
      } catch {
        setIsMarketplaceOwner(false);
        setIsFactoryOwner(false);
        setPendingBalance(0);
        setPlatformFeesAmount(0);
        setFactoryBalance(0);
      }
    };
    fetchOwnerAndBalances();
  }, [context.wallet]);

  // Load on-chain transactions when user is on history tab and wallet connected
  useEffect(() => {
    if (!context.wallet || activeTab !== 'history' || typeof window.ethereum === 'undefined') return;
    setLoadingTxs(true);
    const provider = new ethers.BrowserProvider(window.ethereum);
    fetchOnChainTransactions(provider, context.wallet)
      .then((list) => {
        setOnChainTxs(list);
        setTxPage(1);
      })
      .catch(() => setOnChainTxs([]))
      .finally(() => setLoadingTxs(false));
  }, [context.wallet, activeTab]);

  const totalTxPages = Math.max(1, Math.ceil(onChainTxs.length / TX_PER_PAGE));
  const paginatedTxs = onChainTxs.slice((txPage - 1) * TX_PER_PAGE, txPage * TX_PER_PAGE);

  const getTxNftDisplayName = (tx: OnChainTransaction) => {
    if (tx.nftCollectionAddress && tx.tokenId) {
      const found = context.nfts.find(
        (n) => n.collectionAddress?.toLowerCase() === tx.nftCollectionAddress?.toLowerCase() && n.tokenId === tx.tokenId
      );
      if (found?.name) return `${found.name} (#${tx.tokenId})`;
    }
    return tx.nft;
  };

  const shortAddress = (addr: string) => {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  /** Format ETH with up to 4 decimal places, minimal trailing zeros (e.g. 0.01 not 0.0100). */
  const formatWithdrawAmount = (amount: number) =>
    parseFloat(amount.toFixed(4)).toString();

  const handleWithdrawBalanceClick = async () => {
    if (!context.wallet) {
      context.showAlert('Please connect your wallet first', 'error');
      return;
    }
    if (pendingBalance <= 0) {
      context.showAlert('No pending balance to withdraw.', 'error');
      return;
    }
    setWithdrawableAmount(pendingBalance);
    setWithdrawType('balance');
    setShowWithdrawModal(true);
  };

  const handleWithdrawPlatformFeesClick = async () => {
    if (!context.wallet) {
      context.showAlert('Please connect your wallet first', 'error');
      return;
    }
    if (platformFeesAmount <= 0) {
      context.showAlert('No platform fees to withdraw.', 'error');
      return;
    }
    setWithdrawableAmount(platformFeesAmount);
    setWithdrawType('platformFees');
    setShowWithdrawModal(true);
  };

  const handleWithdrawFactoryFeesClick = async () => {
    if (!context.wallet) {
      context.showAlert('Please connect your wallet first', 'error');
      return;
    }
    if (factoryBalance <= 0) {
      context.showAlert('No factory fees to withdraw.', 'error');
      return;
    }
    setWithdrawableAmount(factoryBalance);
    setWithdrawType('factoryFees');
    setShowWithdrawModal(true);
  };

  const handleConfirmWithdraw = async () => {
    if (!context.wallet) {
      setShowWithdrawModal(false);
      return;
    }
    const provider = new ethers.BrowserProvider(window.ethereum!);
    const signer = await provider.getSigner();
    const marketplace = getMarketplaceContract(signer);
    setIsProcessing(true);
    try {
      if (withdrawType === 'factoryFees') {
        const factory = getCollectionFactoryContract(signer);
        const tx = await factory.withdrawAllFees();
        await tx.wait();
      } else if (withdrawType === 'platformFees') {
        const tx = await marketplace.withdrawPlatformFees();
        await tx.wait();
      } else {
        const tx = await marketplace.withdraw();
        await tx.wait();
      }
      setShowWithdrawModal(false);
      context.showAlert('Withdrawal successful!', 'success');
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const m = getMarketplaceContract(provider);
      const f = getCollectionFactoryContract(provider);
      const factoryAddress = await f.getAddress();
      const [pending, fees, balance] = await Promise.all([
        m.pendingWithdrawals(context.wallet),
        m.platformFeesAccrued(),
        provider.getBalance(factoryAddress),
      ]);
      setPendingBalance(Number(ethers.formatEther(pending)));
      setPlatformFeesAmount(Number(ethers.formatEther(fees)));
      setFactoryBalance(Number(ethers.formatEther(balance)));
    } catch (err) {
      if (!isUserRejection(err)) context.showAlert(getErrorMessage(err), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!context.wallet) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">
            Please connect your wallet to view your NFTs and transaction history
          </p>
          <button
            onClick={context.connectWallet}
            className="px-8 py-3 bg-[#00FFFF] text-black rounded-lg hover:bg-[#00DDDD] transition-colors font-medium"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  // Get user's NFTs (including unlisted ones)
  const ownedNFTs = context.nfts.filter(nft => nft.owner.toLowerCase() === context.wallet?.toLowerCase());
  const listedNFTs = ownedNFTs.filter(nft => nft.status === 'listed');
  const auctionNFTs = ownedNFTs.filter(nft => nft.status === 'auction');
  const unlistedNFTs = ownedNFTs.filter(nft => nft.status === 'unlisted');



  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Profile Header */}
        <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-[#00FFFF] to-[#0099CC] rounded-full" />
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    My Profile
                    {(isFactoryOwner || isMarketplaceOwner) && (
                      <span className="text-sm font-medium px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        (admin)
                      </span>
                    )}
                  </h1>
                  <p className="text-sm text-gray-400 font-mono">{context.wallet}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div>
                  <div className="text-sm text-gray-400">Total NFTs</div>
                  <div className="text-2xl font-bold">{ownedNFTs.length}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Listed</div>
                  <div className="text-2xl font-bold text-green-400">{listedNFTs.length}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">In Auction</div>
                  <div className="text-2xl font-bold text-red-400">{auctionNFTs.length}</div>
                </div>
              </div>
            </div>

            <div className="button-container flex flex-wrap gap-2">
              <button
                onClick={context.disconnectWallet}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut className="w-4 h-4" />
                Disconnect Wallet
              </button>
              <button
                onClick={handleWithdrawBalanceClick}
                disabled={isProcessing || showWithdrawModal}
                className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg font-medium bg-[#00FFFF] text-black hover:bg-[#00DDDD] transition-colors disabled:opacity-50 disabled:cursor-not-allowed sm:flex-row sm:gap-2"
              >
                <span>Withdraw</span>
                <span className="font-bold tabular-nums"> ({formatWithdrawAmount(pendingBalance)} ETH)</span>
              </button>
              {isMarketplaceOwner && (
                <button
                  onClick={handleWithdrawPlatformFeesClick}
                  disabled={isProcessing || showWithdrawModal}
                  className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed sm:flex-row sm:gap-2"
                >
                  <span>Withdraw platform fees</span>
                  <span className="font-bold tabular-nums"> {formatWithdrawAmount(platformFeesAmount)} ETH</span>
                </button>
              )}
              {isFactoryOwner && (
                <button
                  onClick={handleWithdrawFactoryFeesClick}
                  disabled={isProcessing || showWithdrawModal}
                  className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed sm:flex-row sm:gap-2"
                >
                  <span>Withdraw factory fees</span>
                  <span className="font-bold tabular-nums">{formatWithdrawAmount(factoryBalance)} (ETH)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('owned')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'owned'
                ? 'bg-[#00FFFF] text-black'
                : 'bg-[#1a1a1a] text-gray-400 hover:bg-white/5'
            }`}
          >
            <Package className="w-4 h-4" />
            My NFTs ({ownedNFTs.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-[#00FFFF] text-black'
                : 'bg-[#1a1a1a] text-gray-400 hover:bg-white/5'
            }`}
          >
            <History className="w-4 h-4" />
            Transaction History ({onChainTxs.length})
          </button>
        </div>

        {/* Content */}
        {activeTab === 'owned' && (
          <div>
            {ownedNFTs.length > 0 ? (
              <>
                {/* Listed NFTs */}
                {listedNFTs.length > 0 && (
                  <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6">Listed for Sale ({listedNFTs.length})</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                      {listedNFTs.map(nft => (
                        <NFTCard key={nft.id} nft={nft} context={context} compact />
                      ))}
                    </div>
                  </section>
                )}

                {/* Auction NFTs */}
                {auctionNFTs.length > 0 && (
                  <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6">In Auction ({auctionNFTs.length})</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                      {auctionNFTs.map(nft => (
                        <NFTCard key={nft.id} nft={nft} context={context} compact />
                      ))}
                    </div>
                  </section>
                )}

                {/* Unlisted NFTs */}
                {unlistedNFTs.length > 0 && (
                  <section>
                    <h2 className="text-2xl font-bold mb-6">Unlisted ({unlistedNFTs.length})</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                      {unlistedNFTs.map(nft => (
                        <NFTCard key={nft.id} nft={nft} context={context} compact />
                      ))}
                    </div>
                  </section>
                )}
              </>
            ) : (
              <div className="text-center py-16 bg-[#1a1a1a] rounded-xl border border-gray-800">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 text-lg mb-2">No NFTs yet</p>
                <p className="text-sm text-gray-500">Start minting or purchasing NFTs to build your collection</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            {loadingTxs ? (
              <div className="flex items-center justify-center py-16 bg-[#1a1a1a] rounded-xl border border-gray-800">
                <div className="w-8 h-8 border-2 border-[#00FFFF] border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-gray-400">Loading from chain...</span>
              </div>
            ) : onChainTxs.length > 0 ? (
              <>
                <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden">
                  {/* Desktop: table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#121212] border-b border-gray-800">
                        <tr>
                          <th className="text-left p-4">Type</th>
                          <th className="text-left p-4">NFT</th>
                          <th className="text-left p-4">From</th>
                          <th className="text-left p-4">To</th>
                          <th className="text-left p-4">Price</th>
                          <th className="text-left p-4">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedTxs.map((tx) => (
                          <tr key={tx.id} className="border-b border-gray-800">
                            <td className="p-4">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                tx.type === 'sale' ? 'bg-green-500/20 text-green-400' :
                                tx.type === 'purchase' ? 'bg-blue-500/20 text-blue-400' :
                                tx.type === 'mint' ? 'bg-purple-500/20 text-purple-400' :
                                'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                              </span>
                            </td>
                            <td className="p-4 font-medium">{getTxNftDisplayName(tx)}</td>
                            <td className="p-4 text-gray-400 font-mono text-sm">{shortAddress(tx.from)}</td>
                            <td className="p-4 text-gray-400 font-mono text-sm">{shortAddress(tx.to)}</td>
                            <td className="p-4 font-bold" style={{ color: tx.type === 'sale' ? '#00ffff' : tx.type === 'purchase' || tx.type === 'bid' || tx.type === 'mint' ? 'oklch(0.704 0.191 22.216)' : '#9ca3af' }}>{tx.price} ETH</td>
                            <td className="p-4 text-gray-400">
                              {tx.date.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile: cards */}
                  <div className="md:hidden divide-y divide-gray-800">
                    {paginatedTxs.map((tx) => (
                      <div key={tx.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium mb-1">{getTxNftDisplayName(tx)}</div>
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              tx.type === 'sale' ? 'bg-green-500/20 text-green-400' :
                              tx.type === 'purchase' ? 'bg-blue-500/20 text-blue-400' :
                              tx.type === 'mint' ? 'bg-purple-500/20 text-purple-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold" style={{ color: tx.type === 'sale' ? '#00ffff' : tx.type === 'purchase' || tx.type === 'bid' || tx.type === 'mint' ? 'oklch(0.704 0.191 22.216)' : '#9ca3af' }}>{tx.price} ETH</div>
                            <div className="text-sm text-gray-400">
                              {tx.date.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-4 text-sm text-gray-400 font-mono mt-2">
                          <span>From: {shortAddress(tx.from)}</span>
                          <span>To: {shortAddress(tx.to)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4 px-2">
                  <div className="text-sm text-gray-400">
                    Page {txPage} of {totalTxPages} ({onChainTxs.length} total)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                      disabled={txPage <= 1}
                      className="p-2 rounded-lg bg-[#1a1a1a] border border-gray-700 hover:border-[#00FFFF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxPage((p) => Math.min(totalTxPages, p + 1))}
                      disabled={txPage >= totalTxPages}
                      className="p-2 rounded-lg bg-[#1a1a1a] border border-gray-700 hover:border-[#00FFFF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-16 bg-[#1a1a1a] rounded-xl border border-gray-800">
                <History className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 text-lg mb-2">No transaction history</p>
                <p className="text-sm text-gray-500">Transactions are loaded from chain. Mint, buy, or bid to see activity.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Withdraw Confirmation Modal */}
      {showWithdrawModal && (
        <WithdrawConfirmationModal
          amount={withdrawableAmount}
          withdrawType={withdrawType}
          onConfirm={handleConfirmWithdraw}
          onCancel={() => {
            setShowWithdrawModal(false);
            setWithdrawableAmount(0);
          }}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}
