import os
import pickle
import pandas as pd
import psutil

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MODEL_PATH = os.path.join(PROJECT_ROOT, "models", "risk_classifier.pkl")
ENC_PATH = os.path.join(PROJECT_ROOT, "models", "encoders.pkl")
CSV_PATH = os.path.join(PROJECT_ROOT, "processed", "final_driver_dataset.csv")


def show_memory(stage):
    mem = psutil.virtual_memory()
    print(f"\n[{stage}]")
    print(f"Available RAM: {mem.available / (1024**3):.2f} GB")
    print(f"Used RAM: {mem.used / (1024**3):.2f} GB")


show_memory("START")

print("\nLoading model...")

with open(MODEL_PATH, "rb") as f:
    bundle = pickle.load(f)

print("✅ Model loaded")
show_memory("AFTER MODEL")

print("\nLoading encoders...")

with open(ENC_PATH, "rb") as f:
    encoders = pickle.load(f)

print("✅ Encoders loaded")
show_memory("AFTER ENCODERS")

print("\nLoading dataset...")

df = pd.read_csv(CSV_PATH)

print(f"✅ Dataset loaded: {len(df)} rows")
show_memory("AFTER DATASET")

print("\nDone.")