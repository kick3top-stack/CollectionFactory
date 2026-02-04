// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IFactory {
    function protocolMintFee() external view returns (uint256);
    function owner() external view returns (address);
}

contract NFTCollection is ERC721URIStorage, ERC2981, Ownable {
    uint256 private _nextTokenId = 1;
    address public immutable factory;
    /// @dev Collection-level metadata URI (e.g. IPFS JSON with name, description, image)
    string public collectionMetadataURI;

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        address creator_,
        address factory_
    ) ERC721(name_, symbol_) Ownable(creator_) {
        factory = factory_;
        collectionMetadataURI = baseURI_;
        // Sets a default royalty of 5% to the creator
        _setDefaultRoyalty(creator_, 500); 
    }

    function mint(address to, string calldata uri) external payable returns (uint256) {
        uint256 fee = IFactory(factory).protocolMintFee();
        require(msg.value >= fee, "Insufficient mint fee");

        // Pay Builder
        (bool success, ) = payable(IFactory(factory).owner()).call{value: fee}("");
        require(success, "Protocol fee failed");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        if (msg.value > fee) {
            (bool refund, ) = payable(msg.sender).call{value: msg.value - fee}("");
            require(refund, "Refund failed");
        }

        return tokenId;
    }

    // Fixed: Lists only the direct parents that implement supportsInterface
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // Fixed: Lists only the direct parent (ERC721URIStorage) as it already overrides ERC721
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
}