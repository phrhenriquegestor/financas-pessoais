# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## GitHub Repository

- **Repo:** https://github.com/phrhenriquegestor/financas-pessoais
- **Branch:** `main`
- **Auto-sync:** Every file edited or created by Claude is automatically committed and pushed to GitHub via a `PostToolUse` hook configured in `.claude/settings.local.json`.
- **Excluded from git:** `financas.db`, `__pycache__/`, `server.log` (see `.gitignore`)

## Setup & Running

```bash
pip install -r requirements.txt
python main.py
```

Runs at `http://localhost:8000`. Interactive API docs at `/docs`.

## Architecture

This is a single-page personal finance app built with **FastAPI + SQLite + vanilla JS**.

**Backend layers:**
- `database.py` — SQLAlchemy engine and `get_db()` dependency (SQLite file `financas.db`)
- `models.py` — ORM models: `Income`, `FixedDebt`, `CreditCard`, `CreditPurchase`, `Investment`, `Goal`
- `schemas.py` — Pydantic schemas per model: `*Base`, `*Create`, `*Update`, `*Out` pattern
- `routers/` — One router per domain, mounted under `/api/<domain>` in `main.py`
- `routers/dashboard.py` — Aggregates all domains into a single summary response including a financial health score (0–100)

**Frontend:**
- `templates/index.html` — Single HTML file, served by FastAPI at `/`
- `static/js/` — One JS file per domain (`income.js`, `debts.js`, `credit.js`, `investments.js`, `goals.js`) plus `dashboard.js`, `charts.js`, `app.js`; all communicate exclusively with `/api/*` endpoints

**Key domain rules:**
- `Income` and `FixedDebt` use soft delete via `active` boolean field; the dashboard only queries `active == True` records. Hard deletes are used for `CreditCard` (cascade-deletes its purchases), `Investment`, and `Goal`.
- Income has a `frequency` field (`weekly/biweekly/monthly/annual/once`); the dashboard normalizes everything to monthly using `FREQUENCY_MULTIPLIERS`
- `CreditPurchase.monthly_amount` is computed on creation (`amount / installments`) and stored; a purchase is considered active while `installments_paid < installments`
- Dashboard health score is computed from: savings rate (30 pts), debt-to-income ratio (25 pts), credit utilization (20 pts), has investments (15 pts), has goals (10 pts)
- Category labels are translated PT-BR in `dashboard.py`'s `CATEGORY_LABELS` dict

**Enum-like string fields (not enforced at DB level):**
- `Income.frequency`: `weekly`, `biweekly`, `monthly`, `annual`, `once`
- `FixedDebt.category`: `housing`, `utilities`, `insurance`, `subscription`, `loan`, `other`
- `CreditPurchase.category`: `shopping`, `food`, `travel`, `health`, `other`
- `Investment.type`: `fixed`, `variable`, `crypto`, `real_estate`
