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
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const marketplaceContract = getMarketplaceContract(signer);
      const nftContract = getNFTContract(signer);

      // Fetch auction data for this NFT
      const auctionData = await marketplaceContract.auctions(nftContract.target, BigInt(nft.id));

      // Extract auction end time from contract (auctionData.endTime should be a BigNumber)
      const endTime = auctionData.endTime; // Should already be a BigNumber

      // Convert BigNumber to a number
      const endTimeInSeconds = Number(endTime); // Convert BigInt to number

      // Get current timestamp
      const currentTime = Math.floor(Date.now() / 1000); // Get current time in seconds

      // Check if auction has ended
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

    // Convert bidAmount to float and check for validity
    const bid = parseFloat(bidAmount);
    if (isNaN(bid) || bid <= (nft.highestBid || nft.minBid || 0)) {
      context.showAlert('Bid must be higher than current bid', 'error');
      return;
    }

    // Get the provider and signer from ethers.js
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const marketplaceContract = getMarketplaceContract(signer);
    const nftContract = getNFTContract(signer);

    // Get the marketplace contract

    try {
      // Send the bid transaction to the smart contract
      const tx = await marketplaceContract.bid(
        nftContract.target,
        nft.id, // Assuming nft.id is the token ID
        { value: ethers.parseEther(bidAmount) } // Sending the bid as the transaction value
      );

      // Wait for the transaction to be mined
      await tx.wait();

      // Update the context with the new highest bid
      context.updateNFT(nft.id, { highestBid: bid });

      // Show success alert
      context.showAlert('Bid placed successfully!', 'success');
      setBidAmount(''); // Reset bid input
      onClose(); // Close the modal or whatever you want after placing the bid
    } catch (error) {
      console.error('Error placing bid:', error);
      // Don't show error for user rejection
      if (!isUserRejection(error)) {
        context.showAlert(getErrorMessage(error), 'error');
      }
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
      const nftContract = getNFTContract(signer);

      const nftAddress = nftContract.target; // Ensure this is not null or undefined
      console.log("NFT Address: ", nftAddress); // Debugging line

      const tokenExists = await nftContract.ownerOf(nft.id);
      if (!tokenExists) {
        context.showAlert('This NFT no longer exists or has been burned.', 'error');
        setIsProcessing(false);
        return;
      }

      if (!nftAddress) {
        throw new Error("NFT contract address is missing or invalid");
      }

      // Check if the NFT is approved
      const isApproved = await nftContract.getApproved(BigInt(nft.id)) === marketplaceContract.target;
      const isApprovedForAll = await nftContract.isApprovedForAll(await signer.getAddress(), marketplaceContract.target);

      if (!isApproved && !isApprovedForAll) {
        const approvalTx = await nftContract.approve(marketplaceContract.target, BigInt(nft.id));
        await approvalTx.wait();
        context.showAlert('Marketplace contract approved!', 'success');
      }

      const priceInWei = ethers.parseEther(price.toString());

      console.log("Marketplace Contract Address: ", marketplaceContract.target); // Debugging line
      // Ensure marketplaceContract.address is not null or undefined
      if (!marketplaceContract.target) {
        throw new Error("Marketplace contract address is missing or invalid");
      }

      const tx = await marketplaceContract.listItem(nftAddress, BigInt(nft.id), priceInWei);
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
      const nftContract = getNFTContract(signer);

      const nftAddress = nftContract.target; // NFT contract address
      const tokenId = BigInt(nft.id);
      const minBidInWei = ethers.parseEther(minPrice.toString());

      // Calculate duration in seconds
      const duration = Math.floor((endDate.getTime() - Date.now()) / 1000);

      // Call the Marketplace contract
      const tx = await marketplaceContract.createAuction(
        nftAddress,
        tokenId,
        minBidInWei,
        BigInt(duration)
      );
      await tx.wait();

      // Update frontend state
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
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const marketplaceContract = getMarketplaceContract(signer);
    const nftContract = getNFTContract(signer);

    // Assuming that auction-related details (like token address and tokenId) are available
    const tx = await marketplaceContract.endAuction(nftContract.target, BigInt(nft.id));
    await tx.wait();  // Wait for the transaction to be confirmed

    context.updateNFT(nft.id, { status: 'unlisted' });
    context.showAlert('Auction ended successfully!', 'success');
  } catch (error) {
    console.error('Error ending auction:', error);
    if (!isUserRejection(error)) {
      context.showAlert(getErrorMessage(error), 'error');
    }
  }
};

  const handleCancelListing = async () => {
    if (!context.wallet) {
      context.showAlert('Please connect your wallet first', 'error');
      return;
    }

    setIsProcessing(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const marketplaceContract = getMarketplaceContract(signer);
      const nftContract = getNFTContract(signer);

      const nftAddress = nftContract.target; // Make sure this is the correct NFT contract address
      const tokenId = BigInt(nft.id); // Ensure token ID is in BigInt format

      // Check if the NFT is listed on the marketplace (this check is optional, based on your UX)
      const listing = await marketplaceContract.getListing(nftAddress, tokenId);
      if (!listing.price || listing.price === 0n) {
        context.showAlert('This NFT is not currently listed for sale. It may have already been sold or the listing was cancelled.', 'error');
        setIsProcessing(false);
        return;
      }

      // Call cancelListing on the smart contract to cancel the listing
      const tx = await marketplaceContract.cancelListing(nftAddress, tokenId);
      await tx.wait();

      // Update frontend context to reflect the status change
      context.updateNFT(nft.id, { status: 'unlisted', price: undefined });
      context.showAlert('Listing cancelled', 'success');
      onClose(); // Close the modal or UI component after successful cancellation
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

  const handleBuy = async () => {
    if (!context.wallet) {
      context.showAlert('Please connect your wallet first', 'error');
      return;
    }

    setIsProcessing(true);

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const marketplaceContract = getMarketplaceContract(signer);
    const nftContract = getNFTContract(signer);
    const priceInWei = ethers.parseEther(nft.price?.toString() || '0'); // Convert price to wei

    try {
      // Get the signer and check balance
      const signerAddress = await signer.getAddress(); // Get signer address
      const balance = await provider.getBalance(signerAddress); // Fetch balance using provider

      if (balance < priceInWei) {
        context.showAlert('Insufficient funds', 'error');
        return;
      }

      // Call the marketplace contract to execute the buy
      const tx = await marketplaceContract.buyItem(nftContract.target, nft.id, { value: priceInWei });
      await tx.wait(); // Wait for the transaction to be confirmed

      // Update the NFT status and owner
      context.updateNFT(nft.id, { status: 'unlisted', owner: context.wallet });
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
      const nftContract = getNFTContract(signer);

      // Verify ownership before transfer
      const currentOwner = await nftContract.ownerOf(BigInt(nft.id));
      if (currentOwner.toLowerCase() !== context.wallet?.toLowerCase()) {
        context.showAlert('You are not the owner of this NFT', 'error');
        setIsProcessing(false);
        return;
      }

      // Call the freeTransfer function on the NFT contract
      const tx = await nftContract.freeTransfer(BigInt(nft.id), transferRecipient);
      await tx.wait();

      // Update the NFT owner in the context
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
                {nft.owner.toLowerCase() === context.wallet.toLowerCase() && !auctionEnded && (  // Only show this button to the owner if the auction hasn't ended
                  <button
                    onClick={handleEndAuction}
                    disabled={isProcessing}
                    className={`w-full px-6 py-3 rounded-lg ${
                          isProcessing
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors font-medium flex-1 px-4 py-2 bg-[#00FFFF] text-black rounded-lg hover:bg-[#00DDDD] transition-colors font-medium'
                        }`}
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        {'Ending...'}
                      </span>
                    ) : (
                      'End Auction'
                    )}
              </button>
                )}
                {!isOwner && (
                  <>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Enter bid amount (ETH)"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-[#121212] border border-gray-700 rounded-lg focus:outline-none focus:border-[#00FFFF]"
                    />
                    <button
                      onClick={handlePlaceBid}
                      className="w-full px-6 py-3 bg-[#00FFFF] text-black rounded-lg hover:bg-[#00DDDD] transition-colors font-medium"
                    >
                      Place Bid
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

            {nft.status === 'listed' && isOwner && (
              <button
                onClick={handleCancelListing}
                className={`w-full px-6 py-3 rounded-lg  ${
                          isProcessing
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors font-medium flex-1 px-4 py-2 bg-[#00FFFF] text-black rounded-lg hover:bg-[#00DDDD] transition-colors font-medium'
                        }`}
              >
                {
                  `${
                  isProcessing ? 'Canceling...' : 'Cancel List'
                  }`
                }
              </button>
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
