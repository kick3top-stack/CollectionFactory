import { useState, useEffect } from 'react';
import { Upload, X, Wallet } from 'lucide-react';
import { AppContextType } from '../App';
import { CollectionSelectModal } from './CollectionSelectModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/components/ui/utils';
import { uploadToIPFS, uploadJSONToIPFS } from '@/blockchain/utils/ipfs';
import { getNFTContract } from '@/blockchain/contracts/nftContract';
import { getCollectionFactoryContract } from '@/blockchain/contracts/factoryContract';
import { ethers } from 'ethers';
import { getErrorMessage, isUserRejection } from '@/blockchain/utils/errorMessages';

type CreatePageProps = {
  context: AppContextType;
};

export function CreatePage({ context }: CreatePageProps) {
  const [activeTab, setActiveTab] = useState('collection');

  // Collection tab state
  const [collectionName, setCollectionName] = useState('');
  const [collectionImageFile, setCollectionImageFile] = useState<File | null>(null);
  const [collectionImagePreview, setCollectionImagePreview] = useState<string>('');
  const [creationFee, setCreationFee] = useState('0.05');
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);

  // Mint tab state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [nftName, setNftName] = useState('');
  const [nftDescription, setNftDescription] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [mintFee, setMintFee] = useState('0.01');

  const eth = typeof window !== 'undefined' ? (window.ethereum as ethers.Eip1193Provider | undefined) : undefined;

  useEffect(() => {
    if (!eth) return;
    const loadFees = async () => {
      try {
        const provider = new ethers.BrowserProvider(eth);
        const factory = getCollectionFactoryContract(provider);
        const [cf, mf] = await Promise.all([factory.creationFee(), factory.protocolMintFee()]);
        setCreationFee(ethers.formatEther(cf));
        setMintFee(ethers.formatEther(mf));
      } catch {
        // keep defaults
      }
    };
    loadFees();
  }, [eth]);

  const handleCollectionImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/image\/(jpeg|png)/)) {
      context.showAlert('Please upload a JPEG or PNG image', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      context.showAlert('Image size must be less than 5MB', 'error');
      return;
    }
    setCollectionImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setCollectionImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleMintImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/image\/(jpeg|png)/)) {
      context.showAlert('Please upload a JPEG or PNG image', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      context.showAlert('Image size must be less than 5MB', 'error');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreateCollection = async () => {
    if (!context.wallet) {
      context.showAlert('Please connect your wallet first', 'error');
      return;
    }
    if (!collectionName.trim()) {
      context.showAlert('Please enter a collection name', 'error');
      return;
    }
    if (!eth) throw new Error('Wallet not available');

    setIsCreatingCollection(true);
    try {
      const signer = await new ethers.BrowserProvider(eth).getSigner();
      const factory = getCollectionFactoryContract(signer);
      const feeWei = await factory.creationFee();

      let imageURL = '';
      if (collectionImageFile) {
        imageURL = (await uploadToIPFS(collectionImageFile)) ?? '';
      }

      const collectionMetadata = {
        name: collectionName.trim(),
        description: `${collectionName.trim()} collection`,
        image: imageURL || '',
      };
      const collectionMetadataURI = (await uploadJSONToIPFS(collectionMetadata)) ?? '';

      const symbol = collectionName.trim().replace(/\s+/g, '').slice(0, 10) || 'COL';
      const tx = await factory.createCollection(collectionName.trim(), symbol, collectionMetadataURI, { value: feeWei });
      const receipt = await tx.wait();
      const factoryAddress = await factory.getAddress();
      let collectionAddress: string | undefined;
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
      if (!collectionAddress || !ethers.isAddress(collectionAddress)) {
        throw new Error('Could not get new collection address');
      }

      context.addCollection({
        id: collectionAddress,
        contractAddress: collectionAddress,
        name: collectionName.trim(),
        description: `${collectionName.trim()} collection`,
        image: imageURL,
        creator: context.wallet,
        floorPrice: 0,
        nftCount: 0,
      });

      context.showAlert('Collection created successfully!', 'success');
      setCollectionName('');
      setCollectionImageFile(null);
      setCollectionImagePreview('');
      setSelectedCollection(collectionAddress);
      setActiveTab('mint');
    } catch (err) {
      console.error(err);
      if (!isUserRejection(err)) context.showAlert(getErrorMessage(err), 'error');
    } finally {
      setIsCreatingCollection(false);
    }
  };

  const handleMint = async () => {
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
    if (!selectedCollection) {
      context.showAlert('Please select a collection', 'error');
      return;
    }
    if (!eth) throw new Error('Wallet not available');

    setIsMinting(true);
    try {
      const provider = new ethers.BrowserProvider(eth);
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

      const nftContract = getNFTContract(signer, selectedCollection);
      const mintFeeWei = await getCollectionFactoryContract(provider).protocolMintFee();
      const mintTx = await nftContract.mint(userAddress, metadataURL, { value: mintFeeWei });
      const mintReceipt = await mintTx.wait();
      let tokenIdStr = '1';
      for (const log of mintReceipt?.logs ?? []) {
        if (log.address !== selectedCollection) continue;
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

      context.addNFT({
        id: `${selectedCollection}-${tokenIdStr}`,
        tokenId: tokenIdStr,
        collectionAddress: selectedCollection,
        collection: selectedCollection,
        name: nftName,
        description: nftDescription,
        image: imageURL,
        creator: context.wallet!,
        owner: context.wallet!,
        status: 'unlisted',
        createdAt: new Date(),
      });

      context.showAlert('NFT minted successfully!', 'success');
      setImageFile(null);
      setImagePreview('');
      setNftName('');
      setNftDescription('');
      setSelectedCollection('');
    } catch (err) {
      console.error(err);
      if (!isUserRejection(err)) context.showAlert(getErrorMessage(err), 'error');
    } finally {
      setIsMinting(false);
    }
  };

  const selectedCollectionData = context.collections.find((c) => c.id === selectedCollection);

  if (!context.wallet) {
    return (
      <div className="app-connect-prompt">
        <div className="app-connect-prompt-inner">
          <Wallet className="app-connect-prompt-icon w-16 h-16" />
          <h2 className="app-connect-prompt-title">Connect Your Wallet</h2>
          <p className="app-connect-prompt-desc">
            Please connect your wallet to create collections and mint NFTs
          </p>
          <button type="button" onClick={context.connectWallet} className="app-btn app-btn--primary">
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 flex flex-col items-center">
      <div className="w-full max-w-2xl min-w-0">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2 w-full text-center sm:text-left">Create</h1>
        <p className="text-gray-400 mb-6 sm:mb-8 text-sm sm:text-base w-full text-center sm:text-left">Create a new collection or mint an NFT to an existing collection.</p>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-2xl">
          <TabsList className="w-full grid grid-cols-2 bg-[#1a1a1a] border border-gray-700 p-1 rounded-xl mb-6 sm:mb-8 h-12 sm:h-11">
            <TabsTrigger
              value="collection"
              className={cn(
                'cursor-pointer rounded-lg py-2 transition-colors duration-200',
                activeTab === 'collection'
                  ? 'bg-[#00FFFF] text-black shadow-md ring-2 ring-[#00FFFF]/50 ring-offset-2 ring-offset-[#1a1a1a] hover:bg-[#00DDDD]'
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
              )}
            >
              Collection
            </TabsTrigger>
            <TabsTrigger
              value="mint"
              className={cn(
                'cursor-pointer rounded-lg py-2 transition-colors duration-200',
                activeTab === 'mint'
                  ? 'bg-[#00FFFF] text-black shadow-md ring-2 ring-[#00FFFF]/50 ring-offset-2 ring-offset-[#1a1a1a] hover:bg-[#00DDDD]'
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
              )}
            >
              Mint NFT
            </TabsTrigger>
          </TabsList>

          <TabsContent value="collection" className="mt-0 outline-none">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Collection Name *</label>
                <input
                  type="text"
                  value={collectionName}
                  onChange={(e) => setCollectionName(e.target.value)}
                  placeholder="e.g. My Art Collection"
                  className="w-full min-w-0 px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg focus:outline-none focus:border-[#00FFFF] focus:ring-2 focus:ring-[#00FFFF]/20 transition-colors hover:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Cover Image (optional)</label>
                {!collectionImagePreview ? (
                  <label
                    htmlFor="collection-image-upload"
                    className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-colors duration-200 hover:border-[#00FFFF] hover:bg-[#1a1a1a]/80 group"
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleCollectionImageChange}
                      className="hidden"
                      id="collection-image-upload"
                    />
                    <Upload className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 text-gray-400 group-hover:text-[#00FFFF] transition-colors" />
                    <p className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors">Click to upload</p>
                    <p className="text-xs text-gray-500 mt-1">JPEG or PNG (max 5MB)</p>
                  </label>
                ) : (
                  <div className="relative inline-block">
                    <img src={collectionImagePreview} alt="Preview" className="w-32 h-32 sm:w-40 sm:h-40 object-cover rounded-xl" />
                    <button
                      type="button"
                      onClick={() => {
                        setCollectionImageFile(null);
                        setCollectionImagePreview('');
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-500 rounded-lg hover:bg-red-600 active:scale-95 transition-transform cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Creation Fee</span>
                  <span className="font-bold text-[#00FFFF]">{creationFee} ETH</span>
                </div>
              </div>
              <button
                onClick={handleCreateCollection}
                disabled={isCreatingCollection}
                className={`w-full min-h-[48px] px-6 py-4 rounded-xl font-medium transition-all duration-200 cursor-pointer disabled:cursor-not-allowed ${
                  isCreatingCollection ? 'bg-gray-600' : 'bg-[#00FFFF] text-black hover:bg-[#00DDDD] hover:shadow-lg hover:shadow-[#00FFFF]/20 active:scale-[0.99]'
                }`}
              >
                {isCreatingCollection ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : (
                  'Create Collection'
                )}
              </button>
            </div>
          </TabsContent>

          <TabsContent value="mint" className="mt-0 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <div className="min-w-0">
                <label className="block text-sm font-medium mb-2">Upload Image *</label>
                {!imagePreview ? (
                  <label
                    htmlFor="mint-image-upload"
                    className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-xl p-6 sm:p-8 min-h-[200px] sm:min-h-[240px] text-center cursor-pointer transition-colors duration-200 hover:border-[#00FFFF] hover:bg-[#1a1a1a]/80 group"
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleMintImageChange}
                      className="hidden"
                      id="mint-image-upload"
                    />
                    <Upload className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-400 group-hover:text-[#00FFFF] transition-colors" />
                    <p className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors">Click to upload image</p>
                    <p className="text-xs text-gray-500 mt-1">JPEG or PNG (max 5MB)</p>
                  </label>
                ) : (
                  <div className="relative w-full aspect-square max-w-sm mx-auto md:max-w-none">
                    <img src={imagePreview} alt="Preview" className="w-full aspect-square object-cover rounded-xl" />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview('');
                      }}
                      className="absolute top-2 right-2 sm:top-3 sm:right-3 p-2 bg-red-500 rounded-lg hover:bg-red-600 active:scale-95 transition-transform cursor-pointer"
                    >
                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-6 min-w-0">
                <div>
                  <label className="block text-sm font-medium mb-2">NFT Name *</label>
                  <input
                    type="text"
                    value={nftName}
                    onChange={(e) => setNftName(e.target.value)}
                    placeholder="Enter NFT name"
                    className="w-full min-w-0 px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg focus:outline-none focus:border-[#00FFFF] focus:ring-2 focus:ring-[#00FFFF]/20 transition-colors hover:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description *</label>
                  <textarea
                    value={nftDescription}
                    onChange={(e) => setNftDescription(e.target.value)}
                    placeholder="Enter NFT description"
                    rows={4}
                    className="w-full min-w-0 px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg focus:outline-none focus:border-[#00FFFF] focus:ring-2 focus:ring-[#00FFFF]/20 resize-none transition-colors hover:border-gray-600"
                  />
                </div>
                <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Mint Fee</span>
                    <span className="font-bold text-[#00FFFF]">{mintFee} ETH</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-3">Collection *</label>
                  {selectedCollectionData ? (
                    <div className="flex items-center gap-3 p-3 bg-[#1a1a1a] border border-gray-700 rounded-xl min-w-0">
                      <img
                        src={selectedCollectionData.image}
                        alt={selectedCollectionData.name}
                        className="w-12 h-12 rounded-lg object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{selectedCollectionData.name}</div>
                        <div className="text-sm text-gray-400">{selectedCollectionData.nftCount} items</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedCollection('')}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowCollectionModal(true)}
                      className="w-full min-h-[48px] px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-xl text-left text-gray-400 transition-colors duration-200 hover:border-[#00FFFF] hover:bg-[#252525] hover:text-gray-300 cursor-pointer"
                    >
                      Select a collection...
                    </button>
                  )}
                </div>
                <button
                  onClick={handleMint}
                  disabled={isMinting}
                  className={`w-full min-h-[48px] px-6 py-4 rounded-xl font-medium transition-all duration-200 cursor-pointer disabled:cursor-not-allowed ${
                    isMinting ? 'bg-gray-600' : 'bg-[#00FFFF] text-black hover:bg-[#00DDDD] hover:shadow-lg hover:shadow-[#00FFFF]/20 active:scale-[0.99]'
                  }`}
                >
                  {isMinting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Minting...
                    </span>
                  ) : (
                    'Mint NFT'
                  )}
                </button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {showCollectionModal && (
        <CollectionSelectModal
          collections={context.collections}
          onSelect={(id) => {
            setSelectedCollection(id);
            setShowCollectionModal(false);
          }}
          onClose={() => setShowCollectionModal(false)}
        />
      )}
    </div>
  );
}
