from app.core.security import create_access_token
from app.models import User, UserRole

STAFF_PAYLOAD = {
    "email": "new-gatekeeper@example.com",
    "password": "supersecret",
    "name": "New Gatekeeper",
    "role": "gatekeeper",
}


def _token_for(session, role: UserRole, email: str = "user@example.com") -> str:
    user = User(email=email, hashed_password="x", name="User", role=role)
    session.add(user)
    session.commit()
    session.refresh(user)
    return create_access_token(user_id=user.id, role=user.role.value)


def test_create_staff_account_requires_authentication(client):
    response = client.post("/admin/users", json=STAFF_PAYLOAD)

    assert response.status_code == 401


def test_create_staff_account_rejects_a_non_admin(client, session):
    token = _token_for(session, UserRole.organizer)

    response = client.post("/admin/users", json=STAFF_PAYLOAD, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 403


def test_create_staff_account_creates_a_gatekeeper(client, session):
    token = _token_for(session, UserRole.admin)

    response = client.post("/admin/users", json=STAFF_PAYLOAD, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 201
    body = response.json()
    assert body["role"] == "gatekeeper"
    assert body["email"] == STAFF_PAYLOAD["email"]


def test_create_staff_account_creates_an_organizer(client, session):
    token = _token_for(session, UserRole.admin)
    payload = {**STAFF_PAYLOAD, "email": "new-organizer@example.com", "role": "organizer"}

    response = client.post("/admin/users", json=payload, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 201
    assert response.json()["role"] == "organizer"


def test_create_staff_account_rejects_a_customer_role(client, session):
    token = _token_for(session, UserRole.admin)
    payload = {**STAFF_PAYLOAD, "role": "customer"}

    response = client.post("/admin/users", json=payload, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 422


def test_create_staff_account_rejects_an_admin_role(client, session):
    # Minting another admin from this screen was ruled out (ADR 0023):
    # StaffAccountCreate.role only accepts organizer/gatekeeper, so this
    # is rejected the same way "customer" is above, not a special case.
    token = _token_for(session, UserRole.admin)
    payload = {**STAFF_PAYLOAD, "role": "admin"}

    response = client.post("/admin/users", json=payload, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 422


def test_create_staff_account_rejects_a_duplicate_email(client, session):
    token = _token_for(session, UserRole.admin)
    client.post("/admin/users", json=STAFF_PAYLOAD, headers={"Authorization": f"Bearer {token}"})

    response = client.post("/admin/users", json=STAFF_PAYLOAD, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 409


def test_list_staff_accounts_requires_admin(client, session):
    token = _token_for(session, UserRole.organizer)

    response = client.get("/admin/users", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 403


def test_list_staff_accounts_only_returns_organizers_and_gatekeepers(client, session):
    admin_token = _token_for(session, UserRole.admin, email="admin@example.com")
    client.post("/admin/users", json=STAFF_PAYLOAD, headers={"Authorization": f"Bearer {admin_token}"})
    _token_for(session, UserRole.customer, email="customer@example.com")

    response = client.get("/admin/users", headers={"Authorization": f"Bearer {admin_token}"})

    assert response.status_code == 200
    emails = {user["email"] for user in response.json()}
    assert emails == {STAFF_PAYLOAD["email"]}
