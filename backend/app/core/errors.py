class AppError(Exception):
    """Base for domain errors that the central handler in main.py turns into a JSON response.

    Services raise these instead of fastapi.HTTPException, so they stay free of HTTP
    concerns and routes never need a try/except of their own.
    """

    status_code = 400

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class EmailAlreadyRegisteredError(AppError):
    status_code = 409


class InvalidCredentialsError(AppError):
    status_code = 401


class ForbiddenError(AppError):
    status_code = 403


class CatalogProviderError(AppError):
    """Raised when an external catalog API (Ticketmaster, TMDb) is unreachable,
    misconfigured, or returns something the adapter cannot make sense of.
    """

    status_code = 502


class EventNotFoundError(AppError):
    status_code = 404


class WrongReservationModeError(AppError):
    status_code = 422


class SoldOutError(AppError):
    """The atomic capacity/seat check lost the race: nothing was oversold,
    the request just arrived too late to get what was left.
    """

    status_code = 409


class ReservationNotFoundError(AppError):
    status_code = 404


class ReservationNotPendingError(AppError):
    """The reservation already moved past `pending` (paid, failed or
    cancelled), so it cannot be paid again.
    """

    status_code = 409


class InvalidTestCardError(AppError):
    """The card number does not match one of the fixed test numbers this
    simulation recognizes (see ADR 0010). Not a real card validation.
    """

    status_code = 422
