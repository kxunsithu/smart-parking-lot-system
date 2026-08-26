"""Email service for sending OTP emails."""
import aiosmtplib
from email.message import EmailMessage

from app.config.settings import settings


class EmailService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.smtp_from_email = settings.SMTP_FROM_EMAIL
        self.smtp_from_name = settings.SMTP_FROM_NAME
        self.use_tls = settings.SMTP_USE_TLS

    async def send_otp_email(self, to_email: str, otp_code: str) -> bool:
        """Send OTP code to user's email."""
        if not self.smtp_from_email or not self.smtp_user or not self.smtp_password:
            print(f"[DEV MODE] OTP for {to_email}: {otp_code}")
            return True

        try:
            message = EmailMessage()
            message["From"] = f"{self.smtp_from_name} <{self.smtp_from_email}>"
            message["To"] = to_email
            message["Subject"] = "Your Smart Parking Verification Code"

            body = f"""
Your verification code is: {otp_code}

This code will expire in {settings.OTP_EXPIRE_MINUTES} minutes.

If you didn't request this code, please ignore this email.
            """
            message.set_content(body)

            is_ssl_port = (self.smtp_port == 465)
            use_tls = is_ssl_port
            start_tls = self.use_tls if not is_ssl_port else False

            await aiosmtplib.send(
                message,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                use_tls=use_tls,
                start_tls=start_tls,
                timeout=30.0,
            )
            print(f"[EMAIL SENT] OTP sent to {to_email}")
            return True
        except Exception as e:
            print(f"[EMAIL FAILED] OTP for {to_email}: {otp_code}")
            print(f"[EMAIL ERROR] {e}")
            return False
