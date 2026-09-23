"""Identity router — sync SQLAlchemy with Aadhaar / Passport Verification, PDF Storage, and Blockchain Ledger."""
import os
import uuid
import base64
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.user import IdentityRecord, DigitalTouristID, User
from services.identity_service import verify_aadhaar, verify_passport
from services.hash_chain import mint_digital_tourist_id, verify_chain
from services.audit_log import log_identity_access
from middleware.rbac import get_current_user, require_role

router = APIRouter(prefix="/identity", tags=["identity"])

IST = timezone(timedelta(hours=5, minutes=30))

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "documents")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class AadhaarRequest(BaseModel):
    aadhaar_number: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    pdf_document_base64: Optional[str] = None
    document_filename: Optional[str] = None


class PassportRequest(BaseModel):
    passport_number: str
    nationality: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    visa_ref: Optional[str] = None
    pdf_document_base64: Optional[str] = None
    document_filename: Optional[str] = None


def _save_pdf_document(user_id: str, id_type: str, pdf_b64: Optional[str], orig_filename: Optional[str]):
    if not pdf_b64:
        return {"filename": None, "sha256": None, "file_path": None}

    try:
        if "," in pdf_b64:
            pdf_b64 = pdf_b64.split(",")[1]

        pdf_bytes = base64.b64decode(pdf_b64)
        doc_hash = hashlib.sha256(pdf_bytes).hexdigest()

        safe_filename = f"{user_id}_{id_type}_{int(datetime.utcnow().timestamp())}.pdf"
        file_path = os.path.join(UPLOAD_DIR, safe_filename)

        with open(file_path, "wb") as f:
            f.write(pdf_bytes)

        return {
            "filename": orig_filename or safe_filename,
            "saved_name": safe_filename,
            "sha256": doc_hash,
            "file_path": file_path,
            "size_bytes": len(pdf_bytes),
        }
    except Exception as e:
        return {"filename": None, "sha256": None, "error": str(e)}


