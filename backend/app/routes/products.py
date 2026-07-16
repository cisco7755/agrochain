import hashlib
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Product, ScanEvent, SupplyChainEvent
from app.schemas import ProductCreate, ProductDetail, ProductResponse, ScanStatsResponse, TrackResponse
from app.services.blockchain import blockchain_service
from app.services.qr_service import qr_service

router = APIRouter(prefix="/products", tags=["Products"])

# Heuristic thresholds for flagging a QR code as possibly cloned/relabeled —
# not proof of fraud, just a signal that this code is circulating more widely
# than a single physical item plausibly would be.
SUSPICIOUS_SCANS_24H = 20
SUSPICIOUS_DISTINCT_SCANNERS_24H = 10


def _hash_ip(ip: str) -> str:
    """One-way hash so raw visitor IPs are never persisted."""
    return hashlib.sha256(ip.encode()).hexdigest()[:16]


@router.get("/", response_model=List[ProductResponse])
def list_products(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Return a paginated list of all products."""
    products = db.query(Product).offset(skip).limit(limit).all()
    return products


@router.post("/", response_model=ProductResponse, status_code=201)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    """Register a new product and record a simulated blockchain transaction."""
    existing = db.query(Product).filter(Product.batch_number == payload.batch_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Batch number already exists.")

    product = Product(**payload.model_dump())
    product.blockchain_tx_hash = blockchain_service.generate_tx_hash()

    db.add(product)
    db.commit()
    db.refresh(product)

    product.contract_product_id = blockchain_service.simulate_contract_id(product.id)
    db.commit()
    db.refresh(product)

    return product


@router.get("/batch/{batch_number}", response_model=ProductResponse)
def get_product_by_batch(batch_number: str, db: Session = Depends(get_db)):
    """Retrieve a product by its batch number."""
    product = db.query(Product).filter(Product.batch_number == batch_number).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product with that batch number not found.")
    return product


@router.get("/{product_id}", response_model=ProductDetail)
def get_product(product_id: int, db: Session = Depends(get_db)):
    """Retrieve a single product together with its supply chain events."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    return product


@router.get("/{product_id}/track", response_model=TrackResponse)
def track_product(product_id: int, db: Session = Depends(get_db)):
    """Return the full traceability record for a product including a QR code."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    events = (
        db.query(SupplyChainEvent)
        .filter(SupplyChainEvent.product_id == product_id)
        .order_by(SupplyChainEvent.timestamp)
        .all()
    )

    qr_code = qr_service.generate_qr_base64(product.id, product.batch_number)

    return TrackResponse(product=product, events=events, qr_code_url=qr_code, recall=product.recall)


@router.get("/{product_id}/qr")
def get_product_qr(product_id: int, db: Session = Depends(get_db)):
    """Return the base64-encoded QR code for a product."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    qr_code = qr_service.generate_qr_base64(product.id, product.batch_number)
    return {"product_id": product_id, "batch_number": product.batch_number, "qr_code": qr_code}


@router.post("/{product_id}/scan", response_model=ScanStatsResponse)
def log_scan(
    product_id: int,
    request: Request,
    unit: Optional[int] = Query(default=None, ge=1, description="Unit number, if this QR is a per-unit code"),
    db: Session = Depends(get_db),
):
    """
    Log a QR-code scan and return activity stats for anomaly detection.

    Works for any on-chain product ID, independent of whether the backend's
    local product cache has a matching row — the real product data lives on
    the blockchain and is fetched by the frontend directly.
    """
    client_ip = request.client.host if request.client else "unknown"
    db.add(ScanEvent(
        product_id=product_id,
        unit_number=unit,
        ip_hash=_hash_ip(client_ip),
        user_agent=request.headers.get("user-agent"),
    ))
    db.commit()

    query = db.query(ScanEvent).filter(ScanEvent.product_id == product_id)
    if unit is not None:
        query = query.filter(ScanEvent.unit_number == unit)

    total_scans = query.count()

    since = datetime.utcnow() - timedelta(hours=24)
    recent = query.filter(ScanEvent.scanned_at >= since).all()
    scans_24h = len(recent)
    distinct_scanners_24h = len({r.ip_hash for r in recent})

    suspicious = (
        scans_24h > SUSPICIOUS_SCANS_24H
        or distinct_scanners_24h > SUSPICIOUS_DISTINCT_SCANNERS_24H
    )

    return ScanStatsResponse(
        total_scans=total_scans,
        scans_24h=scans_24h,
        distinct_scanners_24h=distinct_scanners_24h,
        suspicious=suspicious,
    )


@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    """Delete a product and all its associated events."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    db.delete(product)
    db.commit()
