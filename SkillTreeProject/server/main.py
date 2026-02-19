from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import SessionLocal, engine, Base
from models import Skill

# Створення таблиць
Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def seed_db(db: Session):
    if db.query(Skill).first() is None:
        initial_skills = [
            Skill(id="root", name="Core", level=100, parent_id=None, pos_x=400, pos_y=50),
            Skill(id="python", name="Python", level=80, parent_id="root", pos_x=200, pos_y=200),
            Skill(id="js", name="JavaScript", level=60, parent_id="root", pos_x=600, pos_y=200),
            Skill(id="fastapi", name="FastAPI", level=30, parent_id="python", pos_x=100, pos_y=350),
            Skill(id="react", name="React", level=45, parent_id="js", pos_x=700, pos_y=350),
            Skill(id="django", name="Django", level=10, parent_id="python", pos_x=300, pos_y=350),
            Skill(id="sql", name="SQL", level=20, parent_id="root", pos_x=400, pos_y=350),
        ]
        db.add_all(initial_skills)
        db.commit()

@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        seed_db(db)
    finally:
        db.close()

class SkillCreate(BaseModel):
    id: str
    name: str
    parent_id: str

@app.post("/skills/add")
def add_skill(skill_data: SkillCreate, db: Session = Depends(get_db)):
    # Перевірка на дублікат ID
    existing = db.query(Skill).filter(Skill.id == skill_data.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Skill already exists")

    parent = db.query(Skill).filter(Skill.id == skill_data.parent_id).first()
    
    if not parent:
        # Якщо батько не вказаний або не знайдений, робимо його кореневим
        new_x, new_y = 400, 100
    else:
        children_count = db.query(Skill).filter(Skill.parent_id == skill_data.parent_id).count()
        
        horizontal_step = 140
        vertical_step = 120
        
        offset_multiplier = (children_count + 1) // 2
        direction = 1 if children_count % 2 != 0 else -1
        
        if children_count == 0:
            new_x = parent.pos_x
        else:
            new_x = parent.pos_x + (direction * offset_multiplier * horizontal_step)
            
        new_y = parent.pos_y + vertical_step

    new_skill = Skill(
        id=skill_data.id,
        name=skill_data.name,
        level=0.0,
        pos_x=new_x,
        pos_y=new_y,
        parent_id=skill_data.parent_id if parent else None
    )
    
    db.add(new_skill)
    db.commit()
    return {"status": "success", "id": new_skill.id}

@app.delete("/skills/{skill_id}")
def delete_skill(skill_id: str, db: Session = Depends(get_db)):
    # 1. Знаходимо скіл, який хочемо видалити
    target_skill = db.query(Skill).filter(Skill.id == skill_id).first()
    
    if not target_skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    # ЗАХИСТ: Не дозволяємо видалити корінь "root" через API без додаткових перевірок
    if target_skill.id == "root":
         raise HTTPException(status_code=403, detail="Cannot delete root skill")

    # 2. Спочатку знаходимо всіх прямих дітей і видаляємо їх
    # synchronize_session=False важливо для коректного виконання масового видалення
    db.query(Skill).filter(Skill.parent_id == skill_id).delete(synchronize_session=False)

    # 3. Тепер видаляємо сам скіл
    db.delete(target_skill)
    
    db.commit()
    return {"status": "deleted", "id": skill_id}

@app.get("/skills")
def get_skills(db: Session = Depends(get_db)):
    skills = db.query(Skill).all()
    return {
        s.id: {
            "name": s.name,
            "level": s.level,
            "parent": s.parent_id,
            "pos": {"x": s.pos_x, "y": s.pos_y}
        } for s in skills
    }

@app.post("/train/{skill_id}")
def train(skill_id: str, db: Session = Depends(get_db)):
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    
    skill.level = min(100, skill.level + 10)
    db.commit()
    db.refresh(skill)
    return {"id": skill.id, "level": skill.level}