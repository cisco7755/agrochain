// test/AgroChain.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

// Role enum values must mirror AgroChain.sol
const Role = {
  NONE: 0,
  FARMER: 1,
  PROCESSOR: 2,
  DISTRIBUTOR: 3,
  RETAILER: 4,
  CERTIFIER: 5,
};

// EventType enum values must mirror AgroChain.sol
const EventType = {
  REGISTERED: 0,
  HARVESTED: 1,
  PROCESSED: 2,
  PACKAGED: 3,
  SHIPPED: 4,
  RECEIVED: 5,
  CERTIFIED: 6,
  SOLD: 7,
};

// Helpers
const now = () => Math.floor(Date.now() / 1000);
const daysFromNow = (d) => now() + d * 86400;

describe("AgroChain", function () {
  let agroChain;
  let admin, farmer, distributor, certifier, stranger;

  // Product fixture used across multiple tests
  const productFixture = {
    name: "Arabica Coffee",
    productType: "Coffee",
    batchNumber: "BATCH-001",
    farmLocation: "Mount Kenya, Kenya",
    isOrganic: true,
    harvestDate: () => now() - 86400, // yesterday
    expiryDate: () => daysFromNow(365), // one year from now
    description: "Single-origin Arabica beans",
  };

  // -----------------------------------------------------------------------
  // Deploy a fresh contract before every test
  // -----------------------------------------------------------------------
  beforeEach(async function () {
    [admin, farmer, distributor, certifier, stranger] =
      await ethers.getSigners();

    const AgroChain = await ethers.getContractFactory("AgroChain");
    agroChain = await AgroChain.deploy();
    await agroChain.waitForDeployment();
  });

  // -----------------------------------------------------------------------
  // Deployment
  // -----------------------------------------------------------------------
  describe("Deployment", function () {
    it("should set the deployer as admin", async function () {
      expect(await agroChain.admin()).to.equal(admin.address);
    });

    it("should register the admin as an active actor on deployment", async function () {
      const actor = await agroChain.getActor(admin.address);
      expect(actor.isActive).to.equal(true);
      expect(actor.actorAddress).to.equal(admin.address);
      expect(actor.name).to.equal("Admin");
    });

    it("should start with zero products", async function () {
      expect(await agroChain.getTotalProducts()).to.equal(0);
    });
  });

  // -----------------------------------------------------------------------
  // Actor registration
  // -----------------------------------------------------------------------
  describe("registerActor", function () {
    it("should allow admin to register a new actor", async function () {
      await expect(
        agroChain
          .connect(admin)
          .registerActor(farmer.address, "Green Farm", Role.FARMER, "Nairobi")
      )
        .to.emit(agroChain, "ActorRegistered")
        .withArgs(farmer.address, "Green Farm", Role.FARMER);

      const actor = await agroChain.getActor(farmer.address);
      expect(actor.name).to.equal("Green Farm");
      expect(actor.role).to.equal(Role.FARMER);
      expect(actor.location).to.equal("Nairobi");
      expect(actor.isActive).to.equal(true);
    });

    it("should revert if a non-admin tries to register an actor", async function () {
      await expect(
        agroChain
          .connect(stranger)
          .registerActor(farmer.address, "Green Farm", Role.FARMER, "Nairobi")
      ).to.be.revertedWith("AgroChain: caller is not the admin");
    });

    it("should revert if role is NONE", async function () {
      await expect(
        agroChain
          .connect(admin)
          .registerActor(
            farmer.address,
            "Green Farm",
            Role.NONE,
            "Nairobi"
          )
      ).to.be.revertedWith("AgroChain: role cannot be NONE");
    });

    it("should revert if actor name is empty", async function () {
      await expect(
        agroChain
          .connect(admin)
          .registerActor(farmer.address, "", Role.FARMER, "Nairobi")
      ).to.be.revertedWith("AgroChain: name cannot be empty");
    });
  });

  // -----------------------------------------------------------------------
  // Product registration
  // -----------------------------------------------------------------------
  describe("registerProduct", function () {
    beforeEach(async function () {
      // Register farmer actor before each product test
      await agroChain
        .connect(admin)
        .registerActor(farmer.address, "Green Farm", Role.FARMER, "Nairobi");
    });

    it("should allow a FARMER to register a product", async function () {
      const hd = productFixture.harvestDate();
      const ed = productFixture.expiryDate();

      await expect(
        agroChain.connect(farmer).registerProduct(
          productFixture.name,
          productFixture.productType,
          productFixture.batchNumber,
          productFixture.farmLocation,
          productFixture.isOrganic,
          hd,
          ed,
          productFixture.description
        )
      )
        .to.emit(agroChain, "ProductRegistered")
        .withArgs(1, productFixture.name, farmer.address, productFixture.batchNumber);

      expect(await agroChain.getTotalProducts()).to.equal(1);

      const product = await agroChain.getProduct(1);
      expect(product.name).to.equal(productFixture.name);
      expect(product.batchNumber).to.equal(productFixture.batchNumber);
      expect(product.farmer).to.equal(farmer.address);
      expect(product.isOrganic).to.equal(true);
      expect(product.isCertified).to.equal(false);
      expect(product.exists).to.equal(true);
    });

    it("should automatically add a REGISTERED event when a product is registered", async function () {
      const hd = productFixture.harvestDate();
      const ed = productFixture.expiryDate();

      await agroChain.connect(farmer).registerProduct(
        productFixture.name,
        productFixture.productType,
        productFixture.batchNumber,
        productFixture.farmLocation,
        productFixture.isOrganic,
        hd,
        ed,
        productFixture.description
      );

      const events = await agroChain.getProductEvents(1);
      expect(events.length).to.equal(1);
      expect(events[0].eventType).to.equal(EventType.REGISTERED);
      expect(events[0].actor).to.equal(farmer.address);
    });

    it("should revert if a non-registered actor tries to register a product", async function () {
      const hd = productFixture.harvestDate();
      const ed = productFixture.expiryDate();

      await expect(
        agroChain.connect(stranger).registerProduct(
          productFixture.name,
          productFixture.productType,
          productFixture.batchNumber,
          productFixture.farmLocation,
          productFixture.isOrganic,
          hd,
          ed,
          productFixture.description
        )
      ).to.be.revertedWith(
        "AgroChain: caller is not a registered active actor"
      );
    });

    it("should revert if a non-FARMER registered actor tries to register a product", async function () {
      await agroChain
        .connect(admin)
        .registerActor(
          distributor.address,
          "Swift Logistics",
          Role.DISTRIBUTOR,
          "Mombasa"
        );

      const hd = productFixture.harvestDate();
      const ed = productFixture.expiryDate();

      await expect(
        agroChain.connect(distributor).registerProduct(
          productFixture.name,
          productFixture.productType,
          "BATCH-002",
          productFixture.farmLocation,
          productFixture.isOrganic,
          hd,
          ed,
          productFixture.description
        )
      ).to.be.revertedWith(
        "AgroChain: only FARMER role can register products"
      );
    });

    it("should revert if the batch number is already registered", async function () {
      const hd = productFixture.harvestDate();
      const ed = productFixture.expiryDate();

      await agroChain.connect(farmer).registerProduct(
        productFixture.name,
        productFixture.productType,
        productFixture.batchNumber,
        productFixture.farmLocation,
        productFixture.isOrganic,
        hd,
        ed,
        productFixture.description
      );

      await expect(
        agroChain.connect(farmer).registerProduct(
          "Another Product",
          productFixture.productType,
          productFixture.batchNumber, // duplicate batch
          productFixture.farmLocation,
          productFixture.isOrganic,
          hd,
          ed,
          productFixture.description
        )
      ).to.be.revertedWith("AgroChain: batch number already registered");
    });
  });

  // -----------------------------------------------------------------------
  // Record supply chain event
  // -----------------------------------------------------------------------
  describe("recordEvent", function () {
    beforeEach(async function () {
      // Register farmer and a distributor; farmer registers a product
      await agroChain
        .connect(admin)
        .registerActor(farmer.address, "Green Farm", Role.FARMER, "Nairobi");
      await agroChain
        .connect(admin)
        .registerActor(
          distributor.address,
          "Swift Logistics",
          Role.DISTRIBUTOR,
          "Mombasa"
        );

      await agroChain.connect(farmer).registerProduct(
        productFixture.name,
        productFixture.productType,
        productFixture.batchNumber,
        productFixture.farmLocation,
        productFixture.isOrganic,
        productFixture.harvestDate(),
        productFixture.expiryDate(),
        productFixture.description
      );
    });

    it("should allow a registered actor to record a supply chain event", async function () {
      await expect(
        agroChain
          .connect(distributor)
          .recordEvent(
            1,
            EventType.SHIPPED,
            "Mombasa Port, Kenya",
            "Loaded onto vessel MV Safari",
            220, // 22.0 °C
            65
          )
      )
        .to.emit(agroChain, "EventRecorded")
        .withArgs(1, EventType.SHIPPED, distributor.address, await getBlockTimestamp());

      const events = await agroChain.getProductEvents(1);
      // events[0] = REGISTERED (auto), events[1] = SHIPPED
      expect(events.length).to.equal(2);
      expect(events[1].eventType).to.equal(EventType.SHIPPED);
      expect(events[1].actor).to.equal(distributor.address);
      expect(events[1].location).to.equal("Mombasa Port, Kenya");
      expect(events[1].temperature).to.equal(220);
      expect(events[1].humidity).to.equal(65);
    });

    it("should revert when recording an event for a non-existent product", async function () {
      await expect(
        agroChain
          .connect(distributor)
          .recordEvent(99, EventType.SHIPPED, "Somewhere", "Notes", 0, 50)
      ).to.be.revertedWith("AgroChain: product does not exist");
    });

    it("should revert when humidity is out of range", async function () {
      await expect(
        agroChain
          .connect(distributor)
          .recordEvent(1, EventType.SHIPPED, "Port", "Notes", 0, 101)
      ).to.be.revertedWith("AgroChain: humidity must be 0-100");
    });
  });

  // -----------------------------------------------------------------------
  // Organic certification
  // -----------------------------------------------------------------------
  describe("certifyOrganic", function () {
    beforeEach(async function () {
      await agroChain
        .connect(admin)
        .registerActor(farmer.address, "Green Farm", Role.FARMER, "Nairobi");
      await agroChain
        .connect(admin)
        .registerActor(
          certifier.address,
          "OrganicCert Africa",
          Role.CERTIFIER,
          "Kampala"
        );

      await agroChain.connect(farmer).registerProduct(
        productFixture.name,
        productFixture.productType,
        productFixture.batchNumber,
        productFixture.farmLocation,
        true, // isOrganic
        productFixture.harvestDate(),
        productFixture.expiryDate(),
        productFixture.description
      );
    });

    it("should allow a CERTIFIER to certify an organic product", async function () {
      await expect(agroChain.connect(certifier).certifyOrganic(1))
        .to.emit(agroChain, "ProductCertified")
        .withArgs(1, certifier.address);

      const product = await agroChain.getProduct(1);
      expect(product.isCertified).to.equal(true);
    });

    it("should add a CERTIFIED event after certification", async function () {
      await agroChain.connect(certifier).certifyOrganic(1);

      const events = await agroChain.getProductEvents(1);
      const certEvent = events[events.length - 1];
      expect(certEvent.eventType).to.equal(EventType.CERTIFIED);
      expect(certEvent.actor).to.equal(certifier.address);
    });

    it("should revert if a non-CERTIFIER tries to certify", async function () {
      await expect(
        agroChain.connect(farmer).certifyOrganic(1)
      ).to.be.revertedWith(
        "AgroChain: only CERTIFIER role can certify products"
      );
    });

    it("should revert if the product is not organic", async function () {
      // Register a non-organic product
      await agroChain.connect(farmer).registerProduct(
        "Regular Wheat",
        "Grain",
        "BATCH-NON-ORGANIC",
        productFixture.farmLocation,
        false, // not organic
        productFixture.harvestDate(),
        productFixture.expiryDate(),
        "Non-organic wheat"
      );

      await expect(
        agroChain.connect(certifier).certifyOrganic(2)
      ).to.be.revertedWith("AgroChain: product is not marked as organic");
    });

    it("should revert if the product is already certified", async function () {
      await agroChain.connect(certifier).certifyOrganic(1);
      await expect(
        agroChain.connect(certifier).certifyOrganic(1)
      ).to.be.revertedWith("AgroChain: product is already certified");
    });
  });

  // -----------------------------------------------------------------------
  // getProductByBatch
  // -----------------------------------------------------------------------
  describe("getProductByBatch", function () {
    beforeEach(async function () {
      await agroChain
        .connect(admin)
        .registerActor(farmer.address, "Green Farm", Role.FARMER, "Nairobi");

      await agroChain.connect(farmer).registerProduct(
        productFixture.name,
        productFixture.productType,
        productFixture.batchNumber,
        productFixture.farmLocation,
        productFixture.isOrganic,
        productFixture.harvestDate(),
        productFixture.expiryDate(),
        productFixture.description
      );
    });

    it("should return the correct product ID for a known batch number", async function () {
      const productId = await agroChain.getProductByBatch(
        productFixture.batchNumber
      );
      expect(productId).to.equal(1);
    });

    it("should return 0 for an unknown batch number", async function () {
      const productId = await agroChain.getProductByBatch("UNKNOWN-BATCH");
      expect(productId).to.equal(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Utility — returns the timestamp of the latest mined block
// ---------------------------------------------------------------------------
async function getBlockTimestamp() {
  const block = await ethers.provider.getBlock("latest");
  return block.timestamp;
}
