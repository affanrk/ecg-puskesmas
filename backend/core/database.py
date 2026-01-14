from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session, declarative_base
from backend.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_size=20,          # Increased pool size for high concurrency
    max_overflow=40,
    pool_pre_ping=True,
    echo=False
)

SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
