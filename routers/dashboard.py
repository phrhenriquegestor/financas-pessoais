from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models

router = APIRouter()

FREQUENCY_MULTIPLIERS = {
    "weekly": 52 / 12,
    "biweekly": 26 / 12,
    "monthly": 1.0,
    "annual": 1 / 12,
    "once": 0.0,
}

CATEGORY_LABELS = {
    "housing": "Moradia",
    "utilities": "Utilidades",
    "insurance": "Seguros",
    "subscription": "Assinaturas",
    "loan": "Empréstimos",
    "other": "Outros",
    "shopping": "Compras",
    "food": "Alimentação",
    "travel": "Viagem",
    "health": "Saúde",
}


def compute_health_score(income, debts, credit_used, credit_limit, has_investments, has_goals):
    score = 0

    # Savings rate (30 pts)
    if income > 0:
        savings_rate = (income - debts - credit_used) / income
        if savings_rate >= 0.20:
            score += 30
        elif savings_rate >= 0.10:
            score += 20
        elif savings_rate > 0:
            score += 10

    # Debt-to-income (25 pts)
    if income > 0:
        dti = debts / income
        if dti < 0.30:
            score += 25
        elif dti < 0.50:
            score += 15
        elif dti < 0.70:
            score += 5

    # Credit utilization (20 pts)
    if credit_limit > 0:
        util = credit_used / credit_limit
        if util < 0.30:
            score += 20
        elif util < 0.60:
            score += 10
    elif credit_limit == 0:
        score += 20  # no cards = no risk

    # Has investments (15 pts)
    if has_investments:
        score += 15

    # Has goals (10 pts)
    if has_goals:
        score += 10

    return min(score, 100)


def get_health_label(score):
    if score >= 90:
        return ("Excelente", "green")
    elif score >= 70:
        return ("Bom", "blue")
    elif score >= 50:
        return ("Regular", "yellow")
    else:
        return ("Em Risco", "red")


@router.get("/")
def get_dashboard(db: Session = Depends(get_db)):
    # ── Income ────────────────────────────────────────────────────────────────
    incomes = db.query(models.Income).filter(models.Income.active == True).all()
    total_monthly_income = sum(
        i.amount * FREQUENCY_MULTIPLIERS.get(i.frequency, 1.0) for i in incomes
    )

    # ── Fixed Debts ───────────────────────────────────────────────────────────
    debts = db.query(models.FixedDebt).filter(models.FixedDebt.active == True).all()
    total_monthly_debts = sum(d.amount for d in debts)

    # Category breakdown for chart
    category_totals = {}
    for d in debts:
        label = CATEGORY_LABELS.get(d.category, d.category)
        category_totals[label] = category_totals.get(label, 0) + d.amount

    # ── Credit Cards ──────────────────────────────────────────────────────────
    cards = db.query(models.CreditCard).all()
    total_credit_limit = sum(c.limit for c in cards)

    card_summaries = []
    total_credit_used = 0.0
    for card in cards:
        purchases = db.query(models.CreditPurchase).filter(
            models.CreditPurchase.card_id == card.id,
            models.CreditPurchase.installments_paid < models.CreditPurchase.installments
        ).all()
        card_balance = sum(p.monthly_amount for p in purchases)
        total_credit_used += card_balance
        card_summaries.append({
            "id": card.id,
            "name": card.name,
            "limit": card.limit,
            "balance": round(card_balance, 2),
            "available": round(card.limit - card_balance, 2),
            "utilization": round((card_balance / card.limit * 100) if card.limit > 0 else 0, 1),
            "color": card.color,
        })

    # Add credit purchases to category breakdown
    all_purchases = db.query(models.CreditPurchase).filter(
        models.CreditPurchase.installments_paid < models.CreditPurchase.installments
    ).all()
    for p in all_purchases:
        label = CATEGORY_LABELS.get(p.category, p.category)
        category_totals[label] = category_totals.get(label, 0) + p.monthly_amount

    # ── Investments ───────────────────────────────────────────────────────────
    investments = db.query(models.Investment).all()
    total_invested = sum(i.principal for i in investments)
    total_monthly_contribution = sum(i.monthly_contribution for i in investments)

    # ── Goals ─────────────────────────────────────────────────────────────────
    goals = db.query(models.Goal).all()

    # ── Computed totals ───────────────────────────────────────────────────────
    total_expenses = total_monthly_debts + total_credit_used
    net_monthly = total_monthly_income - total_expenses

    # ── Health score ──────────────────────────────────────────────────────────
    score = compute_health_score(
        total_monthly_income,
        total_monthly_debts,
        total_credit_used,
        total_credit_limit,
        len(investments) > 0,
        len(goals) > 0,
    )
    health_label, health_color = get_health_label(score)

    # ── Recent activity (last 10 items across all types) ──────────────────────
    recent = []
    for i in incomes[-5:]:
        recent.append({"type": "income", "label": i.label,
                       "amount": i.amount * FREQUENCY_MULTIPLIERS.get(i.frequency, 1), "sign": "+"})
    for d in debts[-5:]:
        recent.append({"type": "debt", "label": d.label, "amount": d.amount, "sign": "-"})
    for p in all_purchases[-5:]:
        recent.append({"type": "purchase", "label": p.label, "amount": p.monthly_amount, "sign": "-"})
    recent = recent[:10]

    return {
        "income": {
            "total_monthly": round(total_monthly_income, 2),
            "count": len(incomes),
        },
        "debts": {
            "total_monthly": round(total_monthly_debts, 2),
            "count": len(debts),
        },
        "credit": {
            "total_used": round(total_credit_used, 2),
            "total_limit": round(total_credit_limit, 2),
            "cards": card_summaries,
        },
        "investments": {
            "total_principal": round(total_invested, 2),
            "monthly_contribution": round(total_monthly_contribution, 2),
            "count": len(investments),
        },
        "goals": {"count": len(goals)},
        "summary": {
            "total_expenses": round(total_expenses, 2),
            "net_monthly": round(net_monthly, 2),
        },
        "health": {
            "score": score,
            "label": health_label,
            "color": health_color,
        },
        "chart": {
            "categories": [
                {"label": k, "value": round(v, 2)} for k, v in category_totals.items()
            ]
        },
        "recent": recent,
    }