@router.post("/aadhaar")
def submit_aadhaar(
    body: AadhaarRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = current_user["sub"]
    existing = db.query(IdentityRecord).filter(IdentityRecord.user_id == user_id).first()
    if existing and existing.verification_status == "verified":
        raise HTTPException(409, "Identity already verified")

    result = verify_aadhaar(body.aadhaar_number)
    doc_meta = _save_pdf_document(user_id, "aadhaar", body.pdf_document_base64, body.document_filename)

    record = IdentityRecord(
        id=str(uuid.uuid4()),
        user_id=user_id,
        id_type="aadhaar",
        id_hash=result["id_hash"],
        id_salt=result["id_salt"],
        nationality="IN",
        verification_status=result["status"],
        verified_at=datetime.fromisoformat(result["verified_at"]) if result["status"] == "verified" else None,
    )
    db.add(record)

    dtid_data = _mint_dtid(user_id, db)
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.is_verified = True
        if body.phone:
            user.phone = body.phone
    db.commit()

    return {
        "verification_status": result["status"],
        "dtid_code": dtid_data["dtid_code"],
        "chain_hash": dtid_data["chain_hash"],
        "id_type": "aadhaar",
        "nationality": "IN",
        "document_stored": doc_meta.get("filename"),
        "document_sha256": doc_meta.get("sha256"),
    }


@router.post("/passport")
def submit_passport(
    body: PassportRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = current_user["sub"]
    existing = db.query(IdentityRecord).filter(IdentityRecord.user_id == user_id).first()
    if existing and existing.verification_status == "verified":
        raise HTTPException(409, "Identity already verified")

    result = verify_passport(body.passport_number, body.nationality, body.visa_ref)
    doc_meta = _save_pdf_document(user_id, "passport", body.pdf_document_base64, body.document_filename)

    record = IdentityRecord(
        id=str(uuid.uuid4()),
        user_id=user_id,
        id_type="passport",
        id_hash=result["id_hash"],
        id_salt=result["id_salt"],
        nationality=result["nationality"],
        visa_ref_encrypted=result.get("visa_ref_encrypted"),
        verification_status=result["status"],
        verified_at=datetime.fromisoformat(result["verified_at"]),
    )
    db.add(record)
    dtid_data = _mint_dtid(user_id, db)
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.is_verified = True
        if body.phone:
            user.phone = body.phone
    db.commit()

    return {
        "verification_status": result["status"],
        "dtid_code": dtid_data["dtid_code"],
        "chain_hash": dtid_data["chain_hash"],
        "id_type": "passport",
        "nationality": result["nationality"],
        "document_stored": doc_meta.get("filename"),
        "document_sha256": doc_meta.get("sha256"),
    }


@router.get("/status")
def get_verification_status(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = db.query(IdentityRecord).filter(IdentityRecord.user_id == current_user["sub"]).first()
    return {
        "verification_status": record.verification_status if record else "not_submitted",
        "id_type": record.id_type if record else None,
        "nationality": record.nationality if record else None,
    }


@router.get("/dtid")
def get_dtid(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dtid = db.query(DigitalTouristID).filter(DigitalTouristID.user_id == current_user["sub"]).first()
    if not dtid:
        raise HTTPException(404, "Digital Tourist ID not yet issued — complete identity verification first")
    
    id_record = db.query(IdentityRecord).filter(IdentityRecord.user_id == current_user["sub"]).first()
    
    return {
        "dtid_code": dtid.dtid_code,
        "chain_hash": dtid.chain_hash,
        "prev_hash": dtid.prev_hash or "VANRAKSHAK_GENESIS_0000",
        "issued_at": dtid.issued_at.isoformat(),
        "issued_at_ist": dtid.issued_at.replace(tzinfo=timezone.utc).astimezone(IST).strftime("%Y-%m-%d %H:%M:%S IST") if dtid.issued_at else None,
        "id_type": id_record.id_type if id_record else "verified",
        "nationality": id_record.nationality if id_record else "IN",
    }


@router.get("/ledger")
def get_blockchain_ledger(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the complete SHA-256 Hash-Chain Blockchain Ledger of all verified tourist IDs.
    Available to Control Room officers, Rangers, and authenticated clients.
    """
    dtids = db.query(DigitalTouristID).order_by(DigitalTouristID.issued_at.asc()).all()
    ledger_records = []
    
    raw_for_verify = []
    for d in dtids:
        raw_for_verify.append({
            "dtid_code": d.dtid_code,
            "user_id": d.user_id,
            "chain_hash": d.chain_hash,
            "prev_hash": d.prev_hash,
            "issued_at": d.issued_at,
        })

    is_intact = verify_chain(raw_for_verify)

    for idx, d in enumerate(dtids):
        user = db.query(User).filter(User.id == d.user_id).first()
        id_rec = db.query(IdentityRecord).filter(IdentityRecord.user_id == d.user_id).first()
        
        ist_str = d.issued_at.replace(tzinfo=timezone.utc).astimezone(IST).strftime("%Y-%m-%d %H:%M:%S IST") if d.issued_at else "Active IST"

        ledger_records.append({
            "block_index": idx + 1,
            "dtid_code": d.dtid_code,
            "user_id": d.user_id,
            "user_email": user.email if user else "tourist@vanrakshak.org",
            "phone": user.phone if user else "+91 98765 43210",
            "id_type": id_rec.id_type.upper() if id_rec else "AADHAAR",
            "nationality": id_rec.nationality if id_rec else "IN",
            "chain_hash": d.chain_hash,
            "prev_hash": d.prev_hash or "VANRAKSHAK_GENESIS_0000",
            "issued_at": d.issued_at.isoformat(),
            "issued_at_ist": ist_str,
            "status": "VERIFIED_CHAIN_BLOCK",
        })

    return {
        "chain_length": len(ledger_records),
        "is_intact": is_intact,
        "ledger_type": "SHA-256 Tamper-Evident Hash-Chain Ledger",
        "genesis_hash": "VANRAKSHAK_GENESIS_0000",
        "blocks": ledger_records,
    }


@router.get("/{user_id}")
def get_identity_by_user(
    user_id: str,
    request: Request,
    current_user: dict = Depends(require_role("control_room", "rescue_team")),
    db: Session = Depends(get_db),
):
    record = db.query(IdentityRecord).filter(IdentityRecord.user_id == user_id).first()
    if not record:
        raise HTTPException(404, "No identity record for this user")

    log_identity_access(
        db,
        accessor_id=current_user["sub"],
        target_record_id=record.id,
        action="view",
        ip_address=request.client.host if request.client else None,
    )

    return {
        "id_type": record.id_type,
        "nationality": record.nationality,
        "verification_status": record.verification_status,
        "verified_at": record.verified_at.isoformat() if record.verified_at else None,
    }


def _mint_dtid(user_id: str, db: Session) -> dict:
    prev = db.query(DigitalTouristID).order_by(DigitalTouristID.issued_at.desc()).first()
    prev_hash = prev.chain_hash if prev else None
    dtid_data = mint_digital_tourist_id(user_id, prev_hash)
    dtid = DigitalTouristID(**dtid_data)
    db.add(dtid)
    return dtid_data
