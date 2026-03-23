"""
Database engine (lazy initialization).

The engine is only created when actually needed (for PostgreSQL operations).
The in-memory graph works without any database connection.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


def get_async_engine():
    from sqlalchemy.ext.asyncio import create_async_engine
    from app.config import DATABASE_URL
    return create_async_engine(DATABASE_URL, echo=False)


def get_async_session():
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
    engine = get_async_engine()
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    session_factory = get_async_session()
    async with session_factory() as session:
        yield session
