from collections import defaultdict
from decimal import Decimal
from typing import Annotated

from fastapi import Depends

from app.db.supabase import get_supabase
from app.schemas.invite import EventUser
from app.schemas.split import (
    BalanceDashboard,
    BalanceExpense,
    CurrencyBalance,
    EqualShare,
    ExpenseSplit,
    PersonBalance,
)

CENT = Decimal("0.01")
ZERO = Decimal("0.00")


def equal_shares(amount: Decimal, member_ids: list[str]) -> dict[str, Decimal]:
    """Stable allocation in whole cents; the shares sum exactly to the total."""
    ids = sorted(set(member_ids))
    if not ids:
        raise ValueError("An expense needs at least one person in its split.")
    cents = int(amount * 100)
    base, remainder = divmod(cents, len(ids))
    return {user_id: (Decimal(base + (i < remainder)) * CENT) for i, user_id in enumerate(ids)}


def expense_split(expense: dict, member_ids: list[str], profiles: dict) -> ExpenseSplit:
    shares = equal_shares(Decimal(str(expense["amount"])), member_ids)
    return ExpenseSplit(
        expense_id=expense["id"],
        paid_by=EventUser.lookup(profiles, expense["created_by"]),
        currency=expense["currency"],
        total=Decimal(str(expense["amount"])).quantize(CENT),
        customized=expense.get("split_customized", False),
        shares=[
            EqualShare(user=EventUser.lookup(profiles, user_id), amount=amount)
            for user_id, amount in shares.items()
        ],
    )


class ExpenseBalancesRepo:
    def __init__(self):
        self.db = get_supabase()

    def list_inputs(self, user_id: str, event_id: str | None = None) -> list[dict]:
        # The SQL function scopes rows to the caller and reads totals and members together.
        rows = []
        while True:
            page = (
                self.db.rpc(
                    "expense_balance_inputs",
                    {
                        "p_user_id": user_id,
                        "p_event_id": event_id,
                    },
                )
                .range(len(rows), len(rows) + 999)
                .execute()
                .data
            )
            rows.extend(page)
            if len(page) < 1000:
                return rows


ExpenseBalancesRepoDep = Annotated[ExpenseBalancesRepo, Depends(ExpenseBalancesRepo)]


def balance_dashboard(rows: list[dict], user_id: str, profiles: dict) -> BalanceDashboard:
    debts: dict[tuple[str, str], list[BalanceExpense]] = defaultdict(list)
    for row in rows:
        shares = equal_shares(Decimal(str(row["amount"])), row["member_ids"])
        payer = row["created_by"]
        if payer == user_id:
            for other_id, amount in shares.items():
                if other_id != user_id and amount:
                    debts[(other_id, row["currency"])].append(
                        BalanceExpense(
                            expense_id=row["id"],
                            title=row["title"],
                            amount=amount,
                        )
                    )
        elif user_id in shares and shares[user_id]:
            debts[(payer, row["currency"])].append(
                BalanceExpense(
                    expense_id=row["id"],
                    title=row["title"],
                    amount=-shares[user_id],
                )
            )
    totals = defaultdict(lambda: [ZERO, ZERO])
    people = []
    for (other_id, currency), expenses in sorted(debts.items()):
        net = sum((expense.amount for expense in expenses), ZERO)
        owe, owed = max(-net, ZERO), max(net, ZERO)
        totals[currency][0] += owe
        totals[currency][1] += owed
        people.append(
            PersonBalance(
                user=EventUser.lookup(profiles, other_id),
                currency=currency,
                you_owe=owe,
                owed_to_you=owed,
                expenses=expenses,
            )
        )
    return BalanceDashboard(
        totals=[
            CurrencyBalance(currency=currency, you_owe=amounts[0], owed_to_you=amounts[1])
            for currency, amounts in sorted(totals.items())
        ],
        people=people,
    )
