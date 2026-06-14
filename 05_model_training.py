import warnings, os, pickle
warnings.filterwarnings('ignore')

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import seaborn as sns
from matplotlib.colors import LinearSegmentedColormap

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import LabelEncoder, OrdinalEncoder
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report, ConfusionMatrixDisplay
)

# ── XGBoost (optional) ──────────────────────────────────────────────────────
try:
    from xgboost import XGBClassifier
    BOOST_LABEL = 'XGBoost'
    XGBOOST_AVAILABLE = True
    print('✅  XGBoost found – will use XGBoostClassifier')
except ImportError:
    BOOST_LABEL = 'Gradient Boosting'
    XGBOOST_AVAILABLE = False
    print('⚠️   XGBoost not installed – falling back to GradientBoostingClassifier')

# ── Paths ───────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.abspath(os.getcwd())
DATA_PATH  = os.path.join(BASE_DIR, 'processed', 'final_driver_dataset_15k.csv')
MODELS_DIR = os.path.join(BASE_DIR, 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

RANDOM_STATE = 42
TEST_SIZE    = 0.20

# ── Styling ─────────────────────────────────────────────────────────────────
PALETTE = {'RF': '#3498db', BOOST_LABEL: '#e67e22'}
sns.set_style('whitegrid')
plt.rcParams.update({'figure.dpi': 110, 'font.family': 'sans-serif'})

print(f'Dataset : {DATA_PATH}')
print(f'Models  : {MODELS_DIR}')
df_raw = pd.read_csv(DATA_PATH)
print(f'Raw shape : {df_raw.shape}')
print(f'Columns   : {list(df_raw.columns)}')
df_raw.head(3)
# Quick sanity: confirm risk_score is derived from risk_label (leakage proof)
print('risk_score ranges by risk_label (proves perfect separation – i.e. leakage):')
print(df_raw.groupby('risk_label')['risk_score'].agg(['min','max','mean']).round(2))

print('\nTarget distribution:')
vc = df_raw['risk_label'].value_counts()
print(vc.to_string())

fig, axes = plt.subplots(1, 2, figsize=(12, 4))

# Left – label distribution
order  = ['HIGH', 'MEDIUM', 'LOW']
colors = ['#e74c3c', '#f39c12', '#2ecc71']
counts = [vc.get(l, 0) for l in order]
bars = axes[0].bar(order, counts, color=colors, edgecolor='white', linewidth=1.5, width=0.5)
for bar, cnt in zip(bars, counts):
    axes[0].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 30,
                 str(cnt), ha='center', va='bottom', fontweight='bold', fontsize=11)
axes[0].set_title('Risk Label Distribution', fontsize=13, fontweight='bold')
axes[0].set_ylabel('Count')
axes[0].spines[['top','right']].set_visible(False)

# Right – risk_score by label (showing the leakage)
for i, (label, col) in enumerate(zip(order, colors)):
    vals = df_raw[df_raw['risk_label'] == label]['risk_score']
    axes[1].violinplot(vals, positions=[i], showmedians=True)
axes[1].set_xticks(range(3))
axes[1].set_xticklabels(order)
axes[1].set_title('risk_score by risk_label\n(⚠️ Perfect separation → must exclude)', fontsize=12, fontweight='bold')
axes[1].set_ylabel('risk_score')
axes[1].spines[['top','right']].set_visible(False)

plt.tight_layout()
plt.show()
# ── Columns to EXCLUDE from features ────────────────────────────────────────
EXCLUDE = [
    'risk_score',   # ← TARGET LEAKAGE: risk_label is bucketed directly from this
    'risk_label',   # ← this is the target itself
    'source',       # ← metadata, not a predictive signal
]

# ── Derive experience_level from experience_months ───────────────────────────
def months_to_level(m):
    """0-5 months → junior | 6-23 months → mid | 24+ months → senior"""
    if   m <  6: return 'junior'
    elif m < 24: return 'mid'
    else:        return 'senior'

df_raw['experience_level'] = df_raw['experience_months'].apply(months_to_level)

df_work = df_raw.copy()

