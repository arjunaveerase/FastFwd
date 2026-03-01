from __future__ import annotations

import json
import os
from typing import Optional, Dict, Any

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request


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
    Priority:
    1. GOOGLE_CLIENT_SECRET_FILE env var
    2. Render Secret File path: /etc/secrets/client_secret.json
    3. Local fallback: backend/app/client_secret.json
    """
    env_path = os.getenv("GOOGLE_CLIENT_SECRET_FILE", "").strip()
    if env_path and os.path.exists(env_path):
        return env_path

    render_secret = "/etc/secrets/client_secret.json"
    if os.path.exists(render_secret):
        return render_secret

    here = os.path.dirname(os.path.abspath(__file__))
    local_path = os.path.join(here, "client_secret.json")
    return local_path


def _get_redirect_uri() -> str:
    """
    Must match Google Cloud OAuth redirect URI exactly.
    """
    return os.getenv(
        "GOOGLE_REDIRECT_URI",
        "https://fastfwd.onrender.com/auth/google/callback",
    ).strip()


def build_google_auth_url(state: Optional[str] = None) -> str:
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
        prompt="consent",
        state=state,
    )
    return auth_url


def exchange_code_for_tokens(code: str) -> Dict[str, Any]:
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
    return Credentials(
        token=token_data.get("token"),
        refresh_token=token_data.get("refresh_token"),
        token_uri=token_data.get("token_uri"),
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