import sys
import asyncio

# Setup path so we can import from backend
sys.path.append("backend")

from services.predictor import predict_driver
from services.model_loader import load_all_assets

def test_driver(driver_id):
    print(f"\n--- Testing Driver: {driver_id} ---")
    try:
        res = predict_driver(driver_id)
        print(f"Success! Source: {res.get('source')}")
        print(f"Risk Score: {res.get('risk_score')}")
        print(f"Confidence: {res.get('confidence')}")
        if res.get('source') != 'dataset':
            print("FAILED: Did not hit CASE 1 (source='dataset').")
        else:
            print("PASSED: Hit CASE 1 successfully.")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    load_all_assets()
    ids_to_test = ["DRV0001", "DRV0050", "DRV0100", "DRV0200", "DRV0500"]
    for d_id in ids_to_test:
        test_driver(d_id)
