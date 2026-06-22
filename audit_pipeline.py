"""audit_pipeline.py — read-only inspection of pkl and CSV artifacts."""
import sys, os, pickle
import pandas as pd

# ── pkl inspection ─────────────────────────────────────────────────────────────
with open('models/risk_classifier.pkl', 'rb') as f:
    bundle = pickle.load(f)

print('=== risk_classifier.pkl ===')
print('model_name    :', bundle['model_name'])
print('feature_cols  :', bundle['feature_cols'])
print('class_names   :', bundle['class_names'])
print('leakage_free  :', bundle.get('leakage_free'))
print('excluded_cols :', bundle.get('excluded_cols'))
print('metrics       :', bundle.get('metrics'))

m = bundle['model']
print()
print('=== RandomForest internals ===')
print('n_estimators       :', m.n_estimators)
print('n_features_in_     :', m.n_features_in_)
print('classes_           :', list(m.classes_))
t0 = m.estimators_[0]
print('root n_node_samples (approx train rows seen):', t0.tree_.n_node_samples[0])

# ── CSV inspection ─────────────────────────────────────────────────────────────
print()
print('=== processed/final_driver_dataset.csv ===')
csv = pd.read_csv('processed/final_driver_dataset.csv')
print('Shape   :', csv.shape)
print('Columns :', list(csv.columns))
if 'source' in csv.columns:
    print('Source value_counts:')
    print(csv['source'].value_counts().to_string())
has_drvid = 'driver_id' in csv.columns
print('Has driver_id:', has_drvid)
if has_drvid:
    print('Sample driver_ids:', csv['driver_id'].head(5).tolist())
    last5 = csv['driver_id'].tail(5).tolist()
    print('Last  driver_ids:', last5)

# ── Check the 15k intermediate file ───────────────────────────────────────────
print()
p15k = 'processed/final_driver_dataset_15k.csv'
if os.path.exists(p15k):
    df15 = pd.read_csv(p15k)
    print('=== final_driver_dataset_15k.csv ===')
    print('Shape   :', df15.shape)
    print('Columns :', list(df15.columns))
    if 'source' in df15.columns:
        print('Source  :', df15['source'].value_counts().to_dict())
else:
    print('final_driver_dataset_15k.csv : FILE DOES NOT EXIST')

# ── Check driver_features.csv (the original seed data) ────────────────────────
print()
feat = pd.read_csv('processed/driver_features.csv')
print('=== processed/driver_features.csv ===')
print('Shape   :', feat.shape)
print('Columns :', list(feat.columns))

# ── Backup shapes ─────────────────────────────────────────────────────────────
print()
print('=== Backup files ===')
backups = sorted(f for f in os.listdir('processed') if 'BACKUP' in f)
for b in backups:
    try:
        bdf = pd.read_csv(f'processed/{b}')
        has_id = 'driver_id' in bdf.columns
        sample = bdf['driver_id'].head(3).tolist() if has_id else 'N/A'
        print(f'{b}  shape={bdf.shape}  driver_id={has_id}  sample={sample}')
    except Exception as e:
        print(f'{b}  ERROR: {e}')

# ── File timestamps ────────────────────────────────────────────────────────────
print()
print('=== File timestamps (mtime) ===')
files_to_check = [
    'processed/final_driver_dataset.csv',
    'processed/driver_features.csv',
    'models/risk_classifier.pkl',
    'models/encoders.pkl',
]
for fp in files_to_check:
    if os.path.exists(fp):
        mtime = os.path.getmtime(fp)
        import datetime
        dt = datetime.datetime.fromtimestamp(mtime)
        size = os.path.getsize(fp) / 1024
        print(f'{fp:<50}  {dt.strftime("%Y-%m-%d %H:%M:%S")}  ({size:,.1f} KB)')
    else:
        print(f'{fp:<50}  MISSING')
