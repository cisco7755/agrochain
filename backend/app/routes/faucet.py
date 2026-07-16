import re
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import FaucetRequest
from app.schemas import FaucetRequestBody, FaucetResponse
from app.services.faucet_service import FAUCET_AMOUNT_ETH, faucet_service

router = APIRouter(prefix="/faucet", tags=["Faucet"])

ADDRESS_RE = re.compile(r"^0x[0-9a-fA-F]{40}$")
COOLDOWN_MINUTES = 10


@router.post("/", response_model=FaucetResponse)
def request_faucet(payload: FaucetRequestBody, db: Session = Depends(get_db)):
    """Send test ETH to a wallet so it can pay gas — rate-limited per address."""
    address = payload.address
    if not ADDRESS_RE.match(address):
        raise HTTPException(status_code=400, detail="Invalid Ethereum address.")

    since = datetime.utcnow() - timedelta(minutes=COOLDOWN_MINUTES)
    recent = (
        db.query(FaucetRequest)
        .filter(FaucetRequest.address == address.lower())
        .filter(FaucetRequest.requested_at >= since)
        .first()
    )
    if recent:
        wait_seconds = int((recent.requested_at + timedelta(minutes=COOLDOWN_MINUTES) - datetime.utcnow()).total_seconds())
        raise HTTPException(
            status_code=429,
            detail=f"Already funded recently — try again in {max(wait_seconds, 1)}s.",
        )

    try:
        tx_hash = faucet_service.send(address)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Faucet transaction failed: {e}")

    db.add(FaucetRequest(address=address.lower(), tx_hash=tx_hash))
    db.commit()

    return FaucetResponse(tx_hash=tx_hash, amount_eth=FAUCET_AMOUNT_ETH, address=address)
