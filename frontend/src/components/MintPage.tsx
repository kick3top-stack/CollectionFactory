import { useState, useEffect } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { AppContextType } from '../App';
import { CollectionSelectModal } from './CollectionSelectModal';
import { uploadToIPFS } from '@/blockchain/utils/ipfs';
import { uploadJSONToIPFS } from '@/blockchain/utils/ipfs';
import { getNFTContract } from '@/blockchain/contracts/nftContract';
import { getCollectionFactoryContract } from '@/blockchain/contracts/factoryContract';
import { ethers } from 'ethers';
import { getErrorMessage, isUserRejection } from '@/blockchain/utils/errorMessages';

type MintPageProps = {
  context: AppContextType;
};

export function MintPage({ context }: MintPageProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [nftName, setNftName] = useState('');
  const [nftDescription, setNftDescription] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [useExistingCollection, setUseExistingCollection] = useState(true);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mintFee, setMintFee] = useState('0.01');
  const [creationFee, setCreationFee] = useState('0.05');

  useEffect(() => {
    if (typeof window.ethereum === 'undefined') return;
    const loadFees = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const factory = getCollectionFactoryContract(provider);
        const [cf, mf] = await Promise.all([factory.creationFee(), factory.protocolMintFee()]);
        setCreationFee(ethers.formatEther(cf));
        setMintFee(ethers.formatEther(mf));
      } catch {
        // keep defaults
      }
    };
    loadFees();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/image\/(jpeg|png)/)) {
      context.showAlert('Please upload a JPEG or PNG image', 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      context.showAlert('Image size must be less than 5MB', 'error');
      return;
    }

    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleMint = async () => {
    // const nftContract = getNftContract();

  if (!context.wallet) {
    context.showAlert('Please connect your wallet first', 'error');
    return;
  }

  if (!imageFile) {
    context.showAlert('Please upload an image', 'error');
    return;
  }

  if (!nftName.trim()) {
    context.showAlert('Please enter NFT name', 'error');
    return;
  }

  if (!nftDescription.trim()) {
    context.showAlert('Please enter NFT description', 'error');
    return;
  }

  if (useExistingCollection && !selectedCollection) {
    context.showAlert('Please select a collection', 'error');
    return;
  }

  if (!useExistingCollection && !newCollectionName.trim()) {
    context.showAlert('Please enter collection name', 'error');
    return;
  }

  setIsProcessing(true);

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

    const imageURL = await uploadToIPFS(imageFile);
    if (!imageURL) throw new Error('Failed to upload image to IPFS.');

    const metadata = {
      name: nftName,
      description: nftDescription,
      image: imageURL,
      creator: context.wallet,
      createdAt: new Date().toISOString(),
    };
    const metadataURL = await uploadJSONToIPFS(metadata);
    if (!metadataURL) throw new Error('Failed to upload metadata to IPFS.');

    let collectionAddress: string;

    if (useExistingCollection && selectedCollection) {
      collectionAddress = selectedCollection;
    } else {
      const factory = getCollectionFactoryContract(signer);
      const feeWei = await factory.creationFee();
      const tx = await factory.createCollection(
        newCollectionName.trim(),
        newCollectionName.trim().replace(/\s+/g, '').slice(0, 10) || 'COL',
        '',
        { value: feeWei }
      );
      const receipt = await tx.wait();
      const factoryAddress = await factory.getAddress();
      for (const log of receipt?.logs ?? []) {
        if (log.address !== factoryAddress) continue;
        try {
          const parsed = factory.interface.parseLog({ topics: log.topics as string[], data: log.data });
          if (parsed?.name === 'CollectionCreated') {
            collectionAddress = parsed.args?.collection ?? parsed.args?.[0];
            break;
          }
        } catch {
          // skip
        }
      }
      if (!collectionAddress || !ethers.isAddress(collectionAddress)) throw new Error('Could not get new collection address');
      context.addCollection({
        id: collectionAddress,
        contractAddress: collectionAddress,
        name: newCollectionName.trim(),
        description: `${newCollectionName} collection`,
        image: imageURL,
        creator: context.wallet!,
        floorPrice: 0,
        nftCount: 0,
      });
    }

    const nftContract = getNFTContract(signer, collectionAddress);
    const mintFeeWei = await getCollectionFactoryContract(provider).protocolMintFee();
    const mintTx = await nftContract.mint(userAddress, metadataURL, { value: mintFeeWei });
    const mintReceipt = await mintTx.wait();
    let tokenIdStr = '1';
    for (const log of mintReceipt?.logs ?? []) {
      if (log.address !== collectionAddress) continue;
      try {
        const parsed = nftContract.interface.parseLog({ topics: log.topics as string[], data: log.data });
        if (parsed?.name === 'Transfer' && parsed.args?.tokenId != null) {
          tokenIdStr = String(parsed.args.tokenId);
          break;
        }
      } catch {
        // skip
      }
    }

    const newNFT = {
      id: `${collectionAddress}-${tokenIdStr}`,
      tokenId: tokenIdStr,
      collectionAddress,
      collection: collectionAddress,
      name: nftName,
      description: nftDescription,
      image: imageURL,
      creator: context.wallet!,
      owner: context.wallet!,
      status: 'unlisted' as const,
      createdAt: new Date(),
    };
    context.addNFT(newNFT);

    context.showAlert(useExistingCollection ? 'NFT minted successfully!' : 'Collection created and NFT minted!', 'success');
    setImageFile(null);
    setImagePreview('');
    setNftName('');
    setNftDescription('');
    setSelectedCollection('');
    setNewCollectionName('');
  } catch (err) {
    console.error(err);
    if (!isUserRejection(err)) {
      context.showAlert(getErrorMessage(err), 'error');
    }
  } finally {
    setIsProcessing(false);
  }
};


  const selectedCollectionData = context.collections.find(c => c.id === selectedCollection);

  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Mint New NFT</h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Image Upload Section */}
          <div>
            <label className="block text-sm font-medium mb-2">Upload Image *</label>
            {!imagePreview ? (
              <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-[#00FFFF] transition-colors">
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-400 mb-2">Click to upload image</p>
                  <p className="text-sm text-gray-500">JPEG or PNG (max 5MB)</p>
                </label>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full aspect-square object-cover rounded-xl"
                />
                <button
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview('');
                  }}
                  className="absolute top-3 right-3 p-2 bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Form Section */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">NFT Name *</label>
              <input
                type="text"
                value={nftName}
                onChange={(e) => setNftName(e.target.value)}
                placeholder="Enter NFT name"
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg focus:outline-none focus:border-[#00FFFF]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description *</label>
              <textarea
                value={nftDescription}
                onChange={(e) => setNftDescription(e.target.value)}
                placeholder="Enter NFT description"
                rows={4}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg focus:outline-none focus:border-[#00FFFF] resize-none"
              />
            </div>

            <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-700 space-y-2">
              {!useExistingCollection && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Creation Fee</span>
                  <span className="font-bold text-[#00FFFF]">{creationFee} ETH</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Mint Fee</span>
                <span className="font-bold text-[#00FFFF]">{mintFee} ETH</span>
              </div>
            </div>

            {/* Collection Selection */}
            <div>
              <label className="block text-sm font-medium mb-3">Collection *</label>
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setUseExistingCollection(true)}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    useExistingCollection
                      ? 'bg-[#00FFFF] text-black'
                      : 'bg-[#1a1a1a] text-gray-400 hover:bg-white/5'
                  }`}
                >
                  Existing Collection
                </button>
                <button
                  onClick={() => setUseExistingCollection(false)}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    !useExistingCollection
                      ? 'bg-[#00FFFF] text-black'
                      : 'bg-[#1a1a1a] text-gray-400 hover:bg-white/5'
                  }`}
                >
                  New Collection
                </button>
              </div>

              {useExistingCollection ? (
                <div>
                  {selectedCollectionData ? (
                    <div className="flex items-center gap-3 p-3 bg-[#1a1a1a] border border-gray-700 rounded-lg">
                      <img
                        src={selectedCollectionData.image}
                        alt={selectedCollectionData.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{selectedCollectionData.name}</div>
                        <div className="text-sm text-gray-400">
                          {selectedCollectionData.nftCount} items
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedCollection('')}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowCollectionModal(true)}
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg hover:border-[#00FFFF] transition-colors text-left text-gray-400"
                    >
                      Select a collection...
                    </button>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="Enter new collection name"
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg focus:outline-none focus:border-[#00FFFF]"
                />
              )}
            </div>

            {/* Mint Button */}
            <button
              onClick={handleMint}
              disabled={isProcessing}
              className={`w-full px-6 py-4 rounded-lg font-medium transition-all ${
                isProcessing
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-[#00FFFF] text-black hover:bg-[#00DDDD] hover:scale-105'
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  {useExistingCollection ? 'Minting...' : 'Creating Collection & Minting...'}
                </span>
              ) : (
                useExistingCollection ? 'Mint NFT' : 'Create Collection & Mint'
              )}
            </button>
          </div>
        </div>
      </div>

      {showCollectionModal && (
        <CollectionSelectModal
          collections={context.collections}
          onSelect={(collectionId) => {
            setSelectedCollection(collectionId);
            setShowCollectionModal(false);
          }}
          onClose={() => setShowCollectionModal(false)}
        />
      )}
    </div>
  );
}
