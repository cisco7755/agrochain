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

# Extension is derived from the verified content-type, never from the
# client-supplied filename — that filename is attacker-controlled and using
# it directly would let a spoofed content-type land arbitrary extensions
# (e.g. .html/.svg) in a publicly served static directory.
EXT_BY_CONTENT_TYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}


def save_file(data: bytes, folder: str, content_type: str) -> str:
    ext = EXT_BY_CONTENT_TYPE[content_type]
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

    url = save_file(data, "images", file.content_type)
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

    url = save_file(data, "certificates", file.content_type)
    product.certificate_url = url
    product.is_certified = True
    db.commit()
    return {"url": url}


@router.post("/certification-document")
async def upload_certification_document(file: UploadFile = File(...)):
    """
    Upload a certification's supporting document (inspection report, lab
    result) and get back a URL — independent of the backend's local product
    cache, since real certifications are issued against on-chain product
    IDs that cache may not know about. The URL is passed into
    issueCertification() on-chain as the source of truth.
    """
    if file.content_type not in ALLOWED_CERT:
        raise HTTPException(status_code=400, detail="Only PDF/JPEG/PNG allowed")

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

    url = save_file(data, "certificates", file.content_type)
    return {"url": url}
