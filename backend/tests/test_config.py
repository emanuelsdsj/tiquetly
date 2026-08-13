from app.core.config import Settings


def test_normalizes_a_legacy_postgres_scheme():
    settings = Settings(database_url="postgres://user:pass@host:5432/db")

    assert settings.database_url == "postgresql://user:pass@host:5432/db"


def test_leaves_a_standard_postgresql_url_untouched():
    settings = Settings(database_url="postgresql://user:pass@host:5432/db")

    assert settings.database_url == "postgresql://user:pass@host:5432/db"


def test_leaves_sqlite_untouched():
    settings = Settings(database_url="sqlite:///./eventos.db")

    assert settings.database_url == "sqlite:///./eventos.db"
