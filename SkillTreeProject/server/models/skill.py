from sqlalchemy import Column, String, Float, Integer, ForeignKey
from sqlalchemy.orm import relationship, backref
from database import Base

class Skill(Base):
    __tablename__ = "skills"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    level = Column(Float, default=0.0)
    pos_x = Column(Integer)
    pos_y = Column(Integer)
    parent_id = Column(String, ForeignKey("skills.id", ondelete="CASCADE"), nullable=True)

    # Чистий рекурсивний зв'язок:
    # 1. Видаляє дітей при видаленні батька (cascade)
    # 2. single_parent=True прибирає помилку з твого лога
    # 3. overlaps прибирає Warning про конфлікт з parent_id
    children = relationship(
        "Skill",
        cascade="all, delete-orphan",
        single_parent=True,
        backref=backref("parent", remote_side=[id], overlaps="children"),
        overlaps="children"
    )