import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))
from services.model_loader import load_all_assets
from services.analytics import generate_insights

load_all_assets()

REQUIRED_TYPES  = {"risk_explanation","safety","productivity","behaviour","improvement","trend_outlook"}
REQUIRED_FIELDS = {"type","title","description","summary","recommendation","severity"}

tests = [("DRV0001","HIGH"),("DRV0010","LOW"),("DRV0210","MEDIUM"),("DRV9999","UNKNOWN")]
all_ok = True

for did, label in tests:
    ins = generate_insights(did)
    print("=== %s (%s) === count=%d" % (did, label, len(ins)))
    for i in ins:
        missing = REQUIRED_FIELDS - set(i.keys())
        status  = "PASS" if not missing else ("FAIL missing:" + str(missing))
        print("  [%-20s] sev=%-9s %s" % (i["type"], i.get("severity","?"), status))
        print("    summary: %s" % str(i.get("summary",""))[:90])
    types = {i["type"] for i in ins}
    if did != "DRV9999":
        mt = REQUIRED_TYPES - types
        if mt:
            print("  MISSING TYPES: %s" % mt)
            all_ok = False
    print()

print("Determinism check...")
a = generate_insights("DRV0001")
b = generate_insights("DRV0001")
ok = all(x["summary"] == y["summary"] for x, y in zip(a, b))
print("Deterministic: %s" % ok)
print("ALL PASSED" if all_ok else "SOME FAILURES - see above")
