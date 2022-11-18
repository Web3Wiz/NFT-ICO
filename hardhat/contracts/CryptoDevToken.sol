//SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ICryptoDev.sol";

contract CryptoDevToken is ERC20, Ownable {
    ICryptoDev ICryptoDevNFTContract;

    uint256 public maxTotalSupply = 10000 * 10**18;
    uint256 public freeTokensForOneNFT = 10 * 10**18;
    uint256 public tokenPrice = 0.00001 ether;

    mapping(uint256 => bool) public claimedTokenIDs;

    constructor(address _ICryptoDevNFTContract)
        ERC20("Crypto Dev Token", "CDT")
    {
        ICryptoDevNFTContract = ICryptoDev(_ICryptoDevNFTContract);
    }

    function claim() public {
        address sender = msg.sender;
        //lets check how many NFTs does claimer have?
        uint256 nftCount = ICryptoDevNFTContract.balanceOf(sender);

        require(nftCount > 0, "You don't own any Crypto Dev NFTs");

        uint256 unclaimedNFTs = 0;

        //Then check how many NFTs are alrady claimed
        for (uint256 i = 0; i < nftCount; i++) {
            uint256 tokenId = ICryptoDevNFTContract.tokenOfOwnerByIndex(
                sender,
                i
            );

            if (!claimedTokenIDs[tokenId]) {
                claimedTokenIDs[tokenId] = true;
                unclaimedNFTs++;
            }
        }

        require(
            unclaimedNFTs > 0,
            "Sender has already claimed all the tokens."
        );

        uint256 amount = unclaimedNFTs * freeTokensForOneNFT;

        //Then mint the amount of tokens for remaining NFTs
        _mint(sender, amount);
    }

    function mint(uint tokens) public payable {
        uint256 requiredEthers = tokens * tokenPrice;
        require(msg.value >= requiredEthers, "Ethers sent are insufficient");

        uint256 numOfTokens = tokens * 10**18;
        require(
            totalSupply() + numOfTokens < maxTotalSupply,
            "Can not mint more tokens. Max limit reached."
        );

        _mint(msg.sender, numOfTokens);
    }

    function withdraw() public onlyOwner {
        address _owner = owner();
        uint _amount = address(this).balance;
        (bool sent, ) = _owner.call{value: _amount}("");
        require(sent, "Failed to send ether");
    }

    receive() external payable {}

    fallback() external payable {}
}

/*
CryptoDevToken deployed address is:  0xF30180724781f58AC5d8E43df9ac5D88d334E332
*/

/*

Current gas price: 10109343009
Estimated gas: 2100276
Deployer balance:  3.653693786150234404
Deployment price:  0.021232410497570484
CryptoDevToken deployed address is:  0xa21192Aa7b552a4321496Dca68cF2A0dC449430a 

(Deployed only to rename maxTotalSupply. Otherwise last deployed contract is fine)

*/