# ── Final feature set ────────────────────────────────────────────────────────
FEATURE_COLS = [
    'city',
    'shift_preference',
    'avg_hours_per_day',
    'avg_earnings_per_hour',
    'experience_months',
    'rating',
    'experience_level',
    'daily_productivity',
    'avg_combined_score',
    'avg_motion_score',
    'avg_audio_score',
    'total_flags',
]
TARGET_COL = 'risk_label'

assert 'risk_score' not in FEATURE_COLS, 'Leakage detected!'
print(f'Feature count : {len(FEATURE_COLS)}')
print(f'Features      : {FEATURE_COLS}')
print(f'Target        : {TARGET_COL}')
print(f'risk_score    : EXCLUDED ✅')
# ── Missing value check ──────────────────────────────────────────────────────
missing = df_work[FEATURE_COLS + [TARGET_COL]].isnull().sum()
print('Missing values:')
print(missing[missing > 0] if missing.any() else 'None ✅')

# Fill any stragglers
for col in FEATURE_COLS:
    if df_work[col].dtype == object:
        df_work[col] = df_work[col].fillna('unknown')
    else:
        df_work[col] = df_work[col].fillna(df_work[col].median())

print('\nFeature dtypes:')
print(df_work[FEATURE_COLS].dtypes.to_string())
df_enc    = df_work[FEATURE_COLS + [TARGET_COL]].copy()
encoders  = {}   # persisted alongside the model

# ── Nominal categoricals (no natural order) ──────────────────────────────────
NOMINAL_COLS = ['city', 'shift_preference']
for col in NOMINAL_COLS:
    le = LabelEncoder()
    df_enc[col] = le.fit_transform(df_enc[col].astype(str))
    encoders[col] = le
    print(f'  LabelEncoder   [{col:>18}] → {list(le.classes_)}')

# ── Ordinal categorical (junior < mid < senior) ──────────────────────────────
ORDINAL_COL   = 'experience_level'
ORDINAL_ORDER = [['junior', 'mid', 'senior']]
oe = OrdinalEncoder(
    categories=ORDINAL_ORDER,
    handle_unknown='use_encoded_value',
    unknown_value=-1
)
df_enc[ORDINAL_COL] = oe.fit_transform(df_enc[[ORDINAL_COL]]).astype(int)
encoders[ORDINAL_COL] = oe
print(f'  OrdinalEncoder [{ORDINAL_COL:>18}] → {ORDINAL_ORDER[0]}')

# ── Target ───────────────────────────────────────────────────────────────────
target_le = LabelEncoder()
df_enc[TARGET_COL] = target_le.fit_transform(df_enc[TARGET_COL])
encoders[TARGET_COL] = target_le
CLASS_NAMES = list(target_le.classes_)
print(f'\nTarget classes : {CLASS_NAMES} → {list(range(len(CLASS_NAMES)))}')
print('\nSample (encoded):')
df_enc.head(3)
X = df_enc[FEATURE_COLS]
y = df_enc[TARGET_COL]

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size    = TEST_SIZE,
    random_state = RANDOM_STATE,
    stratify     = y      # preserve class ratios
)

print(f'Total   : {len(df_enc):,} samples')
print(f'Train   : {len(X_train):,} ({len(X_train)/len(df_enc)*100:.0f}%)')
print(f'Test    : {len(X_test):,}  ({len(X_test)/len(df_enc)*100:.0f}%)')
print(f'Features: {len(FEATURE_COLS)} → {FEATURE_COLS}')

print('\nClass distribution in train split:')
for cls_idx, cls_name in enumerate(CLASS_NAMES):
    n = (y_train == cls_idx).sum()
    print(f'  {cls_name:<8} {n:4d}  ({n/len(y_train)*100:.1f}%)')
# ── Random Forest ────────────────────────────────────────────────────────────
print('Training Random Forest …')
rf_model = RandomForestClassifier(
    n_estimators   = 400,
    max_depth      = None,
    min_samples_leaf = 2,
    max_features   = 'sqrt',
    class_weight   = 'balanced',
    random_state   = RANDOM_STATE,
    n_jobs         = -1
)
rf_model.fit(X_train, y_train)

