from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas

router = APIRouter()


def project_investment(principal: float, pmt: float, annual_rate: float, years: int):
    r = (annual_rate / 100) / 12
    months = years * 12
    points = []
    for m in range(months + 1):
        if r == 0:
            total = principal + pmt * m
        else:
            total = principal * (1 + r) ** m + pmt * (((1 + r) ** m - 1) / r)
        invested = principal + pmt * m
        points.append({
            "month": m,
            "year": round(m / 12, 2),
            "total": round(total, 2),
            "invested": round(invested, 2),
            "interest": round(total - invested, 2),
        })
    return points


@router.get("/", response_model=List[schemas.InvestmentOut])
def list_investments(db: Session = Depends(get_db)):
    return db.query(models.Investment).order_by(models.Investment.id.desc()).all()


@router.post("/", response_model=schemas.InvestmentOut)
def create_investment(inv: schemas.InvestmentCreate, db: Session = Depends(get_db)):
    db_inv = models.Investment(**inv.model_dump())
    db.add(db_inv)
    db.commit()
    db.refresh(db_inv)
    return db_inv


@router.put("/{inv_id}", response_model=schemas.InvestmentOut)
def update_investment(inv_id: int, inv: schemas.InvestmentUpdate, db: Session = Depends(get_db)):
    db_inv = db.query(models.Investment).filter(models.Investment.id == inv_id).first()
    if not db_inv:
        raise HTTPException(status_code=404, detail="Investimento não encontrado")
    for field, value in inv.model_dump(exclude_unset=True).items():
        setattr(db_inv, field, value)
    db.commit()
    db.refresh(db_inv)
    return db_inv


@router.delete("/{inv_id}")
def delete_investment(inv_id: int, db: Session = Depends(get_db)):
    db_inv = db.query(models.Investment).filter(models.Investment.id == inv_id).first()
    if not db_inv:
        raise HTTPException(status_code=404, detail="Investimento não encontrado")
    db.delete(db_inv)
    db.commit()
    return {"ok": True}


@router.get("/{inv_id}/projection")
def get_projection(inv_id: int, years: int = 10, annual_rate: float = None, db: Session = Depends(get_db)):
    db_inv = db.query(models.Investment).filter(models.Investment.id == inv_id).first()
    if not db_inv:
        raise HTTPException(status_code=404, detail="Investimento não encontrado")

    rate = annual_rate if annual_rate is not None else db_inv.annual_rate
    points = project_investment(db_inv.principal, db_inv.monthly_contribution, rate, years)

    # Downsample to yearly points for the chart (keep monthly for stats)
    yearly = [p for p in points if p["month"] % 12 == 0]
    final = points[-1]

    return {
        "investment_id": inv_id,
        "label": db_inv.label,
        "principal": db_inv.principal,
        "monthly_contribution": db_inv.monthly_contribution,
        "annual_rate": rate,
        "years": years,
        "final_total": final["total"],
        "final_invested": final["invested"],
        "final_interest": final["interest"],
        "chart_data": yearly,
    }
