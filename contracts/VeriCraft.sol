// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VeriCraft
 * @notice Transparent Supply Chain Proof of Origin for Artisan Goods.
 * @dev Tracks verified artisans, authentic handcrafted products, and immutable
 *      custody handoff checkpoints on-chain.
 */
contract VeriCraft {
    /// @notice Contract administrator responsible for verifying artisan wallets.
    address public admin;

    /// @notice Total number of products minted on-chain (1-indexed IDs).
    uint256 public productCount;

    /// @notice Metadata describing a verified artisan craftsperson.
    struct Artisan {
        string name;
        string craftSpecialty;
        string location;
        bool isVerified;
    }

    /// @notice Single supply chain custody checkpoint in a product's journey.
    struct Checkpoint {
        address handler;
        string role;
        string location;
        string statusNote;
        uint256 timestamp;
    }

    /// @notice Core provenance record for a handcrafted artisan item.
    struct Product {
        uint256 id;
        string name;
        string materials;
        string imageHash;
        address artisanAddress;
        address currentOwner;
        uint256 createdAt;
        bool exists;
    }

    /// @notice Mapping from artisan wallet address to Artisan profile.
    mapping(address => Artisan) public artisans;

    /// @notice Mapping from product ID to Product record.
    mapping(uint256 => Product) public products;

    /// @notice Mapping from product ID to chronological list of custody checkpoints.
    mapping(uint256 => Checkpoint[]) private productHistory;

    /// @notice Ordered list of registered artisan addresses for directory lookups.
    address[] private artisanAddresses;

    /// @notice Emitted when an admin registers or updates a verified artisan.
    event ArtisanRegistered(
        address indexed artisanWallet,
        string name,
        string craftSpecialty,
        string location
    );

    /// @notice Emitted when a verified artisan mints a new product origin record.
    event ProductCreated(
        uint256 indexed id,
        string name,
        address indexed artisan
    );

    /// @notice Emitted whenever custody of a product is transferred to a new handler.
    event CustodyTransferred(
        uint256 indexed productId,
        address indexed previousOwner,
        address indexed nextOwner,
        string role,
        string location,
        string statusNote,
        uint256 timestamp
    );

    /// @dev Restricts execution to the contract deployer/administrator.
    modifier onlyAdmin() {
        require(msg.sender == admin, "VeriCraft: caller is not the admin");
        _;
    }

    /// @dev Restricts execution to wallets verified by the administrator.
    modifier onlyVerifiedArtisan() {
        require(
            artisans[msg.sender].isVerified,
            "VeriCraft: caller is not a verified artisan"
        );
        _;
    }

    /// @notice Sets the contract deployer as the initial administrator.
    constructor() {
        admin = msg.sender;
    }

    /**
     * @notice Registers and verifies an artisan wallet address.
     * @param _artisanWallet Wallet address of the craftsperson.
     * @param _name Full name of the artisan or workshop.
     * @param _craftSpecialty Traditional craft discipline (e.g., Channapatna Lacquerware).
     * @param _location Origin village, town, or craft cluster.
     */
    function registerArtisan(
        address _artisanWallet,
        string calldata _name,
        string calldata _craftSpecialty,
        string calldata _location
    ) external onlyAdmin {
        require(_artisanWallet != address(0), "VeriCraft: invalid artisan address");
        require(bytes(_name).length > 0, "VeriCraft: artisan name required");
        require(bytes(_craftSpecialty).length > 0, "VeriCraft: craft specialty required");
        require(bytes(_location).length > 0, "VeriCraft: origin location required");

        if (!artisans[_artisanWallet].isVerified) {
            artisanAddresses.push(_artisanWallet);
        }

        artisans[_artisanWallet] = Artisan({
            name: _name,
            craftSpecialty: _craftSpecialty,
            location: _location,
            isVerified: true
        });

        emit ArtisanRegistered(_artisanWallet, _name, _craftSpecialty, _location);
    }

    /**
     * @notice Creates a new authentic product record and logs the initial artisan checkpoint.
     * @param _name Name of the handcrafted product.
     * @param _materials Raw materials and natural dyes/techniques used.
     * @param _imageHash IPFS hash (e.g., ipfs://...) or image URL for product media.
     * @return newProductId Newly assigned 1-indexed product ID.
     */
    function createProduct(
        string calldata _name,
        string calldata _materials,
        string calldata _imageHash
    ) external onlyVerifiedArtisan returns (uint256 newProductId) {
        require(bytes(_name).length > 0, "VeriCraft: product name required");
        require(bytes(_materials).length > 0, "VeriCraft: materials required");

        productCount += 1;
        newProductId = productCount;

        products[newProductId] = Product({
            id: newProductId,
            name: _name,
            materials: _materials,
            imageHash: _imageHash,
            artisanAddress: msg.sender,
            currentOwner: msg.sender,
            createdAt: block.timestamp,
            exists: true
        });

        productHistory[newProductId].push(
            Checkpoint({
                handler: msg.sender,
                role: "Verified Artisan",
                location: artisans[msg.sender].location,
                statusNote: "Created by Artisan",
                timestamp: block.timestamp
            })
        );

        emit ProductCreated(newProductId, _name, msg.sender);
    }

    /**
     * @notice Transfers custody of an existing product to the next supply chain handler.
     * @param _productId On-chain ID of the product.
     * @param _nextOwner Wallet address of the receiving handler or buyer.
     * @param _role Supply chain role of the receiving handler (e.g., Logistics Partner).
     * @param _location City or facility where the handoff occurred.
     * @param _statusNote Inspection or transit note recorded with this handoff.
     */
    function transferCustody(
        uint256 _productId,
        address _nextOwner,
        string calldata _role,
        string calldata _location,
        string calldata _statusNote
    ) external {
        Product storage item = products[_productId];
        require(item.exists, "VeriCraft: product does not exist");
        require(
            msg.sender == item.currentOwner,
            "VeriCraft: only current owner can transfer custody"
        );
        require(_nextOwner != address(0), "VeriCraft: next owner cannot be zero address");
        require(
            _nextOwner != item.currentOwner,
            "VeriCraft: next owner must differ from current owner"
        );
        require(bytes(_role).length > 0, "VeriCraft: handler role required");
        require(bytes(_location).length > 0, "VeriCraft: location required");
        require(bytes(_statusNote).length > 0, "VeriCraft: status note required");

        address previousOwner = item.currentOwner;
        item.currentOwner = _nextOwner;

        productHistory[_productId].push(
            Checkpoint({
                handler: _nextOwner,
                role: _role,
                location: _location,
                statusNote: _statusNote,
                timestamp: block.timestamp
            })
        );

        emit CustodyTransferred(
            _productId,
            previousOwner,
            _nextOwner,
            _role,
            _location,
            _statusNote,
            block.timestamp
        );
    }

    /**
     * @notice Returns full product provenance details combined with the creator artisan's profile.
     * @param _productId On-chain ID of the product to query.
     */
    function getProductDetails(
        uint256 _productId
    )
        external
        view
        returns (
            uint256 id,
            string memory name,
            string memory materials,
            string memory imageHash,
            address artisanAddress,
            address currentOwner,
            uint256 createdAt,
            bool exists,
            string memory artisanName,
            string memory craftSpecialty,
            string memory originLocation
        )
    {
        Product storage item = products[_productId];
        Artisan storage maker = artisans[item.artisanAddress];

        return (
            item.id,
            item.name,
            item.materials,
            item.imageHash,
            item.artisanAddress,
            item.currentOwner,
            item.createdAt,
            item.exists,
            maker.name,
            maker.craftSpecialty,
            maker.location
        );
    }

    /**
     * @notice Returns the complete chronological custody checkpoint history for a product.
     * @param _productId On-chain ID of the product.
     */
    function getProductHistory(
        uint256 _productId
    ) external view returns (Checkpoint[] memory) {
        return productHistory[_productId];
    }

    /**
     * @notice Returns total product count so frontends can enumerate IDs 1..productCount.
     */
    function getAllProductIds() external view returns (uint256) {
        return productCount;
    }

    /**
     * @notice Returns all registered artisan wallet addresses for admin/registry views.
     */
    function getRegisteredArtisans() external view returns (address[] memory) {
        return artisanAddresses;
    }
}
