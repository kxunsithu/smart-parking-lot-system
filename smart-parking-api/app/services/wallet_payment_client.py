"""HTTP client for the digital wallet system merchant payment API."""
import httpx

from app.config.settings import settings
from app.core.exceptions import BadRequestException


class WalletPaymentClient:
    """Speaks to the wallet backend's merchant endpoints (X-API-Key auth)."""

    def __init__(self, base_url: str, api_key: str):
        self.base_url = (base_url or "").rstrip("/")
        self.api_key = api_key or ""

    def _ensure_configured(self) -> None:
        if not self.base_url or not self.api_key:
            raise BadRequestException(
                "Wallet payment is not configured on this server yet. "
                "Please contact the administrator."
            )

    def _headers(self) -> dict:
        return {"X-API-Key": self.api_key, "Accept": "application/json"}

    def initiate(
        self,
        customer_phone: str,
        amount: float,
        reference: str,
        description: str | None = None,
    ) -> dict:
        """Ask the wallet to create a pending merchant payment and issue an OTP."""
        self._ensure_configured()
        payload: dict = {
            "customer_phone": customer_phone,
            "amount": float(amount),
            "reference": reference,
        }
        if description:
            payload["description"] = description
        return self._post("/api/merchants/payment/initiate", payload)

    def confirm(self, payment_id: int, otp_code: str, pin: str) -> dict:
        """Verify OTP + PIN in the wallet and complete the transfer."""
        self._ensure_configured()
        payload = {
            "payment_id": int(payment_id),
            "otp_code": otp_code,
            "pin": pin,
        }
        return self._post("/api/merchants/payment/confirm", payload)

    def _post(self, path: str, payload: dict) -> dict:
        try:
            with httpx.Client(base_url=self.base_url, headers=self._headers(), timeout=20.0) as client:
                resp = client.post(path, json=payload)
        except httpx.HTTPError as exc:
            raise BadRequestException(
                "Could not reach the wallet service. Please try again later."
            ) from exc
        return self._parse(resp)

    def _parse(self, resp: httpx.Response) -> dict:
        try:
            body = resp.json()
        except ValueError as exc:
            raise BadRequestException("Unexpected response from the wallet service.") from exc
        if resp.status_code >= 400 or not body.get("success"):
            message = (
                body.get("message", "Wallet payment failed.")
                if isinstance(body, dict)
                else "Wallet payment failed."
            )
            raise BadRequestException(message)
        return body.get("data", {})


def get_wallet_client() -> WalletPaymentClient:
    return WalletPaymentClient(
        settings.WALLET_API_BASE_URL,
        settings.WALLET_MERCHANT_API_KEY,
    )
