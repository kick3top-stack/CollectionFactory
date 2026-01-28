// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./NFTCollection.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CollectionFactory is Ownable {
    uint256 public creationFee = 0.05 ether;
    uint256 public protocolMintFee = 0.01 ether;

    event CollectionCreated(address indexed collection, string name, address indexed creator);

    constructor() Ownable(msg.sender) {}

    function createCollection(string calldata name, string calldata symbol, string calldata baseURI) external payable returns (address) {
        require(msg.value >= creationFee, "Insufficient fee");

        NFTCollection collection = new NFTCollection(name, symbol, baseURI, msg.sender, address(this));
        
        if (msg.value > creationFee) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - creationFee}("");
            require(success, "Refund failed");
        }

        emit CollectionCreated(address(collection), name, msg.sender);
        return address(collection);
    }

    function setFees(uint256 _creationFee, uint256 _mintFee) external onlyOwner {
        creationFee = _creationFee;
        protocolMintFee = _mintFee;
    }

    function withdrawAllFees() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }
}