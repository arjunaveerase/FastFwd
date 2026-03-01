from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import SendLog

router = APIRouter(prefix="/logs", tags=["logs"])

@router.get("")
def list_logs(db: Session = Depends(get_db)):
    rows = (
        db.query(SendLog)
        .order_by(SendLog.id.desc())
        .limit(100)
        .all()
    )

    return [
        {
            "id": r.id,
            "vendor_name": r.vendor_name,
            "subject": r.subject,
            "to_emails": r.to_emails,
            "cc_emails": r.cc_emails,
            "gmail_thread_id": r.gmail_thread_id,
            "gmail_message_id": r.gmail_message_id,
            "send_status": r.send_status,
            "error_message": r.error_message,
            "created_at": str(r.created_at),
        }
        for r in rows
    ]