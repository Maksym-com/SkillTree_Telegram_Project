from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Дозволяє запити з будь-якого тунелю
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Динамическая база данных с координатами для отрисовки (x, y)
skills_db = {
    "root": {"name": "Core", "level": 100, "parent": None, "pos": {"x": 400, "y": 50}},
    "python": {"name": "Python", "level": 80, "parent": "root", "pos": {"x": 200, "y": 200}},
    "js": {"name": "JavaScript", "level": 60, "parent": "root", "pos": {"x": 600, "y": 200}},
    "fastapi": {"name": "FastAPI", "level": 30, "parent": "python", "pos": {"x": 100, "y": 350}},
    "react": {"name": "React", "level": 45, "parent": "js", "pos": {"x": 700, "y": 350}},
    "django": {"name": "Django", "level": 10, "parent": "python", "pos": {"x": 300, "y": 350}},
}

DECAY_RATE = 0.005 

@app.get("/skills")
def get_skills():
    now = datetime.now()
    # Логика деградации (упрощенно для примера)
    return skills_db

@app.post("/train/{skill_id}")
def train(skill_id: str):
    if skill_id in skills_db:
        skills_db[skill_id]["level"] = min(100, skills_db[skill_id]["level"] + 10)
    return skills_db[skill_id]