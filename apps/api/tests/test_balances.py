from decimal import Decimal
from uuid import uuid4

from app.services.balances import simplify_debts


def test_simplify_debts() -> None:
    a, b, c = uuid4(), uuid4(), uuid4()
    result = simplify_debts({a: Decimal(30), b: Decimal(-10), c: Decimal(-20)})
    assert {(r.from_user_id, r.to_user_id, r.amount) for r in result} == {
        (b, a, Decimal(10)),
        (c, a, Decimal(20)),
    }
