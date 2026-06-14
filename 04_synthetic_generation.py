import importlib, subprocess, sys

def _ensure(pkg, import_name=None):
    import_name = import_name or pkg
    if importlib.util.find_spec(import_name) is None:
        print(f"Installing {pkg} …")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", pkg])

_ensure("sdv")
_ensure("pandas")
_ensure("numpy")
_ensure("matplotlib")
_ensure("scipy")
print("All dependencies ready.")
import warnings, pathlib, importlib
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
from scipy import stats

# ── paths ──────────────────────────────────────────────────────────────────────
BASE_DIR    = pathlib.Path("./")
INPUT_CSV   = BASE_DIR / "processed" / "driver_features.csv"
OUTPUT_CSV  = BASE_DIR / "processed" / "final_driver_dataset_15k.csv"

TARGET_SYNTHETIC = 14790
RANDOM_SEED      = 42

np.random.seed(RANDOM_SEED)
print(f"Input  : {INPUT_CSV}")
print(f"Output : {OUTPUT_CSV}")
print(f"Target synthetic rows: {TARGET_SYNTHETIC:,}")
df_orig = pd.read_csv(INPUT_CSV)

FEATURE_COLS = [
    "city", "shift_preference",
    "avg_hours_per_day", "avg_earnings_per_hour",
    "experience_months", "rating", "daily_productivity",
    "avg_combined_score", "avg_motion_score", "avg_audio_score",
    "total_flags", "risk_score", "risk_label",
]

CAT_COLS = ["city", "shift_preference", "risk_label"]
NUM_COLS = [c for c in FEATURE_COLS if c not in CAT_COLS]

print(f"Original shape : {df_orig.shape}")
print(f"\nNumeric columns  : {NUM_COLS}")
print(f"Categorical cols : {CAT_COLS}")
df_orig[FEATURE_COLS].head()
from sdv.metadata import SingleTableMetadata

working_df = df_orig[FEATURE_COLS].copy()

metadata = SingleTableMetadata()
metadata.detect_from_dataframe(working_df)

# Explicitly tag categorical columns so the model handles them correctly
for col in CAT_COLS:
    metadata.update_column(column_name=col, sdtype="categorical")

print("Metadata summary:")
metadata.visualize()
synthesizer = None
method_used = None

# ── Try CTGAN first ────────────────────────────────────────────────────────────
try:
    from sdv.single_table import CTGANSynthesizer
    print("▶ Training CTGAN …  (this may take 1-2 min)")
    synthesizer = CTGANSynthesizer(
        metadata,
        epochs=500,
        batch_size=50,      # small dataset → smaller batch
        generator_dim=(256, 256),
        discriminator_dim=(256, 256),
        verbose=True,
        cuda=False,
    )
    synthesizer.fit(working_df)
    method_used = "CTGAN"
    print("\n✅ CTGAN training complete.")
except Exception as e:
    print(f"CTGAN unavailable ({e}).  Falling back to Gaussian Copula …")

# ── Fallback: Gaussian Copula ──────────────────────────────────────────────────
if synthesizer is None:
    from sdv.single_table import GaussianCopulaSynthesizer
    print("▶ Training Gaussian Copula …")
    synthesizer = GaussianCopulaSynthesizer(
        metadata,
        default_distribution="beta",
    )
    synthesizer.fit(working_df)
    method_used = "Gaussian Copula"
    print("✅ Gaussian Copula training complete.")

print(f"\nModel used: {method_used}")
df_synthetic = synthesizer.sample(num_rows=TARGET_SYNTHETIC, batch_size=500)

# ── Post-processing: clip numeric columns to realistic ranges ─────────────────
clip_ranges = {
    "avg_hours_per_day"     : (df_orig["avg_hours_per_day"].min(),      df_orig["avg_hours_per_day"].max()),
    "avg_earnings_per_hour" : (df_orig["avg_earnings_per_hour"].min(),   df_orig["avg_earnings_per_hour"].max()),
    "experience_months"     : (df_orig["experience_months"].min(),        df_orig["experience_months"].max()),
    "rating"                : (1.0,  5.0),
    "daily_productivity"    : (0.0,  None),
    "avg_combined_score"    : (0.0,  1.0),
    "avg_motion_score"      : (0.0,  1.0),
    "avg_audio_score"       : (0.0,  1.0),
    "total_flags"           : (0.0,  None),
    "risk_score"            : (0.0,  None),
}
for col, (lo, hi) in clip_ranges.items():
    if col in df_synthetic.columns:
        df_synthetic[col] = df_synthetic[col].clip(lower=lo, upper=hi)

