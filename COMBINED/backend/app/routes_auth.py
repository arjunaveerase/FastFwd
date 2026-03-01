import requests
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User, OAuthAccount
from app.google_oauth import build_google_auth_url
from app.config import (
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    FRONTEND_URL,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/google/login")
def google_login():
    return {"auth_url": build_google_auth_url()}


@router.get("/google/callback")
def google_callback(code: str | None = None, db: Session = Depends(get_db)):
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    token_resp = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        },
        timeout=30,
    )

    if token_resp.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {token_resp.text}")

    token_data = token_resp.json()
    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    expires_in = token_data.get("expires_in")

    if not access_token:
        raise HTTPException(status_code=400, detail="No access token returned")

    profile_resp = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=30,
    )

    if profile_resp.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Failed to fetch user profile: {profile_resp.text}")

    profile = profile_resp.json()
    email = profile.get("email")
    name = profile.get("name", "")

    if not email:
        raise HTTPException(status_code=400, detail="Google profile email missing")

    user = db.query(User).filter(User.google_email == email).first()
    if not user:
        user = User(google_email=email, full_name=name)
        db.add(user)
        db.commit()
        db.refresh(user)

    oauth = db.query(OAuthAccount).filter(OAuthAccount.user_id == user.id).first()
    if not oauth:
        oauth = OAuthAccount(
            user_id=user.id,
            provider="google",
            access_token=access_token,
            refresh_token=refresh_token,
            token_expiry=str(expires_in),
            scopes="gmail.send,gmail.modify,spreadsheets.readonly,userinfo.email,userinfo.profile",
        )
        db.add(oauth)
    else:
        oauth.access_token = access_token
        if refresh_token:
            oauth.refresh_token = refresh_token
        oauth.token_expiry = str(expires_in)

    db.commit()

    return RedirectResponse(url=f"{FRONTEND_URL}?user_email={email}")


@router.get("/me")
def get_me(user_email: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.google_email == user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "email": user.google_email,
        "full_name": user.full_name,
    }