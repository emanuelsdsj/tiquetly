import pytest

from app.core.errors import InvalidCredentialsError, InvalidTicketSignatureError
from app.core.security import (
    build_qr_payload,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
    verify_qr_payload,
)


def test_hash_password_is_not_the_plain_password():
    hashed = hash_password("correct-horse")

    assert hashed != "correct-horse"
    assert verify_password("correct-horse", hashed)
    assert not verify_password("wrong-password", hashed)


def test_access_token_roundtrip():
    token = create_access_token(user_id=42, role="customer")

    payload = decode_access_token(token)

    assert payload["sub"] == "42"
    assert payload["role"] == "customer"


def test_decode_rejects_a_tampered_token():
    token = create_access_token(user_id=1, role="customer")
    tampered = token[:-1] + ("a" if token[-1] != "a" else "b")

    with pytest.raises(InvalidCredentialsError):
        decode_access_token(tampered)


def test_qr_payload_roundtrip():
    payload = build_qr_payload("abc-123")

    assert verify_qr_payload(payload) == "abc-123"


def test_qr_payload_rejects_a_tampered_signature():
    payload = build_qr_payload("abc-123")
    tampered = payload[:-1] + ("a" if payload[-1] != "a" else "b")

    with pytest.raises(InvalidTicketSignatureError):
        verify_qr_payload(tampered)


def test_qr_payload_rejects_a_public_code_with_someone_elses_signature():
    _, signature = build_qr_payload("abc-123").split(".", 1)

    with pytest.raises(InvalidTicketSignatureError):
        verify_qr_payload(f"different-code.{signature}")


def test_qr_payload_rejects_a_malformed_payload():
    with pytest.raises(InvalidTicketSignatureError):
        verify_qr_payload("not-a-valid-payload")
