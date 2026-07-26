// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract LandTitleNFT is ERC721, AccessControl {
    bytes32 public constant REGISTRY_ROLE = keccak256("REGISTRY_ROLE");
    mapping(uint256 => string) private _metadataHashes;

    constructor(address admin) ERC721("Anagu Land Title", "ALT") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function mint(address owner, uint256 tokenId, string calldata metadataDigest)
        external onlyRole(REGISTRY_ROLE)
    {
        _safeMint(owner, tokenId);
        _metadataHashes[tokenId] = metadataDigest;
    }

    function registryTransfer(address from, address to, uint256 tokenId)
        external onlyRole(REGISTRY_ROLE)
    {
        _transfer(from, to, tokenId);
    }

    function metadataHash(uint256 tokenId) external view returns (string memory) {
        _requireOwned(tokenId);
        return _metadataHashes[tokenId];
    }

    function approve(address, uint256) public pure override { revert("Registry approval required"); }
    function setApprovalForAll(address, bool) public pure override { revert("Registry approval required"); }
    function transferFrom(address, address, uint256) public pure override { revert("Registry transfer required"); }
    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert("Registry transfer required");
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, AccessControl) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
