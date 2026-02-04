// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Marketplace is ReentrancyGuard, Ownable {
    enum SaleType { FIXED, AUCTION }

    struct Listing {
        address seller;
        address nft;
        uint256 tokenId;
        uint256 price;
        SaleType saleType;
        bool active;
    }

    struct Auction {
        uint256 endTime;
        address highestBidder;
        uint256 highestBid;
        bool finalized;
    }

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Auction) public auctions;
    mapping(address => uint256) public pendingWithdrawals;

    uint256 public nextListingId = 1;
    uint256 public platformFeeBps = 250; // 2.5%
    uint256 public platformFeesAccrued;

    event ListingCreated(uint256 indexed listingId, address indexed seller, address indexed nft, uint256 tokenId, uint256 price, SaleType saleType);
    event Sale(uint256 indexed listingId, address indexed buyer, uint256 amount);
    event Bid(uint256 indexed listingId, address indexed bidder, uint256 amount);

    constructor() Ownable(msg.sender) {}

    function listFixedPrice(address nft, uint256 tokenId, uint256 price) external {
        _createListing(nft, tokenId, price, SaleType.FIXED, 0);
    }

    function listAuction(address nft, uint256 tokenId, uint256 minPrice, uint256 duration) external {
        _createListing(nft, tokenId, minPrice, SaleType.AUCTION, duration);
    }

    function _createListing(address nft, uint256 tokenId, uint256 price, SaleType saleType, uint256 duration) internal {
        IERC721(nft).transferFrom(msg.sender, address(this), tokenId);

        uint256 listingId = nextListingId++;
        listings[listingId] = Listing({
            seller: msg.sender,
            nft: nft,
            tokenId: tokenId,
            price: price,
            saleType: saleType,
            active: true
        });

        if (saleType == SaleType.AUCTION) {
            auctions[listingId] = Auction({
                endTime: block.timestamp + duration,
                highestBidder: address(0),
                highestBid: price,
                finalized: false
            });
        }
        emit ListingCreated(listingId, msg.sender, nft, tokenId, price, saleType);
    }

    function buy(uint256 listingId) external payable nonReentrant {
        Listing storage l = listings[listingId];
        require(l.active && l.saleType == SaleType.FIXED, "Invalid listing");
        require(msg.value >= l.price, "Insufficient payment");

        l.active = false;

        (address royaltyReceiver, uint256 royaltyAmount) = IERC2981(l.nft).royaltyInfo(l.tokenId, msg.value);
        if (royaltyAmount > 0) pendingWithdrawals[royaltyReceiver] += royaltyAmount;

        uint256 platformFee = (msg.value * platformFeeBps) / 10_000;
        platformFeesAccrued += platformFee;
        
        pendingWithdrawals[l.seller] += (msg.value - royaltyAmount - platformFee);
        IERC721(l.nft).transferFrom(address(this), msg.sender, l.tokenId);
        emit Sale(listingId, msg.sender, msg.value);
    }

    function bid(uint256 listingId) external payable nonReentrant {
        Auction storage a = auctions[listingId];
        Listing storage l = listings[listingId];

        require(l.active && block.timestamp < a.endTime, "Auction ended or inactive");
        require(msg.value > a.highestBid, "Bid too low");

        if (a.highestBidder != address(0)) {
            pendingWithdrawals[a.highestBidder] += a.highestBid;
        }

        a.highestBidder = msg.sender;
        a.highestBid = msg.value;
        emit Bid(listingId, msg.sender, msg.value);
    }

    function finalizeAuction(uint256 listingId) external nonReentrant {
        Auction storage a = auctions[listingId];
        Listing storage l = listings[listingId];

        require(block.timestamp >= a.endTime, "Auction still running");
        require(l.active, "Already finalized");

        l.active = false;
        a.finalized = true;

        if (a.highestBidder != address(0)) {
            (address royaltyReceiver, uint256 royaltyAmount) = IERC2981(l.nft).royaltyInfo(l.tokenId, a.highestBid);
            if (royaltyAmount > 0) pendingWithdrawals[royaltyReceiver] += royaltyAmount;

            uint256 platformFee = (a.highestBid * platformFeeBps) / 10_000;
            platformFeesAccrued += platformFee;

            pendingWithdrawals[l.seller] += (a.highestBid - royaltyAmount - platformFee);
            IERC721(l.nft).transferFrom(address(this), a.highestBidder, l.tokenId);
            emit Sale(listingId, a.highestBidder, a.highestBid);
        } else {
            IERC721(l.nft).transferFrom(address(this), l.seller, l.tokenId);
        }
    }

    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No funds to withdraw");
        pendingWithdrawals[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
    }

    function withdrawPlatformFees() external onlyOwner {
        uint256 amount = platformFeesAccrued;
        platformFeesAccrued = 0;
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Transfer failed");
    }
}