# 5-fold CV on training data
cv_rf = cross_val_score(rf_model, X_train, y_train,
                         cv=StratifiedKFold(5, shuffle=True, random_state=RANDOM_STATE),
                         scoring='f1_weighted', n_jobs=-1)
print(f'  ✅  Random Forest trained.  CV F1 = {cv_rf.mean():.4f} ± {cv_rf.std():.4f}')
# ── Boosting model (XGBoost or Gradient Boosting fallback) ───────────────────
print(f'Training {BOOST_LABEL} …')

if XGBOOST_AVAILABLE:
    boost_model = XGBClassifier(
        n_estimators     = 400,
        max_depth        = 6,
        learning_rate    = 0.05,
        subsample        = 0.8,
        colsample_bytree = 0.8,
        eval_metric      = 'mlogloss',
        random_state     = RANDOM_STATE,
        n_jobs           = -1,
        verbosity        = 0
    )
else:
    boost_model = GradientBoostingClassifier(
        n_estimators   = 300,
        max_depth      = 5,
        learning_rate  = 0.05,
        subsample      = 0.8,
        random_state   = RANDOM_STATE
    )

boost_model.fit(X_train, y_train)

cv_boost = cross_val_score(boost_model, X_train, y_train,
                            cv=StratifiedKFold(5, shuffle=True, random_state=RANDOM_STATE),
                            scoring='f1_weighted', n_jobs=-1)
print(f'  ✅  {BOOST_LABEL} trained.  CV F1 = {cv_boost.mean():.4f} ± {cv_boost.std():.4f}')
def get_metrics(name, model, X, y):
    preds = model.predict(X)
    return {
        'Model'    : name,
        'Accuracy' : accuracy_score(y, preds),
        'Precision': precision_score(y, preds, average='weighted', zero_division=0),
        'Recall'   : recall_score(y, preds, average='weighted', zero_division=0),
        'F1 Score' : f1_score(y, preds, average='weighted', zero_division=0),
    }, preds

results  = []
all_preds = {}

for name, model in [('Random Forest', rf_model), (BOOST_LABEL, boost_model)]:
    m, p = get_metrics(name, model, X_test, y_test)
    results.append(m)
    all_preds[name] = p

metrics_df = pd.DataFrame(results).set_index('Model')

print('=' * 62)
print('         MODEL COMPARISON — Test Set (weighted averages)')
print('=' * 62)
print(metrics_df.to_string(float_format='{:.4f}'.format))
print('=' * 62)
# ── Grouped bar chart ────────────────────────────────────────────────────────
metric_cols = ['Accuracy', 'Precision', 'Recall', 'F1 Score']
model_names = list(metrics_df.index)
x      = np.arange(len(metric_cols))
width  = 0.35
colors = ['#3498db', '#e67e22']

fig, ax = plt.subplots(figsize=(10, 5))
for i, (mname, col) in enumerate(zip(model_names, colors)):
    offset = (i - 0.5) * width
    vals   = [metrics_df.loc[mname, c] for c in metric_cols]
    bars   = ax.bar(x + offset, vals, width, label=mname,
                    color=col, edgecolor='white', linewidth=1.2, alpha=0.92)
    for bar, v in zip(bars, vals):
        ax.text(bar.get_x() + bar.get_width()/2,
                bar.get_height() + 0.005,
                f'{v:.3f}', ha='center', va='bottom',
                fontsize=8.5, fontweight='bold', color='#2c3e50')

ax.set_xticks(x)
ax.set_xticklabels(metric_cols, fontsize=11)
ax.set_ylim(0, 1.14)
ax.set_ylabel('Score', fontsize=11)
ax.set_title('Model Comparison – Weighted Metrics (No Target Leakage)', fontsize=13, fontweight='bold')
ax.legend(fontsize=10, framealpha=0.9)
ax.spines[['top','right']].set_visible(False)
ax.set_facecolor('#f8f9fa')
fig.patch.set_facecolor('#ffffff')
plt.tight_layout()
plt.show()
# ── Confusion Matrices ────────────────────────────────────────────────────────
fig, axes = plt.subplots(1, 2, figsize=(13, 5))
cmaps = ['Blues', 'Oranges']

