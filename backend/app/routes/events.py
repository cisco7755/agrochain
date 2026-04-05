from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Product, SupplyChainEvent
from app.schemas import EventCreate, EventResponse
from app.services.blockchain import blockchain_service

router = APIRouter(prefix="/events", tags=["Events"])


@router.get("/", response_model=List[EventResponse])
def list_events(
    product_id: Optional[int] = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """Return all supply chain events, optionally filtered by product."""
    query = db.query(SupplyChainEvent)
    if product_id is not None:
        query = query.filter(SupplyChainEvent.product_id == product_id)
    events = query.order_by(SupplyChainEvent.timestamp).offset(skip).limit(limit).all()
    return events


@router.post("/", response_model=EventResponse, status_code=201)
def create_event(payload: EventCreate, db: Session = Depends(get_db)):
    """Record a new supply chain event and attach a simulated blockchain tx hash."""
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    data = payload.model_dump()
    if data.get("timestamp") is None:
        data["timestamp"] = datetime.utcnow()

    event = SupplyChainEvent(**data)
    event.blockchain_tx_hash = blockchain_service.generate_tx_hash()

    # Auto-mark product as certified when a CERTIFIED event is added
    if payload.event_type == "CERTIFIED":
        product.is_certified = True

    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/{event_id}", response_model=EventResponse)
def get_event(event_id: int, db: Session = Depends(get_db)):
    """Retrieve a single supply chain event by ID."""
    event = db.query(SupplyChainEvent).filter(SupplyChainEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
    return event
