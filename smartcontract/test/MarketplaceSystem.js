const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFT Marketplace Comprehensive System Test", function () {
  let factory, marketplace, nftCollection;
  let owner, creator, buyer, bidder1, bidder2;
  
  const CREATION_FEE = ethers.parseEther("0.05");
  const MINT_FEE = ethers.parseEther("0.01");
  const PLATFORM_FEE_BPS = 250n; // 2.5%

  beforeEach(async function () {
    [owner, creator, buyer, bidder1, bidder2] = await ethers.getSigners();

    // 1. Deploy Factory
    const Factory = await ethers.getContractFactory("CollectionFactory");
    factory = await Factory.deploy();

    // 2. Deploy Marketplace
    const Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.deploy();

    // 3. Create a Collection via Factory
    const tx = await factory.connect(creator).createCollection(
      "Art Gallery",
      "AG",
      "ipfs://base/",
      { value: CREATION_FEE }
    );
    
    const receipt = await tx.wait();
    const event = receipt.logs.find(log => log.fragment && log.fragment.name === 'CollectionCreated');
    const collectionAddress = event.args[0];
    
    nftCollection = await ethers.getContractAt("NFTCollection", collectionAddress);
  });

  describe("1. Fee & Revenue Logic", function () {
    it("Should collect creation fees in Factory", async function () {
      expect(await ethers.provider.getBalance(await factory.getAddress())).to.equal(CREATION_FEE);
    });

    it("Should send mint fees directly to Builder (Factory Owner)", async function () {
      const initialBalance = await ethers.provider.getBalance(owner.address);
      
      await nftCollection.connect(creator).mint(creator.address, "1.json", { value: MINT_FEE });
      
      const finalBalance = await ethers.provider.getBalance(owner.address);
      // Builder gets exactly the mint fee
      expect(finalBalance - initialBalance).to.equal(MINT_FEE);
    });
  });

  describe("2. Fixed Price Sales with Royalties", function () {
    const PRICE = ethers.parseEther("1.0");

    beforeEach(async function () {
      await nftCollection.connect(creator).mint(creator.address, "1.json", { value: MINT_FEE });
      await nftCollection.connect(creator).approve(await marketplace.getAddress(), 1);
      await marketplace.connect(creator).listFixedPrice(await nftCollection.getAddress(), 1, PRICE);
    });

    it("Should distribute funds correctly (Seller, Royalty, Platform)", async function () {
      await marketplace.connect(buyer).buy(0, { value: PRICE });

      // Calculations:
      // Price: 1.0 ETH
      // Royalty (5%): 0.05 ETH
      // Platform (2.5%): 0.025 ETH
      // Seller Gets: 1.0 - 0.05 - 0.025 = 0.925 ETH
      
      const royaltyFee = (PRICE * 500n) / 10000n; // default 500 bps in NFT contract
      const platformFee = (PRICE * PLATFORM_FEE_BPS) / 10000n;
      const sellerPayout = PRICE - royaltyFee - platformFee;

      expect(await marketplace.pendingWithdrawals(creator.address)).to.equal(sellerPayout + royaltyFee); 
      // Note: creator is both seller and royalty receiver here
      
      expect(await marketplace.platformFeesAccrued()).to.equal(platformFee);
      expect(await nftCollection.ownerOf(1)).to.equal(buyer.address);
    });
  });

  describe("3. Auction Mechanics & Pull-Payments", function () {
    const START_PRICE = ethers.parseEther("0.5");

    beforeEach(async function () {
      await nftCollection.connect(creator).mint(creator.address, "auction.json", { value: MINT_FEE });
      await nftCollection.connect(creator).approve(await marketplace.getAddress(), 1);
      await marketplace.connect(creator).listAuction(await nftCollection.getAddress(), 1, START_PRICE, 3600);
    });

    it("Should allow outbidding and handle refunds via Pull Pattern", async function () {
      const bid1 = ethers.parseEther("0.6");
      await marketplace.connect(bidder1).bid(0, { value: bid1 });

      const bid2 = ethers.parseEther("0.7");
      await marketplace.connect(bidder2).bid(0, { value: bid2 });

      // Bidder 1 should have their 0.6 ETH in pending withdrawals
      expect(await marketplace.pendingWithdrawals(bidder1.address)).to.equal(bid1);
      
      // Bidder 1 can withdraw
      const balBefore = await ethers.provider.getBalance(bidder1.address);
      await marketplace.connect(bidder1).withdraw();
      const balAfter = await ethers.provider.getBalance(bidder1.address);
      expect(balAfter).to.be.gt(balBefore);
    });

    it("Should return NFT to seller if zero bids occur", async function () {
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");

      await marketplace.finalizeAuction(0);
      expect(await nftCollection.ownerOf(1)).to.equal(creator.address);
    });
  });

  describe("4. Security & Edge Cases", function () {
    it("Should prevent double-withdrawals (Reentrancy check)", async function () {
      await nftCollection.connect(creator).mint(creator.address, "sec.json", { value: MINT_FEE });
      await nftCollection.connect(creator).approve(await marketplace.getAddress(), 1);
      await marketplace.connect(creator).listFixedPrice(await nftCollection.getAddress(), 1, ethers.parseEther("1"));
      
      await marketplace.connect(buyer).buy(0, { value: ethers.parseEther("1") });

      await marketplace.connect(creator).withdraw();
      expect(await marketplace.pendingWithdrawals(creator.address)).to.equal(0);
      
      await expect(marketplace.connect(creator).withdraw()).to.be.revertedWith("No funds");
    });
  });
});