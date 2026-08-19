CREDENTIALS = {"email": "ana@example.com", "password": "senha123", "name": "Ana"}


def test_register_creates_a_customer(client):
    response = client.post("/auth/register", json=CREDENTIALS)

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == CREDENTIALS["email"]
    assert body["role"] == "customer"
    assert "password" not in body
    assert "hashed_password" not in body


def test_register_rejects_a_short_password(client):
    # The frontend enforces minLength=6 on the input, but that is only a
    # client-side constraint; a direct API call must be rejected too.
    response = client.post("/auth/register", json={**CREDENTIALS, "password": "abc12"})

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_register_rejects_a_duplicate_email(client):
    client.post("/auth/register", json=CREDENTIALS)

    response = client.post("/auth/register", json=CREDENTIALS)

    assert response.status_code == 409
    body = response.json()
    assert body["code"] == "EMAIL_ALREADY_REGISTERED"
    assert body["params"] == {"email": CREDENTIALS["email"]}


def test_login_returns_a_token(client):
    client.post("/auth/register", json=CREDENTIALS)

    response = client.post(
        "/auth/login",
        data={"username": CREDENTIALS["email"], "password": CREDENTIALS["password"]},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_rejects_the_wrong_password(client):
    client.post("/auth/register", json=CREDENTIALS)

    response = client.post(
        "/auth/login",
        data={"username": CREDENTIALS["email"], "password": "wrong-password"},
    )

    assert response.status_code == 401
    assert response.json()["code"] == "AUTH_INVALID_CREDENTIALS"


def test_me_requires_a_token(client):
    response = client.get("/auth/me")

    assert response.status_code == 401


def test_me_returns_the_authenticated_user(client):
    client.post("/auth/register", json=CREDENTIALS)
    login = client.post(
        "/auth/login",
        data={"username": CREDENTIALS["email"], "password": CREDENTIALS["password"]},
    )
    token = login.json()["access_token"]

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["email"] == CREDENTIALS["email"]
