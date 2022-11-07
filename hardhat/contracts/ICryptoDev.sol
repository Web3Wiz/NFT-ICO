// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface ICryptoDev {
    function balanceOf(address account) external view returns (uint256 balance);

    function tokenOfOwnerByIndex(address owner, uint256 index)
        external
        view
        returns (uint256 tokenId);
}
