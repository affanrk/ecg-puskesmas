from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException
from core.config.setup import settings
from utils import logger

engine = create_engine(
    settings.DATABASE_URL,
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database session error: {e}")
        raise
    except Exception:
        raise
    finally:
        db.close()
