# У твоєму models.py це має виглядати приблизно так:
from sqlalchemy import Column, String, Float, Integer, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Skill(Base):
    __tablename__ = "skills"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    level = Column(Float, default=0.0)
    pos_x = Column(Integer)
    pos_y = Column(Integer)
    parent_id = Column(String, ForeignKey("skills.id", ondelete="CASCADE"), nullable=True)

    # Рекурсивний зв'язок для автоматичного видалення
    children = relationship("Skill", cascade="all, delete", backref="parent", remote_side=[id])