# -*- coding: utf-8 -*-
"""
evaluate_rf_model.py
--------------------
Loads the saved risk_classifier.pkl, reconstructs the identical test split
(random_state=42, stratified), and prints:
  • Class-wise classification report (Precision / Recall / F1 / Support)
  • Confusion matrix (text + coloured heatmap saved as PNG)
"""

import os, pickle, warnings
warnings.filterwarnings("ignore")

import sys, io
# Force UTF-8 output on Windows so Unicode chars print cleanly
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.ticker as mtick
import seaborn as sns

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, OrdinalEncoder
from sklearn.metrics import (
    classification_report, confusion_matrix, ConfusionMatrixDisplay, accuracy_score
)

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
DATA_PATH  = os.path.join(BASE_DIR, "processed", "final_driver_dataset.csv")
MODEL_PATH = os.path.join(BASE_DIR, "models", "risk_classifier.pkl")
ENC_PATH   = os.path.join(BASE_DIR, "models", "encoders.pkl")
OUT_DIR    = os.path.join(BASE_DIR, "processed")

RANDOM_STATE = 42
TEST_SIZE    = 0.20

# ─────────────────────────────────────────────────────────────────────────────
# 1. Load model artifacts
# ─────────────────────────────────────────────────────────────────────────────
print("Loading model artifacts …")
with open(MODEL_PATH, "rb") as f:
    clf_bundle = pickle.load(f)

with open(ENC_PATH, "rb") as f:
    encoders = pickle.load(f)

rf_model     = clf_bundle["model"]
FEATURE_COLS = clf_bundle["feature_cols"]
CLASS_NAMES  = clf_bundle["class_names"]   # e.g. ['HIGH', 'LOW', 'MEDIUM']
model_name   = clf_bundle["model_name"]

print(f"  Model      : {model_name}")
print(f"  Classes    : {CLASS_NAMES}")
print(f"  Features   : {FEATURE_COLS}")

# ─────────────────────────────────────────────────────────────────────────────
# 2. Reproduce the identical preprocessing & test split
# ─────────────────────────────────────────────────────────────────────────────
print("\nReproducing preprocessing pipeline …")
df_raw = pd.read_csv(DATA_PATH)

def months_to_level(m):
    if   m <  6: return "junior"
    elif m < 24: return "mid"
    else:        return "senior"

df_raw["experience_level"] = df_raw["experience_months"].apply(months_to_level)
df_work = df_raw.copy()

# Fill missing
for col in FEATURE_COLS:
    if df_work[col].dtype == object:
        df_work[col] = df_work[col].fillna("unknown")
    else:
        df_work[col] = df_work[col].fillna(df_work[col].median())

TARGET_COL = "risk_label"
df_enc = df_work[FEATURE_COLS + [TARGET_COL]].copy()

# Nominal encoding
NOMINAL_COLS = ["city", "shift_preference"]
for col in NOMINAL_COLS:
    le = encoders[col]
    df_enc[col] = le.transform(df_enc[col].astype(str))

# Ordinal encoding
ORDINAL_COL = "experience_level"
oe = encoders[ORDINAL_COL]
df_enc[ORDINAL_COL] = oe.transform(df_enc[[ORDINAL_COL]]).astype(int)

# Target encoding
target_le = encoders[TARGET_COL]
df_enc[TARGET_COL] = target_le.transform(df_enc[TARGET_COL])

X = df_enc[FEATURE_COLS]
y = df_enc[TARGET_COL]

_, X_test, _, y_test = train_test_split(
    X, y,
    test_size    = TEST_SIZE,
    random_state = RANDOM_STATE,
    stratify     = y,
)

print(f"  Test set   : {len(X_test):,} samples")

# ─────────────────────────────────────────────────────────────────────────────
# 3. Predict
# ─────────────────────────────────────────────────────────────────────────────
y_pred = rf_model.predict(X_test)
acc    = accuracy_score(y_test, y_pred)

# ─────────────────────────────────────────────────────────────────────────────
# 4. Classification Report (text)
# ─────────────────────────────────────────────────────────────────────────────
DIVIDER = "═" * 62
print(f"\n{DIVIDER}")
print(f"   CLASSIFICATION REPORT  —  {model_name}")
print(DIVIDER)
print(classification_report(
    y_test, y_pred,
    target_names  = CLASS_NAMES,
    zero_division = 0,
    digits        = 4,
))

# ─────────────────────────────────────────────────────────────────────────────
# 5. Confusion Matrix (text)
# ─────────────────────────────────────────────────────────────────────────────
cm = confusion_matrix(y_test, y_pred)
print(DIVIDER)
print(f"   CONFUSION MATRIX  —  {model_name}  (rows=True, cols=Predicted)")
print(DIVIDER)

# Header
col_w = 10
header = f"{'':15}" + "".join(f"{c:>{col_w}}" for c in CLASS_NAMES)
print(header)
print("─" * len(header))
for i, row in enumerate(cm):
    row_str = f"True {CLASS_NAMES[i]:<10}" + "".join(f"{v:>{col_w}}" for v in row)
    print(row_str)
print(f"\n  Overall Accuracy : {acc*100:.2f}%")
print(DIVIDER)

