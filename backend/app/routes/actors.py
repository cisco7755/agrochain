from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Actor
from app.schemas import ActorCreate, ActorResponse

router = APIRouter(prefix="/actors", tags=["Actors"])


@router.get("/", response_model=List[ActorResponse])
def list_actors(db: Session = Depends(get_db)):
    """Return all registered supply chain actors."""
    return db.query(Actor).all()


@router.post("/", response_model=ActorResponse, status_code=201)
def create_actor(payload: ActorCreate, db: Session = Depends(get_db)):
    """Register a new supply chain actor."""
    actor = Actor(**payload.model_dump())
    db.add(actor)
    db.commit()
    db.refresh(actor)
    return actor


@router.get("/{actor_id}", response_model=ActorResponse)
def get_actor(actor_id: int, db: Session = Depends(get_db)):
    """Retrieve a single actor by ID."""
    actor = db.query(Actor).filter(Actor.id == actor_id).first()
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found.")
    return actor
