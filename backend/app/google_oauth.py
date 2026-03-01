from __future__ import annotations

import json
import os
from typing import Optional, Dict, Any
from urllib.parse import urlencode

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

from app.config import GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI


SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]


def build_google_auth_url(state: Optional[str] = None) -> str:
    """
    Build a plain OAuth authorization URL (no PKCE),
    so it matches the manual token exchange in routes_auth.py
    """
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "include_granted_scopes": "true",
        "prompt": "consent",
    }
    if state:
        params["state"] = state

    return "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)


def credentials_from_dict(token_data: Dict[str, Any]) -> Credentials:
    return Credentials(
        token=token_data.get("token"),
        refresh_token=token_data.get("refresh_token"),
        token_uri=token_data.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=token_data.get("client_id"),
        client_secret=token_data.get("client_secret"),
        scopes=token_data.get("scopes") or SCOPES,
    )


def save_user_credentials(user_email: str, token_data: Dict[str, Any]) -> None:
    base = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".tokens")
    os.makedirs(base, exist_ok=True)

    safe = user_email.replace("@", "_at_").replace(".", "_")
    path = os.path.join(base, f"{safe}.json")

    with open(path, "w", encoding="utf-8") as f:
        json.dump(token_data, f)


def load_user_credentials(user_email: str) -> Optional[Credentials]:
    base = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".tokens")
    safe = user_email.replace("@", "_at_").replace(".", "_")
    path = os.path.join(base, f"{safe}.json")

    if not os.path.exists(path):
        return None

    with open(path, "r", encoding="utf-8") as f:
        token_data = json.load(f)

    creds = credentials_from_dict(token_data)

    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        token_data["token"] = creds.token
        save_user_credentials(user_email, token_data)

    return creds