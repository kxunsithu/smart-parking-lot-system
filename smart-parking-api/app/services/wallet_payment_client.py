"""HTTP client for the digital wallet backend external payment API.

Each WalletAccount stores the X-API-Key of an external system registered in the
digital wallet backend, so the API key is supplied per request rather than being
a single server-wide credential.
"""
import httpx

from app.config.settings import settings
from app.core.exceptions import BadRequestException


class WalletPaymentClient:
    """Speaks to the wallet backend's external payment endpoints (X-API-Key auth)."""

    def __init__(self, base_url: str):
        self.base_url = (base_url or "").rstrip("/")

    def initiate(
        self,
        customer_phone: str,
        amount: float,
        order_reference: str,
        description: str | None = None,
        redirect_url: str | None = None,
        api_key: str | None = None,
    ) -> dict:
        """Ask the wallet to create a pending external payment and send an OTP to the payer."""
        payload: dict = {
            "customer_phone": customer_phone,
            "amount": float(amount),
            "order_reference": order_reference,
        }
        if description:
            payload["description"] = description
        if redirect_url:
            payload["redirect_url"] = redirect_url
        return self._post("/api/external/payments/initiate", payload, api_key)

    def confirm(self, payment_reference: str, otp_code: str, pin: str, api_key: str | None = None) -> dict:
        """Verify OTP + PIN in the wallet and complete the transfer."""
        return self._post(
            "/api/external/payments/confirm",
            {
                "payment_reference": payment_reference,
                "otp": otp_code,
                "pin": pin,
            },
            api_key,
        )

    def get_payment_status(self, payment_reference: str, api_key: str | None = None) -> dict:
        """Poll the wallet for the current status of an external payment."""
        return self._get(
            f"/api/external/payments/{payment_reference}",
            api_key,
            "The receiving wallet account is missing its API key. "
            "Please update the payment account configuration.",
        )

    def resolve_api_key(self, api_key: str | None = None) -> dict:
        """Resolve an external-system API key to its registered system + account details."""
        return self._get(
            "/api/external/system-info",
            api_key,
            "Please enter the wallet API key to verify.",
        )

    def _get(self, path: str, api_key: str | None, missing_key_message: str) -> dict:
        if not self.base_url:
            raise BadRequestException(
                "Wallet payment is not configured on this server yet. "
                "Please contact the administrator."
            )
        if not api_key:
            raise BadRequestException(missing_key_message)
        headers = {"X-API-Key": api_key, "Accept": "application/json"}
        try:
            with httpx.Client(base_url=self.base_url, headers=headers, timeout=60.0) as client:
                resp = client.get(path)
        except httpx.TimeoutException as exc:
            raise BadRequestException(
                "The wallet service is taking too long to respond. Please try again later."
            ) from exc
        except httpx.HTTPError as exc:
            raise BadRequestException(
                "Could not reach the wallet service. Please try again later."
            ) from exc
        return self._parse(resp)

    def _post(self, path: str, payload: dict, api_key: str | None) -> dict:
        if not self.base_url:
            raise BadRequestException(
                "Wallet payment is not configured on this server yet. "
                "Please contact the administrator."
            )
        if not api_key:
            raise BadRequestException(
                "The receiving wallet account is missing its API key. "
                "Please update the payment account configuration."
            )
        headers = {"X-API-Key": api_key, "Accept": "application/json"}
        try:
            with httpx.Client(base_url=self.base_url, headers=headers, timeout=180.0) as client:
                resp = client.post(path, json=payload)
        except httpx.TimeoutException as exc:
            raise BadRequestException(
                "The wallet service is taking too long to respond. Please try again later."
            ) from exc
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
    return WalletPaymentClient(settings.WALLET_API_BASE_URL)
