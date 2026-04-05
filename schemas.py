from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


# ── Income ──────────────────────────────────────────────────────────────────

class IncomeBase(BaseModel):
    label: str
    amount: float
    frequency: str = "monthly"
    start_date: Optional[date] = None
    active: bool = True


class IncomeCreate(IncomeBase):
    pass


class IncomeUpdate(BaseModel):
    label: Optional[str] = None
    amount: Optional[float] = None
    frequency: Optional[str] = None
    start_date: Optional[date] = None
    active: Optional[bool] = None


class IncomeOut(IncomeBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Fixed Debt ───────────────────────────────────────────────────────────────

class FixedDebtBase(BaseModel):
    label: str
    amount: float
    due_day: int = 1
    category: str = "other"
    active: bool = True


class FixedDebtCreate(FixedDebtBase):
    pass


class FixedDebtUpdate(BaseModel):
    label: Optional[str] = None
    amount: Optional[float] = None
    due_day: Optional[int] = None
    category: Optional[str] = None
    active: Optional[bool] = None


class FixedDebtOut(FixedDebtBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Credit Card ──────────────────────────────────────────────────────────────

class CreditCardBase(BaseModel):
    name: str
    limit: float
    closing_day: int = 15
    due_day: int = 22
    color: str = "#4f8ef7"


class CreditCardCreate(CreditCardBase):
    pass


class CreditCardUpdate(BaseModel):
    name: Optional[str] = None
    limit: Optional[float] = None
    closing_day: Optional[int] = None
    due_day: Optional[int] = None
    color: Optional[str] = None


class CreditCardOut(CreditCardBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Credit Purchase ──────────────────────────────────────────────────────────

class CreditPurchaseBase(BaseModel):
    card_id: int
    label: str
    amount: float
    installments: int = 1
    installments_paid: int = 0
    purchase_date: date
    category: str = "other"


class CreditPurchaseCreate(CreditPurchaseBase):
    pass


class CreditPurchaseUpdate(BaseModel):
    label: Optional[str] = None
    installments_paid: Optional[int] = None
    category: Optional[str] = None


class CreditPurchaseOut(CreditPurchaseBase):
    id: int
    monthly_amount: float
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Investment ───────────────────────────────────────────────────────────────

class InvestmentBase(BaseModel):
    label: str
    type: str = "fixed"
    principal: float
    monthly_contribution: float = 0.0
    annual_rate: float
    start_date: Optional[date] = None


class InvestmentCreate(InvestmentBase):
    pass


class InvestmentUpdate(BaseModel):
    label: Optional[str] = None
    type: Optional[str] = None
    principal: Optional[float] = None
    monthly_contribution: Optional[float] = None
    annual_rate: Optional[float] = None
    start_date: Optional[date] = None


class InvestmentOut(InvestmentBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Goal ─────────────────────────────────────────────────────────────────────

class GoalBase(BaseModel):
    label: str
    target_amount: float
    current_savings: float = 0.0
    monthly_savings: float
    priority: int = 1


class GoalCreate(GoalBase):
    pass


class GoalUpdate(BaseModel):
    label: Optional[str] = None
    target_amount: Optional[float] = None
    current_savings: Optional[float] = None
    monthly_savings: Optional[float] = None
    priority: Optional[int] = None


class GoalOut(GoalBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
