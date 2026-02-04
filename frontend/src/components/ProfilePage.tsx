import { useState, useEffect } from 'react';
import { AppContextType } from '../App';
import { NFTCard } from './NFTCard';
import { Wallet, LogOut, Package, History } from 'lucide-react';
import { ethers } from 'ethers';
import { getMarketplaceContract } from '@/blockchain/contracts/marketplaceContract';
import { getCollectionFactoryContract } from '@/blockchain/contracts/factoryContract';
import "../styles/ProfilePage.css"
import { getErrorMessage, isUserRejection } from '@/blockchain/utils/errorMessages';
import { WithdrawConfirmationModal, type WithdrawType } from './WithdrawConfirmationModal';

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
                <span>Withdraw balance</span>
                <span className="font-bold tabular-nums">Available: {pendingBalance.toFixed(4)} ETH</span>
              </button>
              {isMarketplaceOwner && (
                <button
                  onClick={handleWithdrawPlatformFeesClick}
                  disabled={isProcessing || showWithdrawModal}
                  className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed sm:flex-row sm:gap-2"
                >
                  <span>Withdraw platform fees</span>
                  <span className="font-bold tabular-nums">Available: {platformFeesAmount.toFixed(4)} ETH</span>
                </button>
              )}
              {isFactoryOwner && (
                <button
                  onClick={handleWithdrawFactoryFeesClick}
                  disabled={isProcessing || showWithdrawModal}
                  className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed sm:flex-row sm:gap-2"
                >
                  <span>Withdraw factory fees</span>
                  <span className="font-bold tabular-nums">Available: {factoryBalance.toFixed(4)} ETH</span>
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
            Transaction History ({context.transactions.length})
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
            {context.transactions.length > 0 ? (
              <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden">
                {/* Desktop View */}
                <div className="hidden md:block">
                  <table className="w-full">
                    <thead className="bg-[#121212] border-b border-gray-800">
                      <tr>
                        <th className="text-left p-4">Type</th>
                        <th className="text-left p-4">NFT</th>
                        <th className="text-left p-4">Price</th>
                        <th className="text-left p-4">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {context.transactions.map(transaction => (
                        <tr key={transaction.id} className="border-b border-gray-800">
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              transaction.type === 'sale' ? 'bg-green-500/20 text-green-400' :
                              transaction.type === 'purchase' ? 'bg-blue-500/20 text-blue-400' :
                              transaction.type === 'mint' ? 'bg-purple-500/20 text-purple-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                            </span>
                          </td>
                          <td className="p-4 font-medium">{transaction.nft}</td>
                          <td className="p-4 text-[#00FFFF] font-bold">{transaction.price} ETH</td>
                          <td className="p-4 text-gray-400">
                            {transaction.date.toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden divide-y divide-gray-800">
                  {context.transactions.map(transaction => (
                    <div key={transaction.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium mb-1">{transaction.nft}</div>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            transaction.type === 'sale' ? 'bg-green-500/20 text-green-400' :
                            transaction.type === 'purchase' ? 'bg-blue-500/20 text-blue-400' :
                            transaction.type === 'mint' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-[#00FFFF] font-bold">{transaction.price} ETH</div>
                          <div className="text-sm text-gray-400">
                            {transaction.date.toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 bg-[#1a1a1a] rounded-xl border border-gray-800">
                <History className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 text-lg mb-2">No transaction history</p>
                <p className="text-sm text-gray-500">Your transactions will appear here</p>
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
