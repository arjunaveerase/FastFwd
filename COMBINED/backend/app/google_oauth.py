from __future__ import annotations

import json
import os
from typing import Optional, Dict, Any

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request


# Scopes needed for:
# - reading sheets (if you use Sheets API)
# - sending emails + threading (Gmail API)
SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]


def _get_client_secrets_path() -> str:
    """
    Prefer env GOOGLE_CLIENT_SECRET_FILE, else default to backend/app/client_secret.json
    You can set it in .env as:
      GOOGLE_CLIENT_SECRET_FILE=C:\\Users\\ARJUN\\Desktop\\client_secret.json
    """
    p = os.getenv("GOOGLE_CLIENT_SECRET_FILE", "").strip()
    if p:
        return p
    # fallback relative
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(here, "client_secret.json")


def _get_redirect_uri() -> str:
    """
    Must match exactly what you configured in Google Cloud OAuth client:
    Example: http://127.0.0.1:8000/auth/google/callback
    Set in .env:
      GOOGLE_REDIRECT_URI=http://127.0.0.1:8000/auth/google/callback
    """
    return os.getenv("GOOGLE_REDIRECT_URI", "http://127.0.0.1:8000/auth/google/callback").strip()


def build_google_auth_url(state: Optional[str] = None) -> str:
    """
    Used by routes_auth.py to start login.
    Returns the Google consent URL.
    """
    client_secrets = _get_client_secrets_path()
    redirect_uri = _get_redirect_uri()

    flow = Flow.from_client_secrets_file(
        client_secrets,
        scopes=SCOPES,
        redirect_uri=redirect_uri,
    )
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",  # ensures refresh_token is returned for many accounts
        state=state,
    )
    return auth_url


def exchange_code_for_tokens(code: str) -> Dict[str, Any]:
    """
    Called during callback: exchanges 'code' for tokens.
    Returns a dict that can be saved for the user.
    """
    client_secrets = _get_client_secrets_path()
    redirect_uri = _get_redirect_uri()

    flow = Flow.from_client_secrets_file(
        client_secrets,
        scopes=SCOPES,
        redirect_uri=redirect_uri,
    )
    flow.fetch_token(code=code)

    creds = flow.credentials
    token_data = {
        "token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "scopes": list(creds.scopes) if creds.scopes else SCOPES,
    }
    return token_data


def credentials_from_dict(token_data: Dict[str, Any]) -> Credentials:
    creds = Credentials(
        token=token_data.get("token"),
        refresh_token=token_data.get("refresh_token"),
        token_uri=token_data.get("token_uri"),
        client_id=token_data.get("client_id"),
        client_secret=token_data.get("client_secret"),
        scopes=token_data.get("scopes") or SCOPES,
    )
    return creds


# -------------------------
# Storage hooks (DB/file)
# -------------------------

def save_user_credentials(user_email: str, token_data: Dict[str, Any]) -> None:
    """
    Default: saves to a JSON file under backend/app/.tokens/<email>.json
    If your project already stores tokens in SQLite, update this function to use db.py.
    """
    base = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".tokens")
    os.makedirs(base, exist_ok=True)

    safe = user_email.replace("@", "_at_").replace(".", "_")
    path = os.path.join(base, f"{safe}.json")

    with open(path, "w", encoding="utf-8") as f:
        json.dump(token_data, f)


def load_user_credentials(user_email: str) -> Optional[Credentials]:
    """
    Used by routes_workflows.py and gmail_service.py to load user creds.
    Default: loads from backend/app/.tokens/<email>.json
    """
    base = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".tokens")
    safe = user_email.replace("@", "_at_").replace(".", "_")
    path = os.path.join(base, f"{safe}.json")

    if not os.path.exists(path):
        return None

    with open(path, "r", encoding="utf-8") as f:
        token_data = json.load(f)

    creds = credentials_from_dict(token_data)

    # Refresh token if needed
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        # keep storage updated with new access token
        token_data["token"] = creds.token
        save_user_credentials(user_email, token_data)

    return creds