for ax, (mname, preds), cmap in zip(axes, all_preds.items(), cmaps):
    cm   = confusion_matrix(y_test, preds)
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=CLASS_NAMES)
    disp.plot(ax=ax, colorbar=False, cmap=cmap)
    acc = accuracy_score(y_test, preds)
    ax.set_title(f'{mname}\nAccuracy = {acc:.4f}', fontsize=12, fontweight='bold')
    ax.set_xlabel('Predicted Label', fontsize=10)
    ax.set_ylabel('True Label', fontsize=10)

plt.suptitle('Confusion Matrices — Test Set', fontsize=14, fontweight='bold', y=1.02)
plt.tight_layout()
plt.show()
for mname, preds in all_preds.items():
    print('=' * 58)
    print(f'  Classification Report  —  {mname}')
    print('=' * 58)
    print(classification_report(y_test, preds,
                                target_names=CLASS_NAMES,
                                zero_division=0))
    print()
def feature_importance_df(model, feature_names):
    return pd.Series(
        model.feature_importances_,
        index=feature_names
    ).sort_values(ascending=False)

fi_rf    = feature_importance_df(rf_model,    FEATURE_COLS)
fi_boost = feature_importance_df(boost_model, FEATURE_COLS)

# ── Side-by-side importance plots ────────────────────────────────────────────
fig, axes = plt.subplots(1, 2, figsize=(16, 6))

for ax, (fi, mname, color) in zip(axes, [
        (fi_rf,    'Random Forest', '#3498db'),
        (fi_boost, BOOST_LABEL,     '#e67e22')
    ]):
    fi_sorted = fi.sort_values()
    n = len(fi_sorted)
    cmap_base = plt.cm.Blues if color == '#3498db' else plt.cm.Oranges
    bar_colors = cmap_base(np.linspace(0.35, 0.85, n))

    bars = ax.barh(fi_sorted.index, fi_sorted.values,
                   color=bar_colors, edgecolor='white', linewidth=0.8, height=0.65)

    for bar, v in zip(bars, fi_sorted.values):
        ax.text(v + fi_sorted.max() * 0.01,
                bar.get_y() + bar.get_height()/2,
                f'{v:.4f}', va='center', fontsize=8.5, color='#2c3e50')

    ax.set_title(f'{mname}\nFeature Importances', fontsize=12, fontweight='bold')
    ax.set_xlabel('Importance Score', fontsize=10)
    ax.spines[['top','right']].set_visible(False)
    ax.set_facecolor('#f9f9f9')

plt.suptitle('Feature Importances (risk_score excluded — no leakage)',
             fontsize=13, fontweight='bold')
plt.tight_layout()
plt.show()
# ── Cross-model importance agreement ─────────────────────────────────────────
fi_compare = pd.DataFrame({
    'Random Forest': fi_rf,
    BOOST_LABEL    : fi_boost
}).fillna(0).sort_values('Random Forest', ascending=False)

print('Feature Importance Comparison:')
print(fi_compare.to_string(float_format='{:.4f}'.format))
best_model_name = metrics_df['F1 Score'].idxmax()
best_model_obj  = rf_model if best_model_name == 'Random Forest' else boost_model
best_metrics    = metrics_df.loc[best_model_name]

print('╔══════════════════════════════════════════════════════╗')
print('║            BEST MODEL SELECTED                       ║')
print('╠══════════════════════════════════════════════════════╣')
print(f'║  Model     : {best_model_name:<39}║')
print(f'║  Accuracy  : {best_metrics["Accuracy"]:.4f}                              ║')
print(f'║  Precision : {best_metrics["Precision"]:.4f}                              ║')
print(f'║  Recall    : {best_metrics["Recall"]:.4f}                              ║')
print(f'║  F1 Score  : {best_metrics["F1 Score"]:.4f} (selection criterion)       ║')
print('╚══════════════════════════════════════════════════════╝')
# ── risk_classifier.pkl ──────────────────────────────────────────────────────
clf_path = os.path.join(MODELS_DIR, 'risk_classifier.pkl')
with open(clf_path, 'wb') as f:
    pickle.dump({
        'model'        : best_model_obj,
        'model_name'   : best_model_name,
        'feature_cols' : FEATURE_COLS,
        'class_names'  : CLASS_NAMES,
        'metrics'      : best_metrics.to_dict(),
        'leakage_free' : True,
        'excluded_cols': ['risk_score', 'source'],
    }, f)
