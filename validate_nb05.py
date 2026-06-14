import os, warnings, pickle
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import LabelEncoder, OrdinalEncoder
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    classification_report, confusion_matrix
)

try:
    from xgboost import XGBClassifier
    XGBOOST_AVAILABLE = True
    BOOST_LABEL = "XGBoost"
    print("XGBoost available")
except ImportError:
    XGBOOST_AVAILABLE = False
    BOOST_LABEL = "Gradient Boosting"
    print("XGBoost NOT found - using GradientBoostingClassifier")

BASE_DIR   = os.path.abspath(".")
DATA_PATH  = os.path.join(BASE_DIR, "processed", "final_driver_dataset.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# 1. Load
df_raw = pd.read_csv(DATA_PATH)
print(f"Loaded: {df_raw.shape}")

# 2. Derive experience_level
def months_to_level(m):
    if m < 6:    return "junior"
    elif m < 24: return "mid"
    else:        return "senior"

df_raw["experience_level"] = df_raw["experience_months"].apply(months_to_level)

# 3. Feature set - NO risk_score
FEATURE_COLS = [
    "city", "shift_preference",
    "avg_hours_per_day", "avg_earnings_per_hour",
    "experience_months", "rating", "experience_level",
    "daily_productivity", "avg_combined_score",
    "avg_motion_score", "avg_audio_score", "total_flags",
]
TARGET_COL = "risk_label"

assert "risk_score" not in FEATURE_COLS, "LEAKAGE DETECTED!"
print(f"Features ({len(FEATURE_COLS)}): {FEATURE_COLS}")
print("risk_score: EXCLUDED (leakage fix)")

# 4. Encoding
df_enc   = df_raw[FEATURE_COLS + [TARGET_COL]].copy()
encoders = {}

for col in ["city", "shift_preference"]:
    le = LabelEncoder()
    df_enc[col] = le.fit_transform(df_enc[col].astype(str))
    encoders[col] = le
    print(f"  LabelEncoder [{col}]: {list(le.classes_)}")

oe = OrdinalEncoder(
    categories=[["junior", "mid", "senior"]],
    handle_unknown="use_encoded_value", unknown_value=-1
)
df_enc["experience_level"] = oe.fit_transform(df_enc[["experience_level"]]).astype(int)
encoders["experience_level"] = oe

target_le = LabelEncoder()
df_enc[TARGET_COL] = target_le.fit_transform(df_enc[TARGET_COL])
encoders[TARGET_COL] = target_le
CLASS_NAMES = list(target_le.classes_)
print(f"Target classes: {CLASS_NAMES}")

# 5. Split
X = df_enc[FEATURE_COLS]
y = df_enc[TARGET_COL]
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42, stratify=y
)
print(f"Train: {len(X_train)}, Test: {len(X_test)}")

# 6. Train Random Forest
print("\nTraining Random Forest ...")
rf = RandomForestClassifier(
    n_estimators=400, min_samples_leaf=2,
    max_features="sqrt", class_weight="balanced",
    random_state=42, n_jobs=-1
)
rf.fit(X_train, y_train)
cv_rf = cross_val_score(rf, X_train, y_train,
    cv=StratifiedKFold(5, shuffle=True, random_state=42),
    scoring="f1_weighted", n_jobs=-1)
print(f"  CV F1 = {cv_rf.mean():.4f} +/- {cv_rf.std():.4f}")

# 7. Train Boost model
print(f"\nTraining {BOOST_LABEL} ...")
if XGBOOST_AVAILABLE:
    boost = XGBClassifier(
        n_estimators=400, max_depth=6, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8,
        eval_metric="mlogloss", random_state=42, n_jobs=-1, verbosity=0
    )
else:
    boost = GradientBoostingClassifier(
        n_estimators=300, max_depth=5, learning_rate=0.05,
        subsample=0.8, random_state=42
    )
boost.fit(X_train, y_train)
cv_boost = cross_val_score(boost, X_train, y_train,
    cv=StratifiedKFold(5, shuffle=True, random_state=42),
    scoring="f1_weighted", n_jobs=-1)
print(f"  CV F1 = {cv_boost.mean():.4f} +/- {cv_boost.std():.4f}")

# 8. Evaluate
print("\n" + "="*60)
print("MODEL COMPARISON (Test Set - weighted averages)")
print("="*60)
all_preds = {}
results   = []
for name, model in [("Random Forest", rf), (BOOST_LABEL, boost)]:
    preds = model.predict(X_test)
    all_preds[name] = preds
    m = {
        "Model"    : name,
        "Accuracy" : accuracy_score(y_test, preds),
        "Precision": precision_score(y_test, preds, average="weighted", zero_division=0),
        "Recall"   : recall_score(y_test, preds, average="weighted", zero_division=0),
        "F1 Score" : f1_score(y_test, preds, average="weighted", zero_division=0),
    }
    results.append(m)
    print(f"  {name:<20} Acc={m['Accuracy']:.4f}  P={m['Precision']:.4f}  R={m['Recall']:.4f}  F1={m['F1 Score']:.4f}")

metrics_df = pd.DataFrame(results).set_index("Model")

# 9. Classification reports
for name, preds in all_preds.items():
    print(f"\n=== {name} ===")
    print(classification_report(y_test, preds, target_names=CLASS_NAMES, zero_division=0))

# 10. Select best
best_name = metrics_df["F1 Score"].idxmax()
best_obj  = rf if best_name == "Random Forest" else boost
best_f1   = metrics_df.loc[best_name, "F1 Score"]
best_acc  = metrics_df.loc[best_name, "Accuracy"]
print(f"\nBest model: {best_name}  (F1={best_f1:.4f}, Acc={best_acc:.4f})")

# 11. Feature importance
fi = pd.Series(best_obj.feature_importances_, index=FEATURE_COLS).sort_values(ascending=False)
print("\nTop-10 Features (no risk_score):")
for i, (feat, imp) in enumerate(fi.head(10).items(), 1):
    print(f"  {i:2}. {feat:<28} {imp:.4f}")

# 12. Save
clf_path = os.path.join(MODELS_DIR, "risk_classifier.pkl")
enc_path = os.path.join(MODELS_DIR, "encoders.pkl")

with open(clf_path, "wb") as f:
    pickle.dump({
        "model": best_obj, "model_name": best_name,
        "feature_cols": FEATURE_COLS, "class_names": CLASS_NAMES,
        "metrics": metrics_df.loc[best_name].to_dict(),
        "leakage_free": True, "excluded_cols": ["risk_score", "source"],
    }, f)

with open(enc_path, "wb") as f:
    pickle.dump(encoders, f)

print(f"\nSaved: {clf_path}  ({os.path.getsize(clf_path)/1024:.1f} KB)")
print(f"Saved: {enc_path}  ({os.path.getsize(enc_path)/1024:.1f} KB)")
print("\nDONE - leakage-free model artifacts saved.")
