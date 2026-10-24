import os
import tempfile

import pytest
from httpx import AsyncClient

# Isolated test database and test secret (must be set before importing the app)
_TEST_DB = os.path.join(tempfile.mkdtemp(), "reviflow-test.db")
os.environ.setdefault("DATABASE_URL", f"sqlite+aiosqlite:///{_TEST_DB}")
os.environ.setdefault("SECRET_KEY", "test-secret-key-0123456789abcdef0123456789")

from app.main import app  # noqa: E402
from app.core.db import create_db_and_tables  # noqa: E402

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture(scope="module")
async def client():
    await create_db_and_tables()
    async with AsyncClient(app=app, base_url="http://test") as c:
        yield c
