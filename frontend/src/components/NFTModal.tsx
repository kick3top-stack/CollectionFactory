import { useState, useEffect } from 'react';
import { X, Clock, User, Percent, Hammer, Tag, Calendar, Send } from 'lucide-react';
import { NFT, AppContextType } from '../App';
import { ethers } from 'ethers';
import { getMarketplaceContract } from '@/blockchain/contracts/marketplaceContract';
import { getNFTContract } from '@/blockchain/contracts/nftContract';
import { getErrorMessage, isUserRejection } from '@/blockchain/utils/errorMessages';

type NFTModalProps = {
  nft: NFT;
  context: AppContextType;
  onClose: () => void;
};

export function NFTModal({ nft, context, onClose }: NFTModalProps) {
  const [bidAmount, setBidAmount] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [auctionMinPrice, setAuctionMinPrice] = useState('');
  const [auctionEndDate, setAuctionEndDate] = useState('');
  const [showListForm, setShowListForm] = useState(false);
  const [showAuctionForm, setShowAuctionForm] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferRecipient, setTransferRecipient] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [auctionEnded, setAuctionEnded] = useState<boolean>(false);

  const isOwner = context.wallet?.toLowerCase() === nft.owner.toLowerCase();
  const royalty = 5; // Fixed 5% royalty

  const getTimeRemaining = (endTime: Date) => {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();
    
    if (diff <= 0) return 'Auction Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${days}d ${hours}h ${minutes}m`;
  };

  const checkAuctionStatus = async () => {
    if (nft.listingId == null) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const marketplaceContract = getMarketplaceContract(signer);
      const auctionData = await marketplaceContract.auctions(nft.listingId);
      const endTimeInSeconds = Number(auctionData.endTime);
      const currentTime = Math.floor(Date.now() / 1000);
      setAuctionEnded(currentTime >= endTimeInSeconds);
    } catch (error) {
      console.error('Error fetching auction status:', error);
    }
  };

  useEffect(() => {
    if (nft.status === 'auction') {
      checkAuctionStatus();
    }
  }, [nft]);

  const handlePlaceBid = async () => {
    if (!context.wallet) {
      context.showAlert('Please connect your wallet first', 'error');
      return;
    }

    const bidValue = parseFloat(bidAmount);
    if (isNaN(bidValue) || bidValue <= 0) {
      context.showAlert('Please enter a valid bid amount', 'error');
      return;
    }

    if (nft.listingId == null || nft.listingId === undefined) {
      context.showAlert('Listing not found', 'error');
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const marketplaceContract = getMarketplaceContract(signer);

    setIsProcessing(true);
    try {
      // Fetch current auction state from chain (listing might have changed)
      const [listing, auction] = await Promise.all([
        marketplaceContract.listings(nft.listingId),
        marketplaceContract.auctions(nft.listingId),
      ]);
      if (!listing.active) {
        context.showAlert('This auction is no longer active.', 'error');
        setIsProcessing(false);
        return;
      }
      const endTime = auction?.endTime != null ? Number(auction.endTime) : 0;
      if (endTime > 0 && Math.floor(Date.now() / 1000) >= endTime) {
        context.showAlert('This auction has ended.', 'error');
        setIsProcessing(false);
        return;
      }
      const minBidWei = auction?.highestBid ?? listing.price;
      const minBidEth = Number(ethers.formatEther(minBidWei));
      if (bidValue <= minBidEth) {
        context.showAlert(`Your bid must be higher than ${minBidEth.toFixed(4)} ETH.`, 'error');
        setIsProcessing(false);
        return;
      }

      const valueWei = ethers.parseEther(bidAmount.trim());
      const listingIdBigInt = BigInt(nft.listingId);
      const tx = await marketplaceContract.bid(listingIdBigInt, { value: valueWei });
      await tx.wait();
      context.updateNFT(nft.id, { highestBid: bidValue });
      context.addTransaction({ type: 'bid', nft: nft.name, price: bidValue, date: new Date() });

      context.showAlert('Bid placed successfully!', 'success');
      setBidAmount('');
      onClose();
    } catch (error) {
      console.error('Error placing bid:', error);
      if (!isUserRejection(error)) {
        context.showAlert(getErrorMessage(error), 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleList = async () => {
    if (!context.wallet) {
      context.showAlert('Please connect your wallet first', 'error');
      return;
    }

    const price = parseFloat(listPrice);
    if (isNaN(price) || price <= 0) {
      context.showAlert('Please enter a valid price', 'error');
      return;
    }

    setIsProcessing(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const marketplaceContract = getMarketplaceContract(signer);
      const nftContract = getNFTContract(signer, nft.collectionAddress);
      const marketplaceAddress = await marketplaceContract.getAddress();

      await nftContract.ownerOf(BigInt(nft.tokenId));

      const isApproved = await nftContract.getApproved(BigInt(nft.tokenId)) === marketplaceAddress;
      const signerAddress = await signer.getAddress();
      const isApprovedForAll = await nftContract.isApprovedForAll(signerAddress, marketplaceAddress);

      if (!isApproved && !isApprovedForAll) {
        const approvalTx = await nftContract.approve(marketplaceAddress, BigInt(nft.tokenId));
        await approvalTx.wait();
        context.showAlert('Marketplace approved', 'success');
      }

      const priceInWei = ethers.parseEther(price.toString());
      const tx = await marketplaceContract.listFixedPrice(nft.collectionAddress, BigInt(nft.tokenId), priceInWei);
      await tx.wait();

      context.updateNFT(nft.id, { status: 'listed', price });
      context.showAlert('NFT listed successfully!', 'success');
      onClose();
    } catch (err: any) {
      console.error(err);
      if (!isUserRejection(err)) {
        context.showAlert(getErrorMessage(err), 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateAuction = async () => {
    if (!context.wallet) {
      context.showAlert('Please connect your wallet first', 'error');
      return;
    }

    const minPrice = parseFloat(auctionMinPrice);
    if (isNaN(minPrice) || minPrice <= 0) {
      context.showAlert('Please enter a valid minimum price', 'error');
      return;
    }

    if (!auctionEndDate) {
      context.showAlert('Please select an end date', 'error');
      return;
    }

    const endDate = new Date(auctionEndDate);
    if (endDate <= new Date()) {
      context.showAlert('End date must be in the future', 'error');
      return;
    }

    setIsProcessing(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const marketplaceContract = getMarketplaceContract(signer);
      const nftContract = getNFTContract(signer, nft.collectionAddress);
      const marketplaceAddress = await marketplaceContract.getAddress();

      const isApproved = await nftContract.getApproved(BigInt(nft.tokenId)) === marketplaceAddress;
      const signerAddress = await signer.getAddress();
      const isApprovedForAll = await nftContract.isApprovedForAll(signerAddress, marketplaceAddress);
      if (!isApproved && !isApprovedForAll) {
        const approvalTx = await nftContract.approve(marketplaceAddress, BigInt(nft.tokenId));
        await approvalTx.wait();
      }

      const minPriceInWei = ethers.parseEther(minPrice.toString());
      const durationSeconds = Math.floor((endDate.getTime() - Date.now()) / 1000);
      const tx = await marketplaceContract.listAuction(
        nft.collectionAddress,
        BigInt(nft.tokenId),
        minPriceInWei,
        BigInt(durationSeconds)
      );
      await tx.wait();

      context.updateNFT(nft.id, {
        status: 'auction',
        minBid: minPrice,
        highestBid: minPrice,
        auctionEndTime: endDate,
      });

      context.showAlert('Auction created successfully!', 'success');
      onClose();
    } catch (err: any) {
      console.error(err);
      setIsProcessing(false);
      if (!isUserRejection(err)) {
        context.showAlert(getErrorMessage(err), 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEndAuction = async () => {
    if (nft.listingId == null) {
      context.showAlert('Listing not found', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const marketplaceContract = getMarketplaceContract(signer);
      const tx = await marketplaceContract.finalizeAuction(BigInt(nft.listingId));
      await tx.wait();
      context.updateNFT(nft.id, { status: 'unlisted', listingId: undefined, price: undefined, highestBid: undefined, auctionEndTime: undefined });
      context.showAlert('Auction finalized', 'success');
      onClose();
    } catch (error) {
      if (!isUserRejection(error)) context.showAlert(getErrorMessage(error), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelListing = () => {
    context.showAlert('Cancel listing is not supported by this marketplace.', 'error');
  };

  const handleBuy = async () => {
    if (!context.wallet) {
      context.showAlert('Please connect your wallet first', 'error');
      return;
    }

    setIsProcessing(true);

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const marketplaceContract = getMarketplaceContract(signer);
    const priceInWei = ethers.parseEther(nft.price?.toString() || '0');

    try {
      const signerAddress = await signer.getAddress(); // Get signer address
      const balance = await provider.getBalance(signerAddress); // Fetch balance using provider

      if (balance < priceInWei) {
        context.showAlert('Insufficient funds', 'error');
        return;
      }

      if (nft.listingId == null) {
        context.showAlert('Listing not found', 'error');
        return;
      }
      const tx = await marketplaceContract.buy(nft.listingId, { value: priceInWei });
      await tx.wait();
      context.updateNFT(nft.id, { status: 'unlisted', owner: context.wallet!, listingId: undefined, price: undefined });
      const priceNum = nft.price ?? 0;
      context.addTransaction({ type: 'purchase', nft: nft.name, price: priceNum, date: new Date() });
      context.showAlert('NFT purchased successfully!', 'success');
      
      // Close the modal or page after the transaction is successful
      onClose();
    } catch (err) {
      console.error('Error buying NFT:', err);
      if (!isUserRejection(err)) {
        context.showAlert(getErrorMessage(err), 'error');
      }
      setIsProcessing(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFreeTransfer = async () => {
    if (!context.wallet) {
      context.showAlert('Please connect your wallet first', 'error');
      return;
    }

    if (!transferRecipient.trim()) {
      context.showAlert('Please enter a recipient address', 'error');
      return;
    }

    // Validate Ethereum address
    if (!ethers.isAddress(transferRecipient)) {
      context.showAlert('Invalid Ethereum address', 'error');
      return;
    }

    // Check if recipient is the same as current owner
    if (transferRecipient.toLowerCase() === nft.owner.toLowerCase()) {
      context.showAlert('Cannot transfer to yourself', 'error');
      return;
    }

    setIsProcessing(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const nftContract = getNFTContract(signer, nft.collectionAddress);
      const signerAddress = await signer.getAddress();

      const currentOwner = await nftContract.ownerOf(BigInt(nft.tokenId));
      if (currentOwner.toLowerCase() !== context.wallet?.toLowerCase()) {
        context.showAlert('You are not the owner of this NFT', 'error');
        setIsProcessing(false);
        return;
      }

      const tx = await nftContract.transferFrom(signerAddress, transferRecipient, BigInt(nft.tokenId));
      await tx.wait();
      context.updateNFT(nft.id, { owner: transferRecipient });
      context.showAlert('NFT transferred successfully!', 'success');
      
      // Reset form and close modal
      setTransferRecipient('');
      setShowTransferForm(false);
      onClose();
    } catch (err: any) {
      console.error('Error transferring NFT:', err);
      if (!isUserRejection(err)) {
        context.showAlert(getErrorMessage(err), 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#1a1a1a] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-800">
        {/* Close button */}
        <div className="sticky top-0 bg-[#1a1a1a] border-b border-gray-800 p-4 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold">NFT Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 p-6">
          {/* Image */}
          <div className="aspect-square rounded-xl overflow-hidden">
            <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <h3 className="text-3xl font-bold mb-2">{nft.name}</h3>
              <p className="text-gray-400">{nft.description}</p>
            </div>

            {/* Status Badge */}
            <div className="inline-block">
              {nft.status === 'auction' && (
                <div className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                  <Hammer className="w-4 h-4" />
                  In Auction
                </div>
              )}
              {nft.status === 'listed' && (
                <div className="bg-green-500/20 text-green-400 px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Listed for Sale
                </div>
              )}
              {nft.status === 'unlisted' && (
                <div className="bg-gray-600/20 text-gray-400 px-4 py-2 rounded-lg font-medium">
                  Unlisted
                </div>
              )}
            </div>

            {/* Price/Bid Info */}
            {nft.status === 'auction' && (
              <div className="bg-[#121212] p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Current Bid</span>
                  <span className="text-2xl font-bold text-[#00FFFF]">
                    {nft.highestBid || nft.minBid} ETH
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Time Remaining
                  </span>
                  <span className="text-red-400 font-medium">
                    {nft.auctionEndTime && getTimeRemaining(nft.auctionEndTime)}
                  </span>
                </div>
              </div>
            )}

            {nft.status === 'listed' && (
              <div className="bg-[#121212] p-4 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Price</span>
                  <span className="text-2xl font-bold text-[#00FFFF]">{nft.price} ETH</span>
                </div>
              </div>
            )}

            {/* Creator & Royalty Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">Creator:</span>
                <span className="text-[#00FFFF] font-mono">{nft.creator}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">Owner:</span>
                <span className="text-[#00FFFF] font-mono">{nft.owner}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Percent className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">Royalties:</span>
                <span>{royalty}%</span>
              </div>
            </div>

            {/* Actions */}
            {nft.status === 'auction' && context.wallet && (
              <div className="space-y-3">
                {/* Once the auction has ended, anyone can finalize it (transfer NFT to winner, pay seller, etc.) */}
                {auctionEnded && (
                  <button
                    onClick={handleEndAuction}
                    disabled={isProcessing}
                    className={`w-full px-6 py-3 rounded-lg font-medium ${
                      isProcessing
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-[#00FFFF] text-black hover:bg-[#00DDDD] transition-colors'
                    }`}
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        Finalizing...
                      </span>
                    ) : (
                      'Finalize Auction'
                    )}
                  </button>
                )}
                {/* While the auction is running, anyone can place a bid */}
                {!auctionEnded && (
                  <>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Enter bid amount (ETH)"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      disabled={isProcessing}
                      className="w-full px-4 py-3 bg-[#121212] border border-gray-700 rounded-lg focus:outline-none focus:border-[#00FFFF] disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      onClick={handlePlaceBid}
                      disabled={isProcessing}
                      className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
                        isProcessing
                          ? 'bg-gray-600 cursor-not-allowed'
                          : 'bg-[#00FFFF] text-black hover:bg-[#00DDDD]'
                      }`}
                    >
                      {isProcessing ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          Placing bid...
                        </span>
                      ) : (
                        'Place Bid'
                      )}
                    </button>
                  </>
                )}
              </div>
            )}


            {nft.status === 'listed' && !isOwner && (
              <button
                onClick={handleBuy}
                disabled={isProcessing}
                className={`w-full px-6 py-3 rounded-lg  ${
                          isProcessing
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-[#00FFFF] text-black hover:bg-[#00DDDD] transition-colors font-medium'
                        }`}
              >
                {isProcessing ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        {'Buying...'}
                      </span>
                    ) : (
                      'Buy'
                    )}
              </button>
            )}

            {/* Cancel listing not supported by contract – button disabled with tooltip */}
            {nft.status === 'listed' && isOwner && (
              <p className="text-sm text-gray-500">Listing cannot be cancelled once created.</p>
            )}

            {nft.status === 'unlisted' && isOwner && (
              <div className="space-y-3">
                {!showListForm && !showAuctionForm && !showTransferForm && (
                  <>
                    <button
                      onClick={() => {
                        setShowListForm(true);
                        setShowAuctionForm(false);
                        setShowTransferForm(false);
                      }}
                      className="w-full px-6 py-3 bg-[#00FFFF] text-black rounded-lg hover:bg-[#00DDDD] transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <Tag className="w-4 h-4" />
                      List for Sale
                    </button>
                    <button
                      onClick={() => {
                        setShowAuctionForm(true);
                        setShowListForm(false);
                        setShowTransferForm(false);
                      }}
                      className="w-full px-6 py-3 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <Hammer className="w-4 h-4" />
                      Create Auction
                    </button>
                    <button
                      onClick={() => {
                        setShowTransferForm(true);
                        setShowListForm(false);
                        setShowAuctionForm(false);
                      }}
                      className="w-full px-6 py-3 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Free Transfer
                    </button>
                  </>
                )}

                {showListForm && (
                  <div className="space-y-3 p-4 bg-[#121212] rounded-xl">
                    <h4 className="font-bold">List for Fixed Price</h4>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Price (ETH)"
                      value={listPrice}
                      onChange={(e) => setListPrice(e.target.value)}
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg focus:outline-none focus:border-[#00FFFF]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleList}
                        disabled={isProcessing}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                          isProcessing
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-[#00FFFF] text-black hover:bg-[#00DDDD] transition-colors font-medium'
                        }`}
                      >
                        {isProcessing ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            {'Listing...'}
                          </span>
                        ) : (
                          'List NFT'
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowListForm(false);
                          setListPrice('');
                        }}
                        disabled={isProcessing}
                        className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {showAuctionForm && (
                  <div className="space-y-3 p-4 bg-[#121212] rounded-xl">
                    <h4 className="font-bold">Create Auction</h4>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Minimum bid (ETH)"
                      value={auctionMinPrice}
                      onChange={(e) => setAuctionMinPrice(e.target.value)}
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg focus:outline-none focus:border-[#00FFFF]"
                    />
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="datetime-local"
                        value={auctionEndDate}
                        onChange={(e) => setAuctionEndDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg focus:outline-none focus:border-[#00FFFF]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateAuction}
                        disabled={isProcessing}
                        className={`w-full px-6 py-4 rounded-lg font-medium transition-all ${
                          isProcessing
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-[#00FFFF] text-black hover:bg-[#00DDDD] transition-colors font-medium'
                        }`}
                      >
                        {isProcessing ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            {'Starting...'}
                          </span>
                        ) : (
                          'Start Auction'
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowAuctionForm(false);
                          setAuctionMinPrice('');
                          setAuctionEndDate('');
                        }}
                        disabled={isProcessing}
                        className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {showTransferForm && (
                  <div className="space-y-3 p-4 bg-[#121212] rounded-xl">
                    <h4 className="font-bold">Free Transfer</h4>
                    <p className="text-sm text-gray-400">
                      Transfer this NFT to another address for free. This action cannot be undone.
                    </p>
                    <input
                      type="text"
                      placeholder="Recipient address (0x...)"
                      value={transferRecipient}
                      onChange={(e) => setTransferRecipient(e.target.value)}
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 font-mono text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleFreeTransfer}
                        disabled={isProcessing}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                          isProcessing
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-purple-500 text-white hover:bg-purple-600 transition-colors'
                        }`}
                      >
                        {isProcessing ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            {'Transferring...'}
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <Send className="w-4 h-4" />
                            Transfer NFT
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowTransferForm(false);
                          setTransferRecipient('');
                        }}
                        disabled={isProcessing}
                        className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!context.wallet && nft.status === 'auction' && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
                Please connect your wallet to place a bid
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
