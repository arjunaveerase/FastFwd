from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
from app.db import get_db
from app.models import User, OAuthAccount, SheetConnection, ColumnMapping
from app.schemas import SheetConnectRequest, SelectTabRequest, MappingRequest
from app.google_oauth import credentials_from_dict
from app.sheets_service import extract_spreadsheet_id, get_spreadsheet_meta, list_tabs, read_tab_as_df

router = APIRouter(prefix="/sheets", tags=["sheets"])


def get_user_and_oauth(db: Session, user_email: str):
    user = db.query(User).filter(User.google_email == user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Please sign in again.")

    oauth = db.query(OAuthAccount).filter(OAuthAccount.user_id == user.id).first()
    if not oauth:
        raise HTTPException(status_code=400, detail="Google account not connected. Please sign in again.")

    return user, oauth


@router.post("/connect")
def connect_sheet(payload: SheetConnectRequest, db: Session = Depends(get_db)):
    try:
        user, oauth = get_user_and_oauth(db, payload.user_email)
        creds = credentials_from_dict({
            "token": oauth.access_token,
            "refresh_token": oauth.refresh_token,
            "token_uri": "https://oauth2.googleapis.com/token",
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
        })
        spreadsheet_id = extract_spreadsheet_id(payload.spreadsheet_url)
        if not spreadsheet_id:
            raise HTTPException(status_code=400, detail="Invalid Google Sheet URL.")

        meta = get_spreadsheet_meta(creds, spreadsheet_id)
        title = meta.get("properties", {}).get("title", "") or "Untitled Sheet"

        tabs = list_tabs(creds, spreadsheet_id)

        existing = db.query(SheetConnection).filter(
            SheetConnection.user_id == user.id,
            SheetConnection.spreadsheet_id == spreadsheet_id
        ).first()

        if existing:
            existing.spreadsheet_url = payload.spreadsheet_url
            existing.spreadsheet_name = title
            db.commit()
            db.refresh(existing)
            row = existing
        else:
            row = SheetConnection(
                user_id=user.id,
                spreadsheet_id=spreadsheet_id,
                spreadsheet_url=payload.spreadsheet_url,
                spreadsheet_name=title,
            )
            db.add(row)
            db.commit()
            db.refresh(row)

        return {
            "connection_id": row.id,
            "spreadsheet_id": spreadsheet_id,
            "spreadsheet_name": title,
            "tabs": tabs,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=(
                "Could not access this Google Sheet. "
                "Make sure the signed-in Google account has access to the sheet, "
                "the URL is correct, and the backend is still running. "
                f"Technical detail: {str(e)}"
            ),
        )


@router.post("/select-tab")
def select_tab(payload: SelectTabRequest, db: Session = Depends(get_db)):
    conn = db.query(SheetConnection).filter(SheetConnection.id == payload.connection_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Sheet connection not found")
    conn.selected_tab = payload.selected_tab
    db.commit()
    return {"ok": True}


@router.get("/{connection_id}/columns")
def get_columns(connection_id: int, user_email: str, db: Session = Depends(get_db)):
    user, oauth = get_user_and_oauth(db, user_email)
    conn = db.query(SheetConnection).filter(
        SheetConnection.id == connection_id,
        SheetConnection.user_id == user.id
    ).first()

    if not conn:
        raise HTTPException(status_code=404, detail="Sheet connection not found")
    if not conn.selected_tab:
        raise HTTPException(status_code=400, detail="No tab selected")

    creds = credentials_from_dict({
    "token": oauth.access_token,
    "refresh_token": oauth.refresh_token,
    "token_uri": "https://oauth2.googleapis.com/token",
    "client_id": GOOGLE_CLIENT_ID,
    "client_secret": GOOGLE_CLIENT_SECRET,
    })
    df = read_tab_as_df(creds, conn.spreadsheet_id, conn.selected_tab)

    return {
        "columns": list(df.columns) if not df.empty else []
    }


@router.post("/mapping")
def save_mapping(payload: MappingRequest, db: Session = Depends(get_db)):
    existing = db.query(ColumnMapping).filter(
        ColumnMapping.sheet_connection_id == payload.sheet_connection_id
    ).first()

    if existing:
        row = existing
    else:
        row = ColumnMapping(sheet_connection_id=payload.sheet_connection_id)
        db.add(row)

    row.vendor_name_col = payload.vendor_name_col
    row.template_type_col = payload.template_type_col
    row.to_email_col = payload.to_email_col
    row.cc_email_col = payload.cc_email_col
    row.thread_id_col = payload.thread_id_col
    row.message_id_col = payload.message_id_col
    row.subject_col = payload.subject_col
    row.remarks_col = payload.remarks_col

    db.commit()
    return {"ok": True}