from sqlalchemy import Column, Integer, String, BigInteger, Float, ForeignKey
from sqlalchemy.orm import relationship, backref
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(BigInteger, unique=True, index=True)
    username = Column(String, nullable=True)
    
    # Зв'язок з навичками
    skills = relationship("Skill", back_populates="owner", cascade="all, delete-orphan")