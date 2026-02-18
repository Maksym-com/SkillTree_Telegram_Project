from sqlalchemy import Column, Integer, String, BigInteger
from database import Base  # Важливо: Base має бути імпортований саме так

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(BigInteger, unique=True, index=True)
    username = Column(String, nullable=True)