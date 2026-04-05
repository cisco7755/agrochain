import os
import uuid
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Product

router = APIRouter(prefix="/uploads", tags=["Uploads"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "../../uploads")
ALLOWED_IMAGE = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_CERT = {"application/pdf", "image/jpeg", "image/png"}
MAX_SIZE = 10 * 1024 * 1024  # 10 MB


def save_file(data: bytes, folder: str, original_name: str) -> str:
    ext = os.path.splitext(original_name)[-1].lower()
    filename = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(UPLOAD_DIR, folder, filename)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(data)
    return f"/static/{folder}/{filename}"


@router.post("/image/{product_id}")
async def upload_product_image(product_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if file.content_type not in ALLOWED_IMAGE:
        raise HTTPException(status_code=400, detail="Only JPEG/PNG/WebP images allowed")

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

    url = save_file(data, "images", file.filename)
    product.image_url = url
    db.commit()
    return {"url": url}


@router.post("/certificate/{product_id}")
async def upload_certificate(product_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if file.content_type not in ALLOWED_CERT:
        raise HTTPException(status_code=400, detail="Only PDF/JPEG/PNG allowed")

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

    url = save_file(data, "certificates", file.filename)
    product.certificate_url = url
    product.is_certified = True
    db.commit()
    return {"url": url}
