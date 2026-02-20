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
    parent_id = Column(String, ForeignKey("skills.id", ondelete="CASCADE"), nullable=True)
    
    # НОВЕ: Прив'язка до користувача
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    owner = relationship("User", back_populates="skills")

    children = relationship(
        "Skill",
        cascade="all, delete-orphan",
        single_parent=True,
        backref=backref("parent", remote_side=[id], overlaps="children"),
        overlaps="children"
    )