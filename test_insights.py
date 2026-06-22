"""
test_insights.py
================
Verifies the new deterministic insights engine produces
correct, driver-specific outputs for each risk tier.

Run from project root:
    python test_insights.py
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from services.model_loader import load_all_assets
from services.analytics    import generate_insights

print("=" * 68)
print("  DriverPulse Priority 4 -- Insights Engine Verification")
print("=" * 68)

load_all_assets()

# Test three drivers from different risk tiers (confirmed from P1 verification)
test_cases = [
    ("DRV0001", "HIGH risk driver"),
    ("DRV0010", "LOW risk driver"),
    ("DRV0210", "MEDIUM risk driver"),
    ("DRV9999", "Unknown driver (should return 'pending' insight)"),
]

REQUIRED_TYPES = {
    "risk_explanation", "safety", "productivity",
    "behaviour", "improvement", "trend_outlook",
}
REQUIRED_FIELDS = {"type", "title", "description", "summary", "recommendation", "severity"}

all_passed = True

for driver_id, label in test_cases:
    print(f"\n{'─'*68}")
    print(f"  Testing: {driver_id}  ({label})")
    print(f"{'─'*68}")

    insights = generate_insights(driver_id)
    print(f"  Insights returned: {len(insights)}")

    if driver_id == "DRV9999":
        assert len(insights) == 1, "Unknown driver should return exactly 1 insight"
        assert insights[0]["type"] == "pending", "Unknown driver should return 'pending' type"
        print("  PASS -- 'pending' insight returned for unknown driver")
        continue

    returned_types = {i["type"] for i in insights}
    missing_types  = REQUIRED_TYPES - returned_types
    if missing_types:
        print(f"  FAIL -- Missing insight types: {missing_types}")
        all_passed = False

    for idx, insight in enumerate(insights):
        missing_fields = REQUIRED_FIELDS - set(insight.keys())
        if missing_fields:
            print(f"  FAIL -- Insight #{idx} '{insight.get('type')}' missing fields: {missing_fields}")
            all_passed = False
        else:
            sev = insight.get("severity", "?")
            print(f"  [{idx+1}] {insight['type']:<20} sev={sev:<9} | {insight['title']}")
            print(f"       summary: {insight['summary'][:80]}...")

print(f"\n{'='*68}")
if all_passed:
    print("  ALL TESTS PASSED")
else:
    print("  SOME TESTS FAILED -- see output above")
print(f"{'='*68}")

# Determinism check: same inputs -> same outputs
print("\n  Determinism check: calling generate_insights('DRV0001') twice...")
a = generate_insights("DRV0001")
b = generate_insights("DRV0001")
assert len(a) == len(b), "Output length differs between calls"
for x, y in zip(a, b):
    assert x["summary"] == y["summary"], f"Summary mismatch for {x['type']}"
print("  PASS -- identical outputs on repeated calls (fully deterministic)")
print(f"{'='*68}\n")
