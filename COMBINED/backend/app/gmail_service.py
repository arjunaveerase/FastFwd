import base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from email.utils import formataddr
from typing import Optional

from googleapiclient.discovery import build


def _service(credentials):
    return build("gmail", "v1", credentials=credentials)


def get_message_thread_context(credentials, gmail_message_id: str):
    """
    Returns Gmail thread metadata plus the RFC822 Message-ID header.
    The stored message_id in the sheet / DB is the Gmail API message resource id,
    not the RFC822 Message-ID header. For same-thread replies, we must recover the
    header from Gmail first.
    """
    if not gmail_message_id:
        return None

    service = _service(credentials)
    msg = (
        service.users()
        .messages()
        .get(
            userId="me",
            id=gmail_message_id,
            format="metadata",
            metadataHeaders=["Message-ID", "References"],
        )
        .execute()
    )

    headers = {
        h.get("name", "").lower(): h.get("value", "")
        for h in msg.get("payload", {}).get("headers", [])
    }

    return {
        "thread_id": msg.get("threadId", ""),
        "rfc822_message_id": headers.get("message-id", ""),
        "references": headers.get("references", ""),
    }


def send_email(
    credentials,
    to_emails,
    cc_emails,
    subject,
    html_body,
    attachment_filename=None,
    attachment_bytes=None,
    thread_id: Optional[str] = None,
    reply_message_id: Optional[str] = None,
    references_header: Optional[str] = None,
    sender_name: str = "Arjun SE",
    sender_email: Optional[str] = None,
):
    service = _service(credentials)

    msg = MIMEMultipart("mixed")
    effective_sender_email = sender_email or "me"
    msg["From"] = formataddr((sender_name, effective_sender_email))
    msg["To"] = ", ".join(to_emails or [])
    if cc_emails:
        msg["Cc"] = ", ".join(cc_emails)
    msg["Subject"] = subject

    if reply_message_id:
        msg["In-Reply-To"] = reply_message_id
        combined_refs = " ".join(
            x.strip()
            for x in [references_header or "", reply_message_id]
            if x and x.strip()
        ).strip()
        if combined_refs:
            msg["References"] = combined_refs

    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(html_body, "html"))
    msg.attach(alt)

    if attachment_filename and attachment_bytes:
        part = MIMEBase("application", "octet-stream")
        part.set_payload(attachment_bytes)
        encoders.encode_base64(part)
        part.add_header(
            "Content-Disposition",
            f'attachment; filename="{attachment_filename}"',
        )
        msg.attach(part)

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    body = {"raw": raw}
    if thread_id:
        body["threadId"] = thread_id

    sent = service.users().messages().send(userId="me", body=body).execute()
    return sent
