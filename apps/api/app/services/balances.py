"""Who-owes-whom calculations."""

from collections import defaultdict
from decimal import Decimal
from uuid import UUID

from app.schemas.balance import Balance


def simplify_debts(net: dict[UUID, Decimal]) -> list[Balance]:
    """Greedy settle-up: net > 0 means the user is owed money, net < 0 means they owe."""
    creditors = sorted(((u, a) for u, a in net.items() if a > 0), key=lambda x: -x[1])
    debtors = sorted(((u, -a) for u, a in net.items() if a < 0), key=lambda x: -x[1])
    remaining: dict[UUID, Decimal] = defaultdict(Decimal, {u: a for u, a in creditors})

    balances: list[Balance] = []
    ci = 0
    for debtor, owed in debtors:
        while owed > 0 and ci < len(creditors):
            creditor = creditors[ci][0]
            pay = min(owed, remaining[creditor])
            if pay > 0:
                balances.append(Balance(from_user_id=debtor, to_user_id=creditor, amount=pay))
            owed -= pay
            remaining[creditor] -= pay
            if remaining[creditor] == 0:
                ci += 1
    return balances
