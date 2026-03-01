from pydantic import BaseModel
from typing import List, Optional


class SheetConnectRequest(BaseModel):
    user_email: str
    spreadsheet_url: str


class SelectTabRequest(BaseModel):
    connection_id: int
    selected_tab: str


class MappingRequest(BaseModel):
    sheet_connection_id: int
    vendor_name_col: str
    template_type_col: str
    to_email_col: str
    cc_email_col: str
    thread_id_col: str
    message_id_col: str
    subject_col: str
    remarks_col: str


class PreviewRequest(BaseModel):
    user_email: str
    connection_id: int
    vendor_name: str
    template_type: str
    sender_name: Optional[str] = "Arjun SE"


class SendRequest(BaseModel):
    user_email: str
    connection_id: int
    vendor_name: str
    template_type: str
    to_emails: List[str]
    cc_emails: List[str]
    sender_name: Optional[str] = "Arjun SE"