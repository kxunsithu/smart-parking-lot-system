"""Custom application exceptions used across services and repositories."""
from typing import Any, List, Optional


class AppException(Exception):
    """Base application exception mapped to an HTTP status code."""

    status_code: int = 500
    message: str = "An unexpected error occurred."

    def __init__(self, message: Optional[str] = None, errors: Optional[List[dict[str, Any]]] = None):
        self.message = message or self.message
        self.errors = errors
        super().__init__(self.message)


class NotFoundException(AppException):
    status_code = 404
    message = "Resource not found."


class ValidationException(AppException):
    status_code = 422
    message = "Validation failed."


class ConflictException(AppException):
    status_code = 409
    message = "Resource conflict."


class UnauthorizedException(AppException):
    status_code = 401
    message = "Unauthorized."


class ForbiddenException(AppException):
    status_code = 403
    message = "Forbidden. You do not have permission to perform this action."


class BadRequestException(AppException):
    status_code = 400
    message = "Bad request."
