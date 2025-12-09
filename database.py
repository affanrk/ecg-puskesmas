import os
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker, scoped_session, declarative_base

# Database configuration
DATABASE_USER = os.getenv("DATABASE_USER", "ecg_user")
DATABASE_PASSWORD = os.getenv("DATABASE_PASSWORD", "ecg_pass")
DATABASE_HOST = os.getenv("DATABASE_HOST", "localhost")
DATABASE_PORT = os.getenv("DATABASE_PORT", "5432")
DATABASE_NAME = os.getenv("DATABASE_NAME", "ecg_db")

DATABASE_URL = f"postgresql://{DATABASE_USER}:{DATABASE_PASSWORD}@{DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_NAME}"

# Create engine
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=False
)

# Create session factory
SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))

# [FIX] Define Base here so models.py can import it
Base = declarative_base()

def init_db():
    """Initialize database tables"""
    # [FIX] Import models HERE (inside the function) to avoid circular import error
    import models 
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    print("Database tables checked/created successfully")

def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()