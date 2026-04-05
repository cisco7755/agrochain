from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="VIEWER")  # ADMIN/FARMER/PROCESSOR/DISTRIBUTOR/RETAILER/CERTIFIER/VIEWER
    eth_address = Column(String, nullable=True)
    organization = Column(String, nullable=True)
    location = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Actor(Base):
    __tablename__ = "actors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    eth_address = Column(String, nullable=True)
    location = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    product_type = Column(String, nullable=True)
    batch_number = Column(String, unique=True, nullable=False, index=True)
    farmer_name = Column(String, nullable=False)
    farmer_address = Column(String, nullable=True)
    farm_location = Column(String, nullable=True)
    farm_lat = Column(Float, nullable=True)
    farm_lng = Column(Float, nullable=True)
    farm_size_acres = Column(Float, nullable=True)
    is_organic = Column(Boolean, default=False, nullable=False)
    is_certified = Column(Boolean, default=False, nullable=False)
    is_recalled = Column(Boolean, default=False, nullable=False)
    recall_reason = Column(String, nullable=True)
    recall_date = Column(DateTime, nullable=True)
    harvest_date = Column(DateTime, nullable=True)
    expiry_date = Column(DateTime, nullable=True)
    description = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    certificate_url = Column(String, nullable=True)
    blockchain_tx_hash = Column(String, nullable=True)
    contract_product_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    events = relationship("SupplyChainEvent", back_populates="product", cascade="all, delete-orphan")
    recall = relationship("Recall", back_populates="product", uselist=False, cascade="all, delete-orphan")


class SupplyChainEvent(Base):
    __tablename__ = "supply_chain_events"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    event_type = Column(String, nullable=False)
    actor_name = Column(String, nullable=False)
    actor_role = Column(String, nullable=False)
    actor_address = Column(String, nullable=True)
    location = Column(String, nullable=True)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    temperature = Column(Float, nullable=True)
    humidity = Column(Float, nullable=True)
    notes = Column(String, nullable=True)
    blockchain_tx_hash = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    product = relationship("Product", back_populates="events")


class Recall(Base):
    __tablename__ = "recalls"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, unique=True)
    reason = Column(String, nullable=False)
    severity = Column(String, nullable=False, default="MEDIUM")  # LOW/MEDIUM/HIGH/CRITICAL
    issued_by = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    blockchain_tx_hash = Column(String, nullable=True)
    recalled_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    is_resolved = Column(Boolean, default=False)

    product = relationship("Product", back_populates="recall")
