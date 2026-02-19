from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel

# Імпортуємо налаштування бази та моделі з твоїх нових файлів
from database import SessionLocal, engine, Base
from models import Skill
from models import User

# Створюємо таблиці в базі даних (якщо вони ще не створені)
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Налаштування CORS (залишаємо як було)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Функція для отримання доступу до бази даних (Dependency Injection)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Функція для початкового заповнення бази (Seed), щоб дерево не було пустим
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


# Викликаємо заповнення при старті додатка
@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        seed_db(db)
    finally:
        db.close()


# Описуємо, які дані ми чекаємо від фронтенду
class SkillCreate(BaseModel):
    id: str
    name: str
    parent_id: str


@app.post("/skills/add")
def add_skill(skill_data: SkillCreate, db: Session = Depends(get_db)):
    # Перевірка на дублікат ID, щоб не «лягла» база
    existing = db.query(Skill).filter(Skill.id == skill_data.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Skill with this ID already exists")

    parent = db.query(Skill).filter(Skill.id == skill_data.parent_id).first()
    
    if not parent:
        new_x, new_y = 400, 100
    else:
        children_count = db.query(Skill).filter(Skill.parent_id == skill_data.parent_id).count()
        
        horizontal_step = 140
        vertical_step = 120
        
        # Покращена логіка розрахунку (0, 1, -1, 2, -2...)
        offset_multiplier = (children_count + 1) // 2
        direction = 1 if children_count % 2 != 0 else -1
        
        # Якщо це перша дитина, вона йде прямо під батька (direction 0)
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
        parent_id=skill_data.parent_id
    )
    
    db.add(new_skill)
    db.commit()
    return {"status": "success", "id": new_skill.id}


@app.delete("/skills/{skill_id}")
def delete_skill(skill_id: str, db: Session = Depends(get_db)):
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    
    # Завдяки CASCADE у моделях, це видалить і скіл, і ВСІХ його нащадків
    db.delete(skill)
    db.commit()
    return {"status": "deleted", "id": skill_id}


@app.get("/skills")
def get_skills(db: Session = Depends(get_db)):
    # Отримуємо всі навички з БД
    skills = db.query(Skill).all()
    
    # Форматуємо дані назад у словник, який очікує твій React-фронтенд
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
    # Шукаємо навичку в реальній базі
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    
    # Оновлюємо рівень
    skill.level = min(100, skill.level + 10)
    
    db.commit()  # Зберігаємо зміни
    db.refresh(skill)  # Отримуємо оновлені дані з бази
    
    return {
        "id": skill.id, 
        "name": skill.name, 
        "level": skill.level
    }