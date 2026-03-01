from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    google_email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class OAuthAccount(Base):
    __tablename__ = "oauth_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    provider = Column(String, default="google")
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    token_expiry = Column(String, nullable=True)
    scopes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SheetConnection(Base):
    __tablename__ = "sheet_connections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    spreadsheet_id = Column(String, nullable=False)
    spreadsheet_url = Column(Text, nullable=False)
    spreadsheet_name = Column(String, nullable=True)
    selected_tab = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ColumnMapping(Base):
    __tablename__ = "column_mappings"

    id = Column(Integer, primary_key=True, index=True)
    sheet_connection_id = Column(Integer, ForeignKey("sheet_connections.id"), nullable=False)
    vendor_name_col = Column(String, nullable=False)
    template_type_col = Column(String, nullable=False)
    to_email_col = Column(String, nullable=False)
    cc_email_col = Column(String, nullable=True)
    thread_id_col = Column(String, nullable=True)
    message_id_col = Column(String, nullable=True)
    subject_col = Column(String, nullable=True)
    remarks_col = Column(String, nullable=True)

class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    template_name = Column(String, nullable=False)
    template_type = Column(String, nullable=False)
    subject_pattern = Column(Text, nullable=False)
    html_body = Column(Text, nullable=False)

class SendLog(Base):
    __tablename__ = "send_logs"

    id = Column(Integer, primary_key=True, index=True)
    vendor_name = Column(String, nullable=False)
    subject = Column(Text, nullable=False)
    to_emails = Column(Text, nullable=False)
    cc_emails = Column(Text, nullable=True)
    gmail_thread_id = Column(String, nullable=True)
    gmail_message_id = Column(String, nullable=True)
    send_status = Column(String, nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())