import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import Base, SessionLocal, engine
from app.models import Actor, Product, Recall, SupplyChainEvent, User
from app.routes import actors, events, products, stats
from app.routes import auth, recalls, uploads, export
from app.services.blockchain import blockchain_service
from app.auth import hash_password

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "../uploads")


def _seed_database() -> None:
    db = SessionLocal()
    try:
        if db.query(Actor).count() > 0:
            return

        # ── Default admin user ────────────────────────────────────────────────
        admin = User(
            name="AgroChain Admin",
            email="admin@agrochain.io",
            hashed_password=hash_password("admin123"),
            role="ADMIN",
            organization="AgroChain",
        )
        db.add(admin)

        farmer_user = User(
            name="Green Valley Farms",
            email="farmer@agrochain.io",
            hashed_password=hash_password("farmer123"),
            role="FARMER",
            organization="Green Valley Farms",
            location="Nairobi, Kenya",
        )
        db.add(farmer_user)
        db.commit()

        # ── Actors ────────────────────────────────────────────────────────────
        farmer = Actor(name="Green Valley Farms", role="FARMER",
                       eth_address="0xABC0000000000000000000000000000000000001",
                       location="Nairobi, Kenya")
        distributor = Actor(name="FreshLogistics Ltd", role="DISTRIBUTOR",
                            eth_address="0xABC0000000000000000000000000000000000002",
                            location="Mombasa, Kenya")
        retailer = Actor(name="OrganicMart Superstore", role="RETAILER",
                         eth_address="0xABC0000000000000000000000000000000000003",
                         location="Kampala, Uganda")
        db.add_all([farmer, distributor, retailer])
        db.commit()

        # ── Product 1: Organic Tomatoes ───────────────────────────────────────
        tomatoes = Product(
            name="Organic Tomatoes", product_type="Vegetable",
            batch_number="BATCH-2024-001", farmer_name="Green Valley Farms",
            farmer_address=farmer.eth_address, farm_location="Nairobi, Kenya",
            farm_lat=-1.2921, farm_lng=36.8219,
            farm_size_acres=5.0, is_organic=True, is_certified=True,
            harvest_date=datetime(2024, 3, 10, tzinfo=timezone.utc),
            expiry_date=datetime(2026, 6, 25, tzinfo=timezone.utc),
            description="Freshly harvested organic tomatoes grown without pesticides.",
            blockchain_tx_hash=blockchain_service.generate_tx_hash(),
        )
        db.add(tomatoes)
        db.commit()
        db.refresh(tomatoes)
        tomatoes.contract_product_id = blockchain_service.simulate_contract_id(tomatoes.id)
        db.commit()

        # ── Product 2: Free-Range Eggs ────────────────────────────────────────
        eggs = Product(
            name="Free-Range Eggs", product_type="Poultry",
            batch_number="BATCH-2024-002", farmer_name="Green Valley Farms",
            farmer_address=farmer.eth_address, farm_location="Nairobi, Kenya",
            farm_lat=-1.2921, farm_lng=36.8219,
            farm_size_acres=2.5, is_organic=True, is_certified=True,
            harvest_date=datetime(2024, 3, 12, tzinfo=timezone.utc),
            expiry_date=datetime(2026, 5, 10, tzinfo=timezone.utc),
            description="Free-range eggs from pasture-raised hens with no added hormones.",
            blockchain_tx_hash=blockchain_service.generate_tx_hash(),
        )
        db.add(eggs)
        db.commit()
        db.refresh(eggs)
        eggs.contract_product_id = blockchain_service.simulate_contract_id(eggs.id)
        db.commit()

        # ── Product 3: Recalled (for demo) ───────────────────────────────────
        spinach = Product(
            name="Baby Spinach", product_type="Vegetable",
            batch_number="BATCH-2024-003", farmer_name="Green Valley Farms",
            farmer_address=farmer.eth_address, farm_location="Nakuru, Kenya",
            farm_lat=-0.3031, farm_lng=36.0800,
            farm_size_acres=3.0, is_organic=True, is_certified=False,
            is_recalled=True, recall_reason="E. coli contamination detected",
            recall_date=datetime(2024, 3, 20, tzinfo=timezone.utc),
            harvest_date=datetime(2024, 3, 15, tzinfo=timezone.utc),
            expiry_date=datetime(2026, 4, 1, tzinfo=timezone.utc),
            description="Baby spinach leaves.",
            blockchain_tx_hash=blockchain_service.generate_tx_hash(),
        )
        db.add(spinach)
        db.commit()
        db.refresh(spinach)
        spinach.contract_product_id = blockchain_service.simulate_contract_id(spinach.id)

        recall = Recall(
            product_id=spinach.id,
            reason="E. coli contamination detected in batch sample",
            severity="CRITICAL",
            issued_by="Kenya Food Safety Authority",
            details="Lab tests confirmed E. coli O157:H7. Consumers should not consume. Return to point of purchase.",
            blockchain_tx_hash=blockchain_service.generate_tx_hash(),
        )
        db.add(recall)
        db.commit()

        # ── Events for Tomatoes ───────────────────────────────────────────────
        db.add_all([
            SupplyChainEvent(product_id=tomatoes.id, event_type="HARVESTED",
                actor_name="Green Valley Farms", actor_role="FARMER",
                actor_address=farmer.eth_address, location="Nairobi, Kenya",
                location_lat=-1.2921, location_lng=36.8219,
                temperature=22.0, humidity=65.0,
                notes="Harvested at peak ripeness during morning hours.",
                blockchain_tx_hash=blockchain_service.generate_tx_hash(),
                timestamp=datetime(2024, 3, 10, 6, 0, tzinfo=timezone.utc)),
            SupplyChainEvent(product_id=tomatoes.id, event_type="CERTIFIED",
                actor_name="Kenya Organic Board", actor_role="CERTIFIER",
                actor_address="0xCERT000000000000000000000000000000000001",
                location="Nairobi, Kenya", location_lat=-1.2921, location_lng=36.8219,
                notes="Certified organic — inspection passed, no pesticide residue detected.",
                blockchain_tx_hash=blockchain_service.generate_tx_hash(),
                timestamp=datetime(2024, 3, 10, 10, 0, tzinfo=timezone.utc)),
            SupplyChainEvent(product_id=tomatoes.id, event_type="SHIPPED",
                actor_name="FreshLogistics Ltd", actor_role="DISTRIBUTOR",
                actor_address=distributor.eth_address,
                location="Nairobi → Mombasa, Kenya",
                location_lat=-4.0435, location_lng=39.6682,
                temperature=8.0, humidity=80.0,
                notes="Dispatched via refrigerated truck. Cold chain maintained throughout.",
                blockchain_tx_hash=blockchain_service.generate_tx_hash(),
                timestamp=datetime(2024, 3, 11, 8, 0, tzinfo=timezone.utc)),
            SupplyChainEvent(product_id=tomatoes.id, event_type="RECEIVED",
                actor_name="OrganicMart Superstore", actor_role="RETAILER",
                actor_address=retailer.eth_address, location="Kampala, Uganda",
                location_lat=0.3476, location_lng=32.5825,
                temperature=7.5, humidity=78.0,
                notes="Received in good condition. All packages intact.",
                blockchain_tx_hash=blockchain_service.generate_tx_hash(),
                timestamp=datetime(2024, 3, 12, 9, 0, tzinfo=timezone.utc)),
        ])

        # ── Events for Eggs ───────────────────────────────────────────────────
        db.add_all([
            SupplyChainEvent(product_id=eggs.id, event_type="HARVESTED",
                actor_name="Green Valley Farms", actor_role="FARMER",
                actor_address=farmer.eth_address, location="Nairobi, Kenya",
                location_lat=-1.2921, location_lng=36.8219,
                temperature=20.0, humidity=55.0,
                notes="Collected from free-range hens. Cleaned and graded on-site.",
                blockchain_tx_hash=blockchain_service.generate_tx_hash(),
                timestamp=datetime(2024, 3, 12, 7, 0, tzinfo=timezone.utc)),
            SupplyChainEvent(product_id=eggs.id, event_type="PACKAGED",
                actor_name="Green Valley Farms", actor_role="FARMER",
                actor_address=farmer.eth_address, location="Nairobi, Kenya",
                location_lat=-1.2921, location_lng=36.8219,
                temperature=18.0, humidity=55.0,
                notes="Packaged in biodegradable cartons of 12.",
                blockchain_tx_hash=blockchain_service.generate_tx_hash(),
                timestamp=datetime(2024, 3, 12, 9, 0, tzinfo=timezone.utc)),
            SupplyChainEvent(product_id=eggs.id, event_type="SHIPPED",
                actor_name="FreshLogistics Ltd", actor_role="DISTRIBUTOR",
                actor_address=distributor.eth_address,
                location="Nairobi → Kampala, Uganda",
                location_lat=0.3476, location_lng=32.5825,
                temperature=10.0, humidity=60.0,
                notes="Shipped via temperature-controlled van overnight.",
                blockchain_tx_hash=blockchain_service.generate_tx_hash(),
                timestamp=datetime(2024, 3, 13, 6, 0, tzinfo=timezone.utc)),
            SupplyChainEvent(product_id=eggs.id, event_type="RECEIVED",
                actor_name="OrganicMart Superstore", actor_role="RETAILER",
                actor_address=retailer.eth_address, location="Kampala, Uganda",
                location_lat=0.3476, location_lng=32.5825,
                temperature=9.0, humidity=58.0,
                notes="All cartons received undamaged.",
                blockchain_tx_hash=blockchain_service.generate_tx_hash(),
                timestamp=datetime(2024, 3, 14, 8, 0, tzinfo=timezone.utc)),
        ])
        db.commit()

    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _seed_database()
    yield


app = FastAPI(
    title="AgroChain API",
    description="Blockchain-based food traceability system",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files as static
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=UPLOAD_DIR), name="static")

# Routers
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(events.router)
app.include_router(actors.router)
app.include_router(stats.router)
app.include_router(recalls.router)
app.include_router(uploads.router)
app.include_router(export.router)


@app.get("/")
def root():
    return {"name": "AgroChain API", "version": "2.0.0", "docs": "/docs"}


@app.get("/health")
def health_check():
    return {"status": "healthy", "blockchain": blockchain_service.get_network_info()}
