import hashlib
import hmac
from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.core.errors import InvalidCredentialsError, InvalidTicketSignatureError

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(*, user_id: int, role: str) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": str(user_id), "role": role, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise InvalidCredentialsError("AUTH_TOKEN_INVALID", "invalid or expired token") from exc


def sign_ticket_code(public_code: str) -> str:
    return hmac.new(settings.qr_hmac_secret.encode(), public_code.encode(), hashlib.sha256).hexdigest()


def build_qr_payload(public_code: str) -> str:
    """What actually goes in the QR: the ticket's public_code plus its
    HMAC signature, so a payload cannot be hand-crafted for a public_code
    that was never issued, or edited to point at a different one (ADR
    0012). Never sign the numeric id; that is sequential and would make
    ticket enumeration trivial.
    """
    return f"{public_code}.{sign_ticket_code(public_code)}"


def verify_qr_payload(payload: str) -> str:
    """Returns the public_code embedded in payload if its signature
    checks out, raises InvalidTicketSignatureError otherwise. Constant
    time comparison (hmac.compare_digest), so validating a ticket cannot
    leak the correct signature through timing.
    """
    try:
        public_code, signature = payload.rsplit(".", 1)
    except ValueError as exc:
        raise InvalidTicketSignatureError("TICKET_CODE_MALFORMED", "malformed ticket code") from exc
    if not hmac.compare_digest(sign_ticket_code(public_code), signature):
        raise InvalidTicketSignatureError("TICKET_SIGNATURE_INVALID", "ticket signature does not match")
    return public_code