# Round integer-like columns
for col in ["avg_earnings_per_hour", "experience_months", "total_flags"]:
    if col in df_synthetic.columns:
        df_synthetic[col] = df_synthetic[col].round().astype(int)

# Derive risk_label from risk_score if the model produced inconsistencies
def _risk_label(score):
    if score >= 30:  return "HIGH"
    elif score >= 20: return "MEDIUM"
    else:            return "LOW"

df_synthetic["risk_label"] = df_synthetic["risk_score"].apply(_risk_label)

# Tag the source
df_synthetic["source"] = "synthetic"

print(f"Synthetic rows generated : {len(df_synthetic):,}")
df_synthetic.head()
df_orig_tagged = df_orig.copy()
df_orig_tagged["source"] = "original"

# Align columns: keep only FEATURE_COLS + source
keep_cols = FEATURE_COLS + ["source"]
df_combined = pd.concat(
    [df_orig_tagged[keep_cols], df_synthetic[keep_cols]],
    ignore_index=True,
)

# ── Summary counts ─────────────────────────────────────────────────────────────
n_orig      = len(df_orig_tagged)
n_synthetic = len(df_synthetic)
n_final     = len(df_combined)

print("=" * 50)
print(f"  Original row count  : {n_orig:,}")
print(f"  Synthetic row count : {n_synthetic:,}")
print(f"  Final row count     : {n_final:,}")
print("=" * 50)

print("\n── Risk label distribution (final) ─────────────")
rl_dist = df_combined["risk_label"].value_counts()
print(rl_dist.to_string())
print(f"  (proportions)")
print((rl_dist / rl_dist.sum()).round(3).to_string())

print("\n── City distribution (final) ───────────────────")
city_dist = df_combined["city"].value_counts()
print(city_dist.to_string())
desc_orig = df_orig[NUM_COLS].describe().T
desc_synt = df_synthetic[NUM_COLS].describe().T

desc_orig.columns = [f"orig_{c}" for c in desc_orig.columns]
desc_synt.columns = [f"synt_{c}" for c in desc_synt.columns]

comparison = pd.concat([desc_orig, desc_synt], axis=1)

# Reorder: orig_mean | synt_mean | orig_std | synt_std …
pairs = []
for stat in ["mean", "std", "min", "50%", "max"]:
    pairs += [f"orig_{stat}", f"synt_{stat}"]
existing_pairs = [c for c in pairs if c in comparison.columns]
comparison = comparison[existing_pairs]

print("\n── Summary statistics: Original vs Synthetic ───")
print(comparison.round(3).to_string())
# Plotting skipped to prevent MemoryError
OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
df_combined.to_csv(OUTPUT_CSV, index=False)

print(f"\n✅ Final dataset saved to: {OUTPUT_CSV}")
print(f"   Rows  : {len(df_combined):,}")
print(f"   Cols  : {len(df_combined.columns)}")
print(f"   Columns: {list(df_combined.columns)}")
df_combined.head()
try:
    from sdv.evaluation.single_table import run_diagnostic, evaluate_quality

    print("Running SDV diagnostic …")
    diagnostic = run_diagnostic(
        real_data=working_df,
        synthetic_data=df_synthetic[FEATURE_COLS],
        metadata=metadata,
    )
    print("\nRunning SDV quality report …")
    quality_report = evaluate_quality(
        real_data=working_df,
        synthetic_data=df_synthetic[FEATURE_COLS],
        metadata=metadata,
    )
    print(f"\n Overall Quality Score: {quality_report.get_score():.4f}")
except ImportError:
    print("SDV evaluation module not found – skipping quality report.")
except Exception as e:
    print(f"Quality report skipped: {e}")