# ─────────────────────────────────────────────────────────────────────────────
# 6. Styled Classification Report Figure
# ─────────────────────────────────────────────────────────────────────────────
report_dict = classification_report(
    y_test, y_pred,
    target_names  = CLASS_NAMES,
    zero_division = 0,
    output_dict   = True,
)

fig, axes = plt.subplots(1, 2, figsize=(17, 6),
                          gridspec_kw={"width_ratios": [1.15, 1]})
fig.patch.set_facecolor("#0f1117")

# ── LEFT: Per-class metrics bar chart ─────────────────────────────────────
ax1 = axes[0]
ax1.set_facecolor("#1a1d27")

metrics    = ["precision", "recall", "f1-score"]
labels     = CLASS_NAMES
class_colors = {"HIGH": "#e74c3c", "MEDIUM": "#f39c12", "LOW": "#2ecc71"}
metric_colors= {"precision": "#5dade2", "recall": "#a29bfe", "f1-score": "#00b894"}

x     = np.arange(len(labels))
n_m   = len(metrics)
width = 0.22
offsets = np.linspace(-(n_m - 1) / 2 * width, (n_m - 1) / 2 * width, n_m)

for j, metric in enumerate(metrics):
    vals = [report_dict[cls][metric] for cls in labels]
    bars = ax1.bar(
        x + offsets[j], vals, width,
        label      = metric.capitalize(),
        color      = metric_colors[metric],
        edgecolor  = "#0f1117",
        linewidth  = 0.8,
        alpha      = 0.92,
    )
    for bar, v in zip(bars, vals):
        ax1.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + 0.008,
            f"{v:.3f}",
            ha="center", va="bottom",
            fontsize=8, fontweight="bold", color="white",
        )

# Support annotations under class labels
supports = [report_dict[cls]["support"] for cls in labels]
xtick_labels = [f"{cls}\n(n={int(s):,})" for cls, s in zip(labels, supports)]

ax1.set_xticks(x)
ax1.set_xticklabels(xtick_labels, fontsize=11, color="white", fontweight="bold")
ax1.set_ylim(0, 1.18)
ax1.set_ylabel("Score", fontsize=11, color="white")
ax1.set_title(
    f"Class-wise Metrics — {model_name}\nPrecision · Recall · F1-score",
    fontsize=13, fontweight="bold", color="white", pad=14,
)
ax1.legend(fontsize=10, framealpha=0.2, labelcolor="white",
           facecolor="#1a1d27", edgecolor="#555")
ax1.tick_params(colors="white")
ax1.spines[["top", "right"]].set_visible(False)
for spine in ["left", "bottom"]:
    ax1.spines[spine].set_color("#555")
ax1.yaxis.set_major_formatter(mtick.PercentFormatter(xmax=1, decimals=0))
ax1.grid(axis="y", color="#333", linewidth=0.6, linestyle="--", alpha=0.6)

# ── RIGHT: Confusion matrix heatmap ──────────────────────────────────────
ax2 = axes[1]
ax2.set_facecolor("#1a1d27")

# Row-normalised (%) for colour scale; raw counts as text
cm_norm = cm.astype(float) / cm.sum(axis=1, keepdims=True) * 100

cmap = sns.color_palette("Blues", as_cmap=True)
im   = ax2.imshow(cm_norm, cmap=cmap, vmin=0, vmax=100)

# Cell text
for i in range(len(CLASS_NAMES)):
    for j in range(len(CLASS_NAMES)):
        pct = cm_norm[i, j]
        raw = cm[i, j]
        txt_color = "white" if pct > 55 else "#ccc"
        ax2.text(j, i, f"{raw}\n({pct:.1f}%)",
                 ha="center", va="center",
                 fontsize=10.5, fontweight="bold", color=txt_color)

ax2.set_xticks(range(len(CLASS_NAMES)))
ax2.set_yticks(range(len(CLASS_NAMES)))
ax2.set_xticklabels(CLASS_NAMES, fontsize=11, color="white", fontweight="bold")
ax2.set_yticklabels(CLASS_NAMES, fontsize=11, color="white", fontweight="bold")
ax2.set_xlabel("Predicted Label", fontsize=11, color="white")
ax2.set_ylabel("True Label",      fontsize=11, color="white")
ax2.set_title(
    f"Confusion Matrix — {model_name}\nOverall Accuracy = {acc*100:.2f}%",
    fontsize=13, fontweight="bold", color="white", pad=14,
)
ax2.tick_params(colors="white")

cbar = fig.colorbar(im, ax=ax2, fraction=0.04, pad=0.03)
cbar.set_label("Row-normalised %", color="white", fontsize=9)
cbar.ax.yaxis.set_tick_params(color="white")
plt.setp(cbar.ax.yaxis.get_ticklabels(), color="white")

plt.suptitle(
    "Random Forest — Driver Risk Classification Report",
    fontsize=15, fontweight="bold", color="white", y=1.02,
)

plt.tight_layout()

out_path = os.path.join(OUT_DIR, "rf_classification_report.png")
plt.savefig(out_path, dpi=150, bbox_inches="tight",
            facecolor=fig.get_facecolor())
plt.show()
print(f"\n✅  Figure saved → {out_path}")
