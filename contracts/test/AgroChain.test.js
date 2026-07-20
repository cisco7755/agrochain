// test/AgroChain.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

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
  // Self-service registration + admin approval
  // -----------------------------------------------------------------------
  describe("requestRegistration / approveActor", function () {
    it("should create an inactive actor on request, and list it as pending", async function () {
      await expect(
        agroChain
          .connect(farmer)
          .requestRegistration("Green Farm", Role.FARMER, "Nairobi")
      )
        .to.emit(agroChain, "ActorRegistrationRequested")
        .withArgs(farmer.address, "Green Farm", Role.FARMER);

      const actor = await agroChain.getActor(farmer.address);
      expect(actor.role).to.equal(Role.FARMER);
      expect(actor.isActive).to.equal(false);

      const pending = await agroChain.getPendingActors();
      expect(pending.length).to.equal(1);
      expect(pending[0].actorAddress).to.equal(farmer.address);
    });

    it("should block a pending actor from acting until approved", async function () {
      await agroChain
        .connect(farmer)
        .requestRegistration("Green Farm", Role.FARMER, "Nairobi");

      await expect(
        agroChain
          .connect(farmer)
          .registerProduct(
            productFixture.name,
            productFixture.productType,
            productFixture.batchNumber,
            productFixture.farmLocation,
            productFixture.isOrganic,
            productFixture.harvestDate(),
            productFixture.expiryDate(),
            productFixture.description
          )
      ).to.be.revertedWith(
        "AgroChain: caller is not a registered active actor"
      );
    });

    it("should let admin approve a pending actor, unlocking full functionality", async function () {
      await agroChain
        .connect(farmer)
        .requestRegistration("Green Farm", Role.FARMER, "Nairobi");

      await expect(agroChain.connect(admin).approveActor(farmer.address))
        .to.emit(agroChain, "ActorApproved")
        .withArgs(farmer.address, Role.FARMER);

      const actor = await agroChain.getActor(farmer.address);
      expect(actor.isActive).to.equal(true);
      expect(await agroChain.getPendingActors()).to.have.lengthOf(0);

      await expect(
        agroChain
          .connect(farmer)
          .registerProduct(
            productFixture.name,
            productFixture.productType,
            productFixture.batchNumber,
            productFixture.farmLocation,
            productFixture.isOrganic,
            productFixture.harvestDate(),
            productFixture.expiryDate(),
            productFixture.description
          )
      ).to.emit(agroChain, "ProductRegistered");
    });

    it("should revert if a non-admin tries to approve", async function () {
      await agroChain
        .connect(farmer)
        .requestRegistration("Green Farm", Role.FARMER, "Nairobi");

      await expect(
        agroChain.connect(stranger).approveActor(farmer.address)
      ).to.be.revertedWith("AgroChain: caller is not the admin");
    });

    it("should revert approving an address with no pending request", async function () {
      await expect(
        agroChain.connect(admin).approveActor(stranger.address)
      ).to.be.revertedWith(
        "AgroChain: no registration request for this address"
      );
    });

    it("should revert requesting registration if already an active actor", async function () {
      await agroChain
        .connect(admin)
        .registerActor(farmer.address, "Green Farm", Role.FARMER, "Nairobi");

      await expect(
        agroChain
          .connect(farmer)
          .requestRegistration("Green Farm 2", Role.CERTIFIER, "Mombasa")
      ).to.be.revertedWith("AgroChain: already an active actor");
    });

    it("should let a pending actor edit their request before approval", async function () {
      await agroChain
        .connect(farmer)
        .requestRegistration("Green Farm", Role.FARMER, "Nairobi");
      await agroChain
        .connect(farmer)
        .requestRegistration("Green Farm Updated", Role.CERTIFIER, "Mombasa");

      const actor = await agroChain.getActor(farmer.address);
      expect(actor.name).to.equal("Green Farm Updated");
      expect(actor.role).to.equal(Role.CERTIFIER);

      // Editing before approval must not create a duplicate pending entry.
      expect(await agroChain.getPendingActors()).to.have.lengthOf(1);
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
  // Certification (issue / revoke)
  // -----------------------------------------------------------------------
  const CertStandard = {
    ORGANIC: 0,
    FAIR_TRADE: 1,
    NON_GMO: 2,
    RAINFOREST_ALLIANCE: 3,
    HACCP: 4,
    ISO22000: 5,
    OTHER: 6,
  };

  describe("issueCertification / revokeCertification", function () {
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

    it("should allow a CERTIFIER to issue a certification and mark ORGANIC products certified", async function () {
      await expect(
        agroChain
          .connect(certifier)
          .issueCertification(
            1,
            CertStandard.ORGANIC,
            "USDA-ORG-2026-0143",
            "Passed inspection",
            "/static/certificates/report.pdf",
            0
          )
      )
        .to.emit(agroChain, "CertificationIssued")
        .withArgs(1, 1, certifier.address, CertStandard.ORGANIC, "USDA-ORG-2026-0143", 0);

      const product = await agroChain.getProduct(1);
      expect(product.isCertified).to.equal(true);

      const certs = await agroChain.getProductCertifications(1);
      expect(certs.length).to.equal(1);
      expect(certs[0].certNumber).to.equal("USDA-ORG-2026-0143");
      expect(certs[0].revoked).to.equal(false);
    });

    it("should not set isCertified for non-ORGANIC standards", async function () {
      await agroChain
        .connect(certifier)
        .issueCertification(1, CertStandard.FAIR_TRADE, "FT-001", "", "", 0);

      const product = await agroChain.getProduct(1);
      expect(product.isCertified).to.equal(false);
    });

    it("should allow multiple certifications on the same product", async function () {
      await agroChain
        .connect(certifier)
        .issueCertification(1, CertStandard.ORGANIC, "ORG-1", "", "", 0);
      await agroChain
        .connect(certifier)
        .issueCertification(1, CertStandard.NON_GMO, "NGMO-1", "", "", 0);

      const certs = await agroChain.getProductCertifications(1);
      expect(certs.length).to.equal(2);
    });

    it("should add a CERTIFIED event after issuance", async function () {
      await agroChain
        .connect(certifier)
        .issueCertification(1, CertStandard.ORGANIC, "ORG-1", "notes", "", 0);

      const events = await agroChain.getProductEvents(1);
      const certEvent = events[events.length - 1];
      expect(certEvent.eventType).to.equal(EventType.CERTIFIED);
      expect(certEvent.actor).to.equal(certifier.address);
    });

    it("should revert if a non-CERTIFIER tries to issue", async function () {
      await expect(
        agroChain
          .connect(farmer)
          .issueCertification(1, CertStandard.ORGANIC, "ORG-1", "", "", 0)
      ).to.be.revertedWith(
        "AgroChain: only CERTIFIER role can certify products"
      );
    });

    it("should revert if the certificate number is empty", async function () {
      await expect(
        agroChain
          .connect(certifier)
          .issueCertification(1, CertStandard.ORGANIC, "", "", "", 0)
      ).to.be.revertedWith("AgroChain: certificate number required");
    });

    it("should revert if expiry is in the past", async function () {
      await expect(
        agroChain
          .connect(certifier)
          .issueCertification(1, CertStandard.ORGANIC, "ORG-1", "", "", 1)
      ).to.be.revertedWith("AgroChain: expiry must be in the future");
    });

    it("should allow the issuing certifier to revoke their certification", async function () {
      await agroChain
        .connect(certifier)
        .issueCertification(1, CertStandard.ORGANIC, "ORG-1", "", "", 0);

      await expect(agroChain.connect(certifier).revokeCertification(1, "Fraudulent report"))
        .to.emit(agroChain, "CertificationRevoked")
        .withArgs(1, 1, certifier.address, "Fraudulent report");

      const certs = await agroChain.getProductCertifications(1);
      expect(certs[0].revoked).to.equal(true);
      expect(certs[0].revokeReason).to.equal("Fraudulent report");

      const product = await agroChain.getProduct(1);
      expect(product.isCertified).to.equal(false);
    });

    it("should allow the admin to revoke any certification", async function () {
      await agroChain
        .connect(certifier)
        .issueCertification(1, CertStandard.ORGANIC, "ORG-1", "", "", 0);
      await agroChain.connect(admin).revokeCertification(1, "Admin override");

      const certs = await agroChain.getProductCertifications(1);
      expect(certs[0].revoked).to.equal(true);
    });

    it("should revert if a stranger tries to revoke", async function () {
      await agroChain
        .connect(certifier)
        .issueCertification(1, CertStandard.ORGANIC, "ORG-1", "", "", 0);
      await expect(
        agroChain.connect(stranger).revokeCertification(1, "nope")
      ).to.be.revertedWith(
        "AgroChain: only the issuing certifier or admin can revoke"
      );
    });

    it("should revert if already revoked", async function () {
      await agroChain
        .connect(certifier)
        .issueCertification(1, CertStandard.ORGANIC, "ORG-1", "", "", 0);
      await agroChain.connect(certifier).revokeCertification(1, "first");
      await expect(
        agroChain.connect(certifier).revokeCertification(1, "second")
      ).to.be.revertedWith("AgroChain: certification already revoked");
    });

    it("should keep isCertified true if another active ORGANIC cert still covers the product", async function () {
      await agroChain
        .connect(certifier)
        .issueCertification(1, CertStandard.ORGANIC, "ORG-1", "", "", 0);
      await agroChain
        .connect(certifier)
        .issueCertification(1, CertStandard.ORGANIC, "ORG-2", "", "", 0);

      await agroChain.connect(certifier).revokeCertification(1, "renewed");

      const product = await agroChain.getProduct(1);
      expect(product.isCertified).to.equal(true);
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

  // -----------------------------------------------------------------------
  // Unit serialization (anti-cloning)
  // -----------------------------------------------------------------------
  describe("issueUnit", function () {
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

    it("should issue sequential unit numbers starting at 1", async function () {
      await expect(agroChain.connect(farmer).issueUnit(1))
        .to.emit(agroChain, "UnitIssued")
        .withArgs(1, 1, farmer.address, anyValue);

      await agroChain.connect(farmer).issueUnit(1);
      expect(await agroChain.unitCount(1)).to.equal(2);
    });

    it("should let any active registered actor issue a unit, not just the farmer", async function () {
      await agroChain
        .connect(admin)
        .registerActor(distributor.address, "Swift Logistics", Role.DISTRIBUTOR, "Mombasa");

      await agroChain.connect(distributor).issueUnit(1);
      expect(await agroChain.unitCount(1)).to.equal(1);
    });

    it("should revert if the caller is not a registered active actor", async function () {
      await expect(
        agroChain.connect(stranger).issueUnit(1)
      ).to.be.revertedWith("AgroChain: caller is not a registered active actor");
    });

    it("should revert if the product does not exist", async function () {
      await expect(
        agroChain.connect(farmer).issueUnit(999)
      ).to.be.revertedWith("AgroChain: product does not exist");
    });
  });

  // -----------------------------------------------------------------------
  // Chain-of-custody handoffs
  // -----------------------------------------------------------------------
  describe("initiateHandoff / confirmHandoff", function () {
    beforeEach(async function () {
      await agroChain
        .connect(admin)
        .registerActor(farmer.address, "Green Farm", Role.FARMER, "Nairobi");
      await agroChain
        .connect(admin)
        .registerActor(distributor.address, "Swift Logistics", Role.DISTRIBUTOR, "Mombasa");

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

    it("should initiate a handoff and record a SHIPPED event", async function () {
      await expect(
        agroChain
          .connect(farmer)
          .initiateHandoff(1, distributor.address, "DHL", "TRK-001", "Nairobi", 4, 65, "Leaving farm")
      )
        .to.emit(agroChain, "HandoffInitiated")
        .withArgs(1, 1, farmer.address, distributor.address, "DHL", "TRK-001");

      const events = await agroChain.getProductEvents(1);
      const shipped = events[events.length - 1];
      expect(shipped.eventType).to.equal(EventType.SHIPPED);
      expect(shipped.actor).to.equal(farmer.address);
    });

    it("should revert if the recipient is not a registered active actor", async function () {
      await expect(
        agroChain
          .connect(farmer)
          .initiateHandoff(1, stranger.address, "DHL", "TRK-001", "Nairobi", 4, 65, "")
      ).to.be.revertedWith("AgroChain: recipient is not a registered active actor");
    });

    it("should revert shipping to yourself", async function () {
      await expect(
        agroChain
          .connect(farmer)
          .initiateHandoff(1, farmer.address, "DHL", "TRK-001", "Nairobi", 4, 65, "")
      ).to.be.revertedWith("AgroChain: cannot ship to yourself");
    });

    it("should let the recipient confirm and record a RECEIVED event", async function () {
      await agroChain
        .connect(farmer)
        .initiateHandoff(1, distributor.address, "DHL", "TRK-001", "Nairobi", 4, 65, "Leaving farm");

      await expect(
        agroChain
          .connect(distributor)
          .confirmHandoff(1, "Mombasa", 6, 70, "Arrived intact", "/static/certificates/pod.pdf")
      )
        .to.emit(agroChain, "HandoffConfirmed")
        .withArgs(1, 1, distributor.address);

      const events = await agroChain.getProductEvents(1);
      const received = events[events.length - 1];
      expect(received.eventType).to.equal(EventType.RECEIVED);
      expect(received.actor).to.equal(distributor.address);

      const handoffs = await agroChain.getProductHandoffs(1);
      expect(handoffs[0].confirmed).to.equal(true);
      expect(handoffs[0].proofOfDeliveryUrl).to.equal("/static/certificates/pod.pdf");
    });

    it("should revert if someone other than the designated recipient tries to confirm", async function () {
      await agroChain
        .connect(farmer)
        .initiateHandoff(1, distributor.address, "DHL", "TRK-001", "Nairobi", 4, 65, "");

      await expect(
        agroChain.connect(stranger).confirmHandoff(1, "Mombasa", 6, 70, "", "")
      ).to.be.revertedWith(
        "AgroChain: only the designated recipient can confirm this handoff"
      );
    });

    it("should revert confirming an already-confirmed handoff", async function () {
      await agroChain
        .connect(farmer)
        .initiateHandoff(1, distributor.address, "DHL", "TRK-001", "Nairobi", 4, 65, "");
      await agroChain.connect(distributor).confirmHandoff(1, "Mombasa", 6, 70, "", "");

      await expect(
        agroChain.connect(distributor).confirmHandoff(1, "Mombasa", 6, 70, "", "")
      ).to.be.revertedWith("AgroChain: handoff already confirmed");
    });

    it("should list the handoff under the recipient's incoming handoffs", async function () {
      await agroChain
        .connect(farmer)
        .initiateHandoff(1, distributor.address, "DHL", "TRK-001", "Nairobi", 4, 65, "");

      const incoming = await agroChain.getIncomingHandoffs(distributor.address);
      expect(incoming.length).to.equal(1);
      expect(incoming[0].productId).to.equal(1);
      expect(incoming[0].confirmed).to.equal(false);
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
