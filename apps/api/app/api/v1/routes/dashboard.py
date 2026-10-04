from fastapi import APIRouter

from app.core.auth import CurrentUserDep
from app.schemas.dashboard import SpendingSummary
from app.services.exchange_rates import convert_to_cad
from app.services.expense_splits import ExpenseBalancesRepoDep
from app.services.spending import spending_summary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/spending", response_model=SpendingSummary)
def spending(user: CurrentUserDep, repo: ExpenseBalancesRepoDep) -> SpendingSummary:
    rows, unconverted = convert_to_cad(repo.list_inputs(user.id))
    summary = spending_summary(rows, repo.list_items([row["id"] for row in rows]), user.id)
    summary.unconverted_currencies = unconverted
    return summary
