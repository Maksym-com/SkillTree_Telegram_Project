from sqlalchemy import Column, Integer, String, BigInteger, Float, ForeignKey
from sqlalchemy.orm import relationship, backref
from database import Base

class Skill(Base):
    __tablename__ = "skills"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    level = Column(Float, default=0.0)
    pos_x = Column(Integer)
    pos_y = Column(Integer)
    
    # FK на користувача
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    owner = relationship("User", back_populates="skills")

    # FK на самого себе (батьківська навичка)
    parent_id = Column(String, ForeignKey("skills.id", ondelete="CASCADE"), nullable=True)

    # Зв'язок з батьком (Many-to-One)
    parent = relationship(
        "Skill", 
        remote_side=[id], 
        back_populates="children"
    )

    # Зв'язок з дітьми (One-to-Many)
    children = relationship(
        "Skill",
        back_populates="parent",
        cascade="all, delete-orphan",
        single_parent=True
    )