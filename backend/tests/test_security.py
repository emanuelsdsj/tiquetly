import pytest

from app.core.errors import InvalidCredentialsError
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password


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