print(f'✅  Saved  risk_classifier.pkl   ({os.path.getsize(clf_path)/1024:.1f} KB)')

# ── encoders.pkl ─────────────────────────────────────────────────────────────
enc_path = os.path.join(MODELS_DIR, 'encoders.pkl')
with open(enc_path, 'wb') as f:
    pickle.dump(encoders, f)
print(f'✅  Saved  encoders.pkl          ({os.path.getsize(enc_path)/1024:.1f} KB)')

print(f'\nAll files in {MODELS_DIR}:')
for fname in sorted(os.listdir(MODELS_DIR)):
    fpath = os.path.join(MODELS_DIR, fname)
    print(f'   {fname:<40}  {os.path.getsize(fpath)/1024:>8.1f} KB')
# ── Numeric summary ──────────────────────────────────────────────────────────
final_preds    = best_model_obj.predict(X_test)
final_accuracy = accuracy_score(y_test, final_preds)
final_f1       = f1_score(y_test, final_preds, average='weighted')

print('╔════════════════════════════════════════════════════════════╗')
print('║            FINAL MODEL PERFORMANCE SUMMARY                 ║')
print('╠════════════════════════════════════════════════════════════╣')
print(f'║  Best model          : {best_model_name:<36}║')
print(f'║  Leakage-free        : YES (risk_score excluded)          ║')
print(f'║  Final test accuracy : {final_accuracy*100:.2f}%                             ║')
print(f'║  Final F1 (weighted) : {final_f1:.4f}                             ║')
print(f'║  Train samples       : {len(X_train):<36}║')
print(f'║  Test  samples       : {len(X_test):<36}║')
print(f'║  Feature count       : {len(FEATURE_COLS):<36}║')
print('╚════════════════════════════════════════════════════════════╝')

# ── Top-10 important features ────────────────────────────────────────────────
fi_best = feature_importance_df(best_model_obj, FEATURE_COLS)
top10   = fi_best.head(10)

print('\nTop-10 Most Important Features (no risk_score leakage):')
print('─' * 55)
max_imp = top10.max()
for rank, (feat, imp) in enumerate(top10.items(), 1):
    bar_len = int((imp / max_imp) * 28)
    bar = '█' * bar_len + '░' * (28 - bar_len)
    print(f'  {rank:>2}. {feat:<28} {imp:.4f}  {bar}')
print('─' * 55)
# ── Final top-10 chart ────────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(10, 5))

top10_sorted = top10.sort_values()
n = len(top10_sorted)
grad_colors  = plt.cm.RdYlGn_r(np.linspace(0.1, 0.85, n))

bars = ax.barh(top10_sorted.index, top10_sorted.values,
               color=grad_colors, edgecolor='white', linewidth=0.8, height=0.65)

for bar, v in zip(bars, top10_sorted.values):
    ax.text(v + top10_sorted.max() * 0.01,
            bar.get_y() + bar.get_height()/2,
            f'{v:.4f}', va='center', fontsize=9,
            fontweight='bold', color='#2c3e50')

ax.set_title(
    f'Top-10 Feature Importances — {best_model_name}\n'
    f'(risk_score excluded | Test Accuracy = {final_accuracy*100:.2f}%)',
    fontsize=12, fontweight='bold'
)
ax.set_xlabel('Importance Score', fontsize=11)
ax.spines[['top','right']].set_visible(False)
ax.set_facecolor('#f8f9fa')
fig.patch.set_facecolor('#ffffff')
plt.tight_layout()
plt.show()

print('\n🏁  Notebook complete — artifacts saved to models/')