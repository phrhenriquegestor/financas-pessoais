from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from dateutil.relativedelta import relativedelta
from database import get_db
import models, schemas

router = APIRouter()


def calculate_timeline(target: float, current: float, monthly: float):
    if monthly <= 0:
        return None
    remaining = target - current
    if remaining <= 0:
        return {"months": 0, "target_date": date.today().isoformat(), "progress": 100.0, "chart_data": []}

    months = -(-int(remaining // monthly)) if remaining % monthly == 0 else int(remaining // monthly) + 1
    target_date = date.today() + relativedelta(months=months)

    chart_data = []
    for m in range(months + 1):
        saved = min(current + monthly * m, target)
        label_date = date.today() + relativedelta(months=m)
        chart_data.append({
            "month": m,
            "saved": round(saved, 2),
            "label": label_date.strftime("%b/%Y"),
        })

    return {
        "months": months,
        "target_date": target_date.isoformat(),
        "target_date_label": target_date.strftime("%B de %Y"),
        "progress": round((current / target) * 100, 1),
        "chart_data": chart_data,
    }


@router.get("/", response_model=List[schemas.GoalOut])
def list_goals(db: Session = Depends(get_db)):
    return db.query(models.Goal).order_by(models.Goal.priority, models.Goal.id).all()


@router.post("/", response_model=schemas.GoalOut)
def create_goal(goal: schemas.GoalCreate, db: Session = Depends(get_db)):
    db_goal = models.Goal(**goal.model_dump())
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal


@router.put("/{goal_id}", response_model=schemas.GoalOut)
def update_goal(goal_id: int, goal: schemas.GoalUpdate, db: Session = Depends(get_db)):
    db_goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    for field, value in goal.model_dump(exclude_unset=True).items():
        setattr(db_goal, field, value)
    db.commit()
    db.refresh(db_goal)
    return db_goal


@router.delete("/{goal_id}")
def delete_goal(goal_id: int, db: Session = Depends(get_db)):
    db_goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    db.delete(db_goal)
    db.commit()
    return {"ok": True}


@router.get("/{goal_id}/timeline")
def get_timeline(goal_id: int, db: Session = Depends(get_db)):
    db_goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    result = calculate_timeline(db_goal.target_amount, db_goal.current_savings, db_goal.monthly_savings)
    if result is None:
        raise HTTPException(status_code=400, detail="Aporte mensal deve ser maior que zero")
    return {**result, "goal_id": goal_id, "label": db_goal.label,
            "target_amount": db_goal.target_amount, "current_savings": db_goal.current_savings}


@router.post("/calculate")
def calculate_goal(target_amount: float, current_savings: float = 0, monthly_savings: float = 0):
    result = calculate_timeline(target_amount, current_savings, monthly_savings)
    if result is None:
        return {"error": "Aporte mensal deve ser maior que zero"}
    return result
