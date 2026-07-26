// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {LandTitleNFT} from "./LandTitleNFT.sol";

contract LandRegistry is AccessControl, Pausable {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant LEGAL_ROLE = keccak256("LEGAL_ROLE");
    bytes32 public constant JUDICIARY_ROLE = keccak256("JUDICIARY_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");

    enum TitleStatus { None, Active, Suspended, Disputed, Transferred, RevocationPending, Revoked }
    struct Title {
        bytes32 parcelId;
        bytes32 geometryHash;
        bytes32 metadataHash;
        uint256 tokenId;
        address owner;
        TitleStatus status;
    }
    struct Revocation {
        bytes32 reasonHash;
        bool governorApproved;
        bool judiciaryApproved;
    }

    LandTitleNFT public immutable titleToken;
    mapping(bytes32 => Title) public titles;
    mapping(uint256 => bytes32) public parcelByToken;
    mapping(bytes32 => Revocation) public revocations;
    uint256 public nextTokenId = 1;

    event TitleIssued(bytes32 indexed parcelId, uint256 indexed tokenId, address indexed owner);
    event TitleTransferred(bytes32 indexed parcelId, address indexed from, address indexed to);
    event DisputeStatusChanged(bytes32 indexed parcelId, bool disputed, bytes32 evidenceHash);
    event RevocationRequested(bytes32 indexed parcelId, bytes32 reasonHash);
    event RevocationJudiciallyApproved(bytes32 indexed parcelId, address judiciary);
    event TitleRevoked(bytes32 indexed parcelId);

    constructor(address admin, LandTitleNFT token) {
        titleToken = token;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
    }

    function issueTitle(
        bytes32 parcelId,
        bytes32 geometryHash,
        bytes32 metadataHash,
        address owner
    ) external onlyRole(REGISTRAR_ROLE) whenNotPaused returns (uint256 tokenId) {
        require(titles[parcelId].status == TitleStatus.None, "Parcel already titled");
        require(owner != address(0), "Invalid owner");
        tokenId = nextTokenId++;
        titles[parcelId] = Title(parcelId, geometryHash, metadataHash, tokenId, owner, TitleStatus.Active);
        parcelByToken[tokenId] = parcelId;
        titleToken.mint(owner, tokenId, _toHex(metadataHash));
        emit TitleIssued(parcelId, tokenId, owner);
    }

    function transferTitle(bytes32 parcelId, address newOwner)
        external onlyRole(REGISTRAR_ROLE) whenNotPaused
    {
        Title storage title = titles[parcelId];
        require(title.status == TitleStatus.Active || title.status == TitleStatus.Transferred, "Title locked");
        require(newOwner != address(0), "Invalid owner");
        address previous = title.owner;
        titleToken.registryTransfer(previous, newOwner, title.tokenId);
        title.owner = newOwner;
        title.status = TitleStatus.Transferred;
        emit TitleTransferred(parcelId, previous, newOwner);
    }

    function setDisputed(bytes32 parcelId, bool disputed, bytes32 evidenceHash)
        external onlyRole(LEGAL_ROLE)
    {
        Title storage title = titles[parcelId];
        require(title.status != TitleStatus.None && title.status != TitleStatus.Revoked, "Invalid title");
        title.status = disputed ? TitleStatus.Disputed : TitleStatus.Active;
        emit DisputeStatusChanged(parcelId, disputed, evidenceHash);
    }

    function requestRevocation(bytes32 parcelId, bytes32 reasonHash)
        external onlyRole(GOVERNOR_ROLE)
    {
        Title storage title = titles[parcelId];
        require(title.status != TitleStatus.None && title.status != TitleStatus.Revoked, "Invalid title");
        revocations[parcelId] = Revocation(reasonHash, true, false);
        title.status = TitleStatus.RevocationPending;
        emit RevocationRequested(parcelId, reasonHash);
    }

    function approveRevocation(bytes32 parcelId) external onlyRole(JUDICIARY_ROLE) {
        Revocation storage request = revocations[parcelId];
        require(request.governorApproved, "No governor request");
        request.judiciaryApproved = true;
        emit RevocationJudiciallyApproved(parcelId, msg.sender);
    }

    function executeRevocation(bytes32 parcelId) external onlyRole(REGISTRAR_ROLE) {
        Revocation memory request = revocations[parcelId];
        require(request.governorApproved && request.judiciaryApproved, "Approvals incomplete");
        titles[parcelId].status = TitleStatus.Revoked;
        emit TitleRevoked(parcelId);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    function _toHex(bytes32 value) private pure returns (string memory) {
        bytes16 symbols = "0123456789abcdef";
        bytes memory result = new bytes(64);
        for (uint256 i; i < 32; ++i) {
            result[i * 2] = symbols[uint8(value[i] >> 4)];
            result[i * 2 + 1] = symbols[uint8(value[i] & 0x0f)];
        }
        return string(result);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(AccessControl) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
