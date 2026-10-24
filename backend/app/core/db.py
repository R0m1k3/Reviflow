from collections.abc import AsyncGenerator
from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel
from app.config import settings

engine = create_async_engine(settings.DATABASE_URL)
async_session_maker = async_sessionmaker(engine, expire_on_commit=False)


def _migrate_revision_owner(sync_conn) -> None:
    """Add revision.owner_user_id on existing databases (create_all does not add columns)
    and backfill it from the learner's parent account (or the learner account itself)."""
    inspector = inspect(sync_conn)
    if "revision" not in inspector.get_table_names():
        return
    columns = {c["name"] for c in inspector.get_columns("revision")}
    if "owner_user_id" in columns:
        return

    revision_table = SQLModel.metadata.tables["revision"]
    column_type = revision_table.c.owner_user_id.type.compile(dialect=sync_conn.dialect)
    sync_conn.execute(text(f"ALTER TABLE revision ADD COLUMN owner_user_id {column_type}"))
    sync_conn.execute(text("CREATE INDEX IF NOT EXISTS ix_revision_owner_user_id ON revision (owner_user_id)"))
    # Legacy rows: owner = parent of the learner account when there is one, else the learner account.
    # Rows without learner stay NULL (only accessible to superusers).
    sync_conn.execute(text(
        """
        UPDATE revision SET owner_user_id = (
            SELECT COALESCE(u.parent_id, u.id)
            FROM learner_profiles lp JOIN users u ON u.id = lp.user_id
            WHERE lp.id = revision.learner_id
        )
        WHERE owner_user_id IS NULL AND learner_id IS NOT NULL
        """
    ))


async def create_db_and_tables():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        await conn.run_sync(_migrate_revision_owner)

async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session
