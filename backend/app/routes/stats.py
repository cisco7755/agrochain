from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Actor, Product, Recall, SupplyChainEvent, User
from app.schemas import EventResponse, ProductResponse, RecallResponse, StatsResponse

router = APIRouter(prefix="/stats", tags=["Stats"])


@router.get("/", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)):
    total_products = db.query(Product).count()
    total_events = db.query(SupplyChainEvent).count()
    total_actors = db.query(Actor).count()
    total_users = db.query(User).count()
    certified_products = db.query(Product).filter(Product.is_certified == True).count()
    organic_products = db.query(Product).filter(Product.is_organic == True).count()
    recalled_products = db.query(Product).filter(Product.is_recalled == True).count()

    cutoff = datetime.utcnow() + timedelta(days=7)
    expiring_soon = db.query(Product).filter(
        Product.expiry_date != None,
        Product.expiry_date <= cutoff,
        Product.expiry_date >= datetime.utcnow(),
        Product.is_recalled == False,
    ).count()

    all_events = db.query(SupplyChainEvent).all()
    event_type_counts: dict = {}
    for event in all_events:
        event_type_counts[event.event_type] = event_type_counts.get(event.event_type, 0) + 1

    recent_products = db.query(Product).order_by(Product.created_at.desc()).limit(5).all()
    recent_events = db.query(SupplyChainEvent).order_by(SupplyChainEvent.created_at.desc()).limit(10).all()
    recent_recalls = db.query(Recall).order_by(Recall.recalled_at.desc()).limit(5).all()

    return StatsResponse(
        total_products=total_products,
        total_events=total_events,
        total_actors=total_actors,
        total_users=total_users,
        certified_products=certified_products,
        organic_products=organic_products,
        recalled_products=recalled_products,
        expiring_soon=expiring_soon,
        event_type_counts=event_type_counts,
        recent_products=[ProductResponse.model_validate(p) for p in recent_products],
        recent_events=[EventResponse.model_validate(e) for e in recent_events],
        recent_recalls=[RecallResponse.model_validate(r) for r in recent_recalls],
    )
