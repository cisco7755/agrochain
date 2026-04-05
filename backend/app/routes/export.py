import csv
import io
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Product, SupplyChainEvent

router = APIRouter(prefix="/export", tags=["Export"])


@router.get("/products/csv")
def export_products_csv(db: Session = Depends(get_db)):
    products = db.query(Product).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Name", "Type", "Batch", "Farmer", "Farm Location",
        "Organic", "Certified", "Recalled", "Harvest Date", "Expiry Date",
        "TX Hash", "Created At"
    ])
    for p in products:
        writer.writerow([
            p.id, p.name, p.product_type, p.batch_number, p.farmer_name,
            p.farm_location, p.is_organic, p.is_certified, p.is_recalled,
            p.harvest_date, p.expiry_date, p.blockchain_tx_hash, p.created_at
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=agrochain_products.csv"}
    )


@router.get("/events/csv")
def export_events_csv(db: Session = Depends(get_db)):
    events = db.query(SupplyChainEvent).order_by(SupplyChainEvent.timestamp).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Product ID", "Event Type", "Actor", "Role",
        "Location", "Temperature (°C)", "Humidity (%)", "Notes",
        "TX Hash", "Timestamp"
    ])
    for e in events:
        writer.writerow([
            e.id, e.product_id, e.event_type, e.actor_name, e.actor_role,
            e.location, e.temperature, e.humidity, e.notes,
            e.blockchain_tx_hash, e.timestamp
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=agrochain_events.csv"}
    )


@router.get("/product/{product_id}/csv")
def export_product_audit_csv(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    events = db.query(SupplyChainEvent).filter(
        SupplyChainEvent.product_id == product_id
    ).order_by(SupplyChainEvent.timestamp).all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["=== AGROCHAIN AUDIT REPORT ==="])
    writer.writerow(["Generated", datetime.utcnow().isoformat()])
    writer.writerow([])

    if product:
        writer.writerow(["PRODUCT DETAILS"])
        writer.writerow(["Name", product.name])
        writer.writerow(["Batch", product.batch_number])
        writer.writerow(["Type", product.product_type])
        writer.writerow(["Farmer", product.farmer_name])
        writer.writerow(["Location", product.farm_location])
        writer.writerow(["Organic", product.is_organic])
        writer.writerow(["Certified", product.is_certified])
        writer.writerow(["Recalled", product.is_recalled])
        writer.writerow(["TX Hash", product.blockchain_tx_hash])
        writer.writerow([])

    writer.writerow(["SUPPLY CHAIN EVENTS"])
    writer.writerow(["Event", "Actor", "Role", "Location", "Temp °C", "Humidity %", "Notes", "Timestamp", "TX Hash"])
    for e in events:
        writer.writerow([
            e.event_type, e.actor_name, e.actor_role, e.location,
            e.temperature, e.humidity, e.notes, e.timestamp, e.blockchain_tx_hash
        ])

    output.seek(0)
    fname = f"agrochain_audit_{product_id}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={fname}"}
    )


@router.get("/expiring")
def get_expiring_products(days: int = 7, db: Session = Depends(get_db)):
    """Return products expiring within the next N days."""
    cutoff = datetime.utcnow() + timedelta(days=days)
    products = db.query(Product).filter(
        Product.expiry_date != None,
        Product.expiry_date <= cutoff,
        Product.expiry_date >= datetime.utcnow(),
        Product.is_recalled == False,
    ).order_by(Product.expiry_date).all()
    return products
