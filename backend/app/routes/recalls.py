from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Product, Recall
from app.schemas import RecallCreate, RecallResponse
from app.services.blockchain import blockchain_service

router = APIRouter(prefix="/recalls", tags=["Recalls"])


@router.get("/", response_model=List[RecallResponse])
def list_recalls(db: Session = Depends(get_db)):
    return db.query(Recall).order_by(Recall.recalled_at.desc()).all()


@router.post("/", response_model=RecallResponse, status_code=201)
def issue_recall(payload: RecallCreate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.is_recalled:
        raise HTTPException(status_code=400, detail="Product is already recalled")

    recall = Recall(
        product_id=payload.product_id,
        reason=payload.reason,
        severity=payload.severity,
        issued_by=payload.issued_by,
        details=payload.details,
        blockchain_tx_hash=blockchain_service.generate_tx_hash(),
    )
    db.add(recall)

    product.is_recalled = True
    product.recall_reason = payload.reason
    product.recall_date = datetime.utcnow()

    db.commit()
    db.refresh(recall)
    return recall


@router.get("/{recall_id}", response_model=RecallResponse)
def get_recall(recall_id: int, db: Session = Depends(get_db)):
    recall = db.query(Recall).filter(Recall.id == recall_id).first()
    if not recall:
        raise HTTPException(status_code=404, detail="Recall not found")
    return recall


@router.patch("/{recall_id}/resolve", response_model=RecallResponse)
def resolve_recall(recall_id: int, db: Session = Depends(get_db)):
    recall = db.query(Recall).filter(Recall.id == recall_id).first()
    if not recall:
        raise HTTPException(status_code=404, detail="Recall not found")

    recall.is_resolved = True
    recall.resolved_at = datetime.utcnow()

    product = db.query(Product).filter(Product.id == recall.product_id).first()
    if product:
        product.is_recalled = False
        product.recall_reason = None
        product.recall_date = None

    db.commit()
    db.refresh(recall)
    return recall


@router.get("/product/{product_id}", response_model=RecallResponse)
def get_recall_by_product(product_id: int, db: Session = Depends(get_db)):
    recall = db.query(Recall).filter(Recall.product_id == product_id).first()
    if not recall:
        raise HTTPException(status_code=404, detail="No recall for this product")
    return recall
