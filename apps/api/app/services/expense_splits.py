from collections import defaultdict
from decimal import Decimal
from typing import Annotated

from fastapi import Depends

from app.db.supabase import get_supabase
from app.schemas.invite import EventUser
from app.schemas.split import (
    BalanceDashboard,
    BalanceExpense,
    BalanceSettlement,
    CurrencyBalance,
    EqualShare,
    ExpenseSplit,
    PersonBalance,
)
from app.services.contacts import shown_contacts

CENT = Decimal("0.01")
ZERO = Decimal("0.00")
PAYMENT_CONTACTS = ("etransfer_email", "etransfer_phone")


def _expense_date(row: dict) -> str | None:
    value = row.get("date")
    if value is None:
        return None
    return value if isinstance(value, str) else value.isoformat()


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
                break
        # Older RPC shapes omit `date`; fill from expenses so the drawer can show it.
        missing = [row["id"] for row in rows if not row.get("date")]
        if missing:
            dates: dict[str, object] = {}
            for start in range(0, len(missing), 100):
                batch = missing[start : start + 100]
                for item in (
                    self.db.table("expenses").select("id,date").in_("id", batch).execute().data
                ):
                    dates[item["id"]] = item["date"]
            for row in rows:
                if not row.get("date") and row["id"] in dates:
                    row["date"] = dates[row["id"]]
        return rows

    def list_items(self, expense_ids: list[str]) -> dict[str, list[dict]]:
        items = {}
        # Batched so the id filter stays within URL length limits.
        for start in range(0, len(expense_ids), 100):
            batch = expense_ids[start : start + 100]
            rows = self.db.table("expenses").select("id,items").in_("id", batch).execute().data
            items.update({row["id"]: row["items"] or [] for row in rows})
        return items


ExpenseBalancesRepoDep = Annotated[ExpenseBalancesRepo, Depends(ExpenseBalancesRepo)]


def balance_dashboard(
    rows: list[dict], user_id: str, profiles: dict, settlements: list[dict] | None = None
) -> BalanceDashboard:
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
                            event_id=row.get("event_id"),
                            event_title=row.get("event_title"),
                            event_starts_at=row.get("event_starts_at"),
                            date=_expense_date(row),
                        )
                    )
        elif user_id in shares and shares[user_id]:
            debts[(payer, row["currency"])].append(
                BalanceExpense(
                    expense_id=row["id"],
                    title=row["title"],
                    amount=-shares[user_id],
                    event_id=row.get("event_id"),
                    event_title=row.get("event_title"),
                    event_starts_at=row.get("event_starts_at"),
                    date=_expense_date(row),
                )
            )
    paid: dict[tuple[str, str], list[BalanceSettlement]] = defaultdict(list)
    for row in settlements or []:
        you_paid = row["from_user_id"] == user_id
        other_id = row["to_user_id"] if you_paid else row["from_user_id"]
        amount = Decimal(str(row["amount"])).quantize(CENT)
        paid[(other_id, row["currency"])].append(
            BalanceSettlement(
                id=row["id"], amount=amount if you_paid else -amount, created_at=row["created_at"]
            )
        )
    totals = defaultdict(lambda: [ZERO, ZERO])
    people = []
    for other_id, currency in sorted(debts.keys() | paid.keys()):
        expenses, payments = debts.get((other_id, currency), []), paid.get((other_id, currency), [])
        net = sum((item.amount for item in [*expenses, *payments]), ZERO)
        owe, owed = max(-net, ZERO), max(net, ZERO)
        totals[currency][0] += owe
        totals[currency][1] += owed
        contacts = shown_contacts(profiles.get(other_id) or {}) if owe else []
        people.append(
            PersonBalance(
                user=EventUser.lookup(profiles, other_id),
                currency=currency,
                you_owe=owe,
                owed_to_you=owed,
                expenses=expenses,
                settlements=payments,
                payment_contacts=[c for c in contacts if c.kind in PAYMENT_CONTACTS],
            )
        )
    return BalanceDashboard(
        totals=[
            CurrencyBalance(currency=currency, you_owe=amounts[0], owed_to_you=amounts[1])
            for currency, amounts in sorted(totals.items())
        ],
        people=people,
    )
