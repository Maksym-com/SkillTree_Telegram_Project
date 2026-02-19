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
    
    # 1. Залишаємо CASCADE на рівні бази даних для foreign key
    parent_id = Column(String, ForeignKey("skills.id", ondelete="CASCADE"), nullable=True)

    # 2. Виправляємо зв'язок:
    # Прибираємо backref і робимо зв'язок одностороннім (тільки від батька до дітей)
    # Cascade "all, delete-orphan" означає: якщо видалили батька, видаляй дітей.
    children = relationship(
        "Skill", 
        cascade="all, delete-orphan", 
        back_populates="parent_node", # Використовуємо явне посилання замість backref
        remote_side=[id]
    )
    
    # Явне посилання на батька без жодних каскадів на видалення
    parent_node = relationship("Skill", back_populates="children", remote_side=[id])