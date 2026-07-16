from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr


# ── Auth schemas ─────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    role: str = "VIEWER"
    eth_address: Optional[str] = None
    organization: Optional[str] = None
    location: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: str
    eth_address: Optional[str] = None
    organization: Optional[str] = None
    location: Optional[str] = None
    is_active: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ── Actor schemas ────────────────────────────────────────────────────────────

class ActorCreate(BaseModel):
    name: str
    role: str
    eth_address: Optional[str] = None
    location: Optional[str] = None
    is_active: bool = True


class ActorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    role: str
    eth_address: Optional[str] = None
    location: Optional[str] = None
    is_active: bool
    created_at: datetime


# ── Recall schemas ────────────────────────────────────────────────────────────

class RecallCreate(BaseModel):
    product_id: int
    reason: str
    severity: str = "MEDIUM"
    issued_by: str
    details: Optional[str] = None


class RecallResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    reason: str
    severity: str
    issued_by: str
    details: Optional[str] = None
    blockchain_tx_hash: Optional[str] = None
    recalled_at: datetime
    resolved_at: Optional[datetime] = None
    is_resolved: bool


# ── Product schemas ──────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    name: str
    product_type: Optional[str] = None
    batch_number: str
    farmer_name: str
    farmer_address: Optional[str] = None
    farm_location: Optional[str] = None
    farm_lat: Optional[float] = None
    farm_lng: Optional[float] = None
    farm_size_acres: Optional[float] = None
    is_organic: bool = False
    is_certified: bool = False
    harvest_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    description: Optional[str] = None


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    product_type: Optional[str] = None
    batch_number: str
    farmer_name: str
    farmer_address: Optional[str] = None
    farm_location: Optional[str] = None
    farm_lat: Optional[float] = None
    farm_lng: Optional[float] = None
    farm_size_acres: Optional[float] = None
    is_organic: bool
    is_certified: bool
    is_recalled: bool
    recall_reason: Optional[str] = None
    recall_date: Optional[datetime] = None
    harvest_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    certificate_url: Optional[str] = None
    blockchain_tx_hash: Optional[str] = None
    contract_product_id: Optional[int] = None
    created_at: datetime


class ProductDetail(ProductResponse):
    model_config = ConfigDict(from_attributes=True)

    events: List["EventResponse"] = []
    recall: Optional[RecallResponse] = None


# ── Supply chain event schemas ───────────────────────────────────────────────

class EventCreate(BaseModel):
    product_id: int
    event_type: str
    actor_name: str
    actor_role: str
    actor_address: Optional[str] = None
    location: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    notes: Optional[str] = None
    timestamp: Optional[datetime] = None


class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    event_type: str
    actor_name: str
    actor_role: str
    actor_address: Optional[str] = None
    location: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    notes: Optional[str] = None
    blockchain_tx_hash: Optional[str] = None
    timestamp: datetime
    created_at: datetime


# ── Stats schema ─────────────────────────────────────────────────────────────

class StatsResponse(BaseModel):
    total_products: int
    total_events: int
    total_actors: int
    total_users: int
    certified_products: int
    organic_products: int
    recalled_products: int
    expiring_soon: int
    event_type_counts: Dict[str, int]
    recent_products: List[ProductResponse] = []
    recent_events: List[EventResponse] = []
    recent_recalls: List[RecallResponse] = []


# ── Track schema ─────────────────────────────────────────────────────────────

class TrackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product: ProductResponse
    events: List[EventResponse]
    qr_code_url: str
    recall: Optional[RecallResponse] = None


# ── Scan tracking (QR anti-cloning) ─────────────────────────────────────────

class ScanStatsResponse(BaseModel):
    total_scans: int
    scans_24h: int
    distinct_scanners_24h: int
    suspicious: bool


# ── Faucet ───────────────────────────────────────────────────────────────────

class FaucetRequestBody(BaseModel):
    address: str


class FaucetResponse(BaseModel):
    tx_hash: str
    amount_eth: float
    address: str


# Resolve forward references
ProductDetail.model_rebuild()
