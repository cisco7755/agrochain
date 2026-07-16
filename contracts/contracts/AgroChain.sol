// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract AgroChain {
    // -------------------------------------------------------------------------
    // Enums
    // -------------------------------------------------------------------------

    enum Role {
        NONE,
        FARMER,
        PROCESSOR,
        DISTRIBUTOR,
        RETAILER,
        CERTIFIER
    }

    enum EventType {
        REGISTERED,
        HARVESTED,
        PROCESSED,
        PACKAGED,
        SHIPPED,
        RECEIVED,
        CERTIFIED,
        SOLD
    }

    // -------------------------------------------------------------------------
    // Structs
    // -------------------------------------------------------------------------

    struct Actor {
        address actorAddress;
        string name;
        Role role;
        string location;
        bool isActive;
        uint256 registeredAt;
    }

    struct ProductEvent {
        EventType eventType;
        address actor;
        string location;
        string notes;
        int256 temperature;
        uint256 humidity;
        uint256 timestamp;
    }

    struct Product {
        uint256 productId;
        string name;
        string productType;
        string batchNumber;
        address farmer;
        string farmLocation;
        bool isOrganic;
        bool isCertified;
        uint256 harvestDate;
        uint256 expiryDate;
        string description;
        uint256 createdAt;
        bool exists;
    }

    // -------------------------------------------------------------------------
    // State variables
    // -------------------------------------------------------------------------

    uint256 private productCounter;
    address public admin;

    mapping(uint256 => Product) public products;
    mapping(uint256 => ProductEvent[]) public productEvents;
    mapping(address => Actor) public actors;
    mapping(string => uint256) public batchToProductId;
    uint256[] public productIds;
    address[] public pendingActors;

    // Per-unit QR serialization: each physical package printed for a product
    // gets its own unit number (1..unitCount[productId]) so a cloned QR only
    // implicates one physical item, not the whole batch.
    mapping(uint256 => uint256) public unitCount;

    // -------------------------------------------------------------------------
    // Solidity events
    // -------------------------------------------------------------------------

    event ProductRegistered(
        uint256 indexed productId,
        string name,
        address indexed farmer,
        string batchNumber
    );

    event EventRecorded(
        uint256 indexed productId,
        EventType eventType,
        address indexed actor,
        uint256 timestamp
    );

    event ActorRegistered(
        address indexed actorAddress,
        string name,
        Role role
    );

    event ActorRegistrationRequested(
        address indexed actorAddress,
        string name,
        Role role
    );

    event ActorApproved(
        address indexed actorAddress,
        Role role
    );

    event ProductCertified(
        uint256 indexed productId,
        address indexed certifier
    );

    event UnitIssued(
        uint256 indexed productId,
        uint256 unitNumber,
        address indexed issuedBy,
        uint256 timestamp
    );

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyAdmin() {
        require(msg.sender == admin, "AgroChain: caller is not the admin");
        _;
    }

    modifier onlyRegisteredActor() {
        require(
            actors[msg.sender].isActive,
            "AgroChain: caller is not a registered active actor"
        );
        _;
    }

    modifier productExists(uint256 _productId) {
        require(
            products[_productId].exists,
            "AgroChain: product does not exist"
        );
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor() {
        admin = msg.sender;

        // Register the deployer as a default active actor (role NONE acts as
        // a privileged admin actor; role is set to NONE so the admin cannot
        // accidentally register products or certify unless also assigned a
        // proper role via registerActor).
        actors[msg.sender] = Actor({
            actorAddress: msg.sender,
            name: "Admin",
            role: Role.NONE,
            location: "N/A",
            isActive: true,
            registeredAt: block.timestamp
        });

        emit ActorRegistered(msg.sender, "Admin", Role.NONE);
    }

    // -------------------------------------------------------------------------
    // Actor management
    // -------------------------------------------------------------------------

    /**
     * @notice Register a new supply chain actor.
     * @param _actorAddress Wallet address of the actor.
     * @param _name        Human-readable name.
     * @param _role        Role enum value (must not be NONE).
     * @param _location    Geographic location / facility description.
     */
    function registerActor(
        address _actorAddress,
        string calldata _name,
        Role _role,
        string calldata _location
    ) external onlyAdmin {
        require(_actorAddress != address(0), "AgroChain: zero address");
        require(_role != Role.NONE, "AgroChain: role cannot be NONE");
        require(bytes(_name).length > 0, "AgroChain: name cannot be empty");

        actors[_actorAddress] = Actor({
            actorAddress: _actorAddress,
            name: _name,
            role: _role,
            location: _location,
            isActive: true,
            registeredAt: block.timestamp
        });

        emit ActorRegistered(_actorAddress, _name, _role);
    }

    /**
     * @notice Self-service registration request. Creates the actor record
     *         immediately but leaves it inactive (read-only) until an admin
     *         calls {approveActor} — the caller cannot register products,
     *         record events, or certify anything until then.
     * @dev    Callers may call this again to edit their pending request as
     *         long as they haven't been approved yet.
     * @param _name     Human-readable name.
     * @param _role     Requested role (must not be NONE).
     * @param _location Geographic location / facility description.
     */
    function requestRegistration(
        string calldata _name,
        Role _role,
        string calldata _location
    ) external {
        require(
            !actors[msg.sender].isActive,
            "AgroChain: already an active actor"
        );
        require(_role != Role.NONE, "AgroChain: role cannot be NONE");
        require(bytes(_name).length > 0, "AgroChain: name cannot be empty");

        if (actors[msg.sender].registeredAt == 0) {
            pendingActors.push(msg.sender);
        }

        actors[msg.sender] = Actor({
            actorAddress: msg.sender,
            name: _name,
            role: _role,
            location: _location,
            isActive: false,
            registeredAt: block.timestamp
        });

        emit ActorRegistrationRequested(msg.sender, _name, _role);
    }

    /**
     * @notice Approve a pending self-registration request, switching the
     *         actor from read-only to fully functional for their requested
     *         role.
     * @param _actorAddress Address that previously called {requestRegistration}.
     */
    function approveActor(address _actorAddress) external onlyAdmin {
        require(
            actors[_actorAddress].registeredAt != 0,
            "AgroChain: no registration request for this address"
        );
        require(
            !actors[_actorAddress].isActive,
            "AgroChain: actor is already active"
        );

        actors[_actorAddress].isActive = true;

        emit ActorApproved(_actorAddress, actors[_actorAddress].role);
        emit ActorRegistered(
            _actorAddress,
            actors[_actorAddress].name,
            actors[_actorAddress].role
        );
    }

    /**
     * @notice Return full details for every actor still awaiting approval.
     */
    function getPendingActors() external view returns (Actor[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < pendingActors.length; i++) {
            if (!actors[pendingActors[i]].isActive) count++;
        }

        Actor[] memory result = new Actor[](count);
        uint256 j = 0;
        for (uint256 i = 0; i < pendingActors.length; i++) {
            if (!actors[pendingActors[i]].isActive) {
                result[j] = actors[pendingActors[i]];
                j++;
            }
        }
        return result;
    }

    // -------------------------------------------------------------------------
    // Product registration
    // -------------------------------------------------------------------------

    /**
     * @notice Register a new agricultural product on-chain.
     * @dev    Only actors with the FARMER role may call this function.
     * @return productId The newly assigned product identifier.
     */
    function registerProduct(
        string calldata _name,
        string calldata _productType,
        string calldata _batchNumber,
        string calldata _farmLocation,
        bool _isOrganic,
        uint256 _harvestDate,
        uint256 _expiryDate,
        string calldata _description
    ) external onlyRegisteredActor returns (uint256 productId) {
        require(
            actors[msg.sender].role == Role.FARMER,
            "AgroChain: only FARMER role can register products"
        );
        require(bytes(_name).length > 0, "AgroChain: product name required");
        require(
            bytes(_batchNumber).length > 0,
            "AgroChain: batch number required"
        );
        require(
            batchToProductId[_batchNumber] == 0,
            "AgroChain: batch number already registered"
        );
        require(
            _expiryDate > _harvestDate,
            "AgroChain: expiry must be after harvest"
        );

        productCounter++;
        productId = productCounter;

        products[productId] = Product({
            productId: productId,
            name: _name,
            productType: _productType,
            batchNumber: _batchNumber,
            farmer: msg.sender,
            farmLocation: _farmLocation,
            isOrganic: _isOrganic,
            isCertified: false,
            harvestDate: _harvestDate,
            expiryDate: _expiryDate,
            description: _description,
            createdAt: block.timestamp,
            exists: true
        });

        batchToProductId[_batchNumber] = productId;
        productIds.push(productId);

        // Automatically record a REGISTERED event.
        productEvents[productId].push(
            ProductEvent({
                eventType: EventType.REGISTERED,
                actor: msg.sender,
                location: _farmLocation,
                notes: "Product registered on AgroChain",
                temperature: 0,
                humidity: 0,
                timestamp: block.timestamp
            })
        );

        emit ProductRegistered(productId, _name, msg.sender, _batchNumber);
        emit EventRecorded(
            productId,
            EventType.REGISTERED,
            msg.sender,
            block.timestamp
        );
    }

    // -------------------------------------------------------------------------
    // Supply chain event recording
    // -------------------------------------------------------------------------

    /**
     * @notice Record a supply chain event for an existing product.
     * @param _productId  Target product.
     * @param _eventType  Type of event (see EventType enum).
     * @param _location   Location where the event occurred.
     * @param _notes      Free-text notes.
     * @param _temperature Ambient temperature in tenths of a degree Celsius
     *                    (e.g. 215 = 21.5 °C; negative values allowed).
     * @param _humidity   Relative humidity percentage (0–100).
     */
    function recordEvent(
        uint256 _productId,
        EventType _eventType,
        string calldata _location,
        string calldata _notes,
        int256 _temperature,
        uint256 _humidity
    ) external onlyRegisteredActor productExists(_productId) {
        require(_humidity <= 100, "AgroChain: humidity must be 0-100");

        productEvents[_productId].push(
            ProductEvent({
                eventType: _eventType,
                actor: msg.sender,
                location: _location,
                notes: _notes,
                temperature: _temperature,
                humidity: _humidity,
                timestamp: block.timestamp
            })
        );

        emit EventRecorded(
            _productId,
            _eventType,
            msg.sender,
            block.timestamp
        );
    }

    // -------------------------------------------------------------------------
    // Certification
    // -------------------------------------------------------------------------

    /**
     * @notice Mark an organic product as certified.
     * @dev    Only actors with the CERTIFIER role may call this function.
     *         The product must have isOrganic == true.
     * @param _productId Target product identifier.
     */
    function certifyOrganic(
        uint256 _productId
    ) external onlyRegisteredActor productExists(_productId) {
        require(
            actors[msg.sender].role == Role.CERTIFIER,
            "AgroChain: only CERTIFIER role can certify products"
        );
        require(
            products[_productId].isOrganic,
            "AgroChain: product is not marked as organic"
        );
        require(
            !products[_productId].isCertified,
            "AgroChain: product is already certified"
        );

        products[_productId].isCertified = true;

        productEvents[_productId].push(
            ProductEvent({
                eventType: EventType.CERTIFIED,
                actor: msg.sender,
                location: actors[msg.sender].location,
                notes: "Organic certification granted",
                temperature: 0,
                humidity: 0,
                timestamp: block.timestamp
            })
        );

        emit ProductCertified(_productId, msg.sender);
        emit EventRecorded(
            _productId,
            EventType.CERTIFIED,
            msg.sender,
            block.timestamp
        );
    }

    // -------------------------------------------------------------------------
    // Unit serialization (anti-cloning)
    // -------------------------------------------------------------------------

    /**
     * @notice Issue a new serialized unit number for a product — call once
     *         per physical package printed, so each package's QR code
     *         encodes a distinct unit rather than sharing one QR across an
     *         entire batch. Any active registered actor may issue units
     *         (packaging commonly happens downstream of the farmer).
     * @param _productId Product this unit belongs to.
     * @return unitNumber The newly assigned unit number (1-indexed).
     */
    function issueUnit(
        uint256 _productId
    )
        external
        onlyRegisteredActor
        productExists(_productId)
        returns (uint256 unitNumber)
    {
        unitCount[_productId] += 1;
        unitNumber = unitCount[_productId];

        emit UnitIssued(_productId, unitNumber, msg.sender, block.timestamp);
    }

    // -------------------------------------------------------------------------
    // View functions
    // -------------------------------------------------------------------------

    /**
     * @notice Retrieve full product details.
     */
    function getProduct(
        uint256 _productId
    ) external view productExists(_productId) returns (Product memory) {
        return products[_productId];
    }

    /**
     * @notice Retrieve the complete event history for a product.
     */
    function getProductEvents(
        uint256 _productId
    )
        external
        view
        productExists(_productId)
        returns (ProductEvent[] memory)
    {
        return productEvents[_productId];
    }

    /**
     * @notice Look up a product ID by its batch number.
     * @return The product ID (0 if not found).
     */
    function getProductByBatch(
        string calldata _batchNumber
    ) external view returns (uint256) {
        return batchToProductId[_batchNumber];
    }

    /**
     * @notice Return the total number of registered products.
     */
    function getTotalProducts() external view returns (uint256) {
        return productCounter;
    }

    /**
     * @notice Retrieve actor details for a given address.
     */
    function getActor(
        address _actorAddress
    ) external view returns (Actor memory) {
        return actors[_actorAddress];
    }
}
