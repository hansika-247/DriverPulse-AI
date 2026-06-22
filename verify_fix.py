import sys, os
os.chdir(os.path.join(os.path.dirname(os.path.abspath('.')), 'driver-pulse-hackathon', 'backend'))
sys.path.insert(0, os.getcwd())

from services.model_loader import load_all_assets, get_store
load_all_assets()

store = get_store()
df = store['df']

print("=== POST-FIX VERIFICATION ===")
print(f"Total drivers loaded : {len(df)}")
has_drvid = "driver_id" in df.columns
has_name  = "name" in df.columns
print(f"Has driver_id        : {has_drvid}")
print(f"Has name             : {has_name}")
print(f"First 5 IDs          : {df['driver_id'].head(5).tolist()}")
print(f"IDs 208-213          : {df['driver_id'].iloc[208:213].tolist()}")
null_ids  = df['driver_id'].isnull().sum()
dupl_ids  = df['driver_id'].duplicated().sum()
print(f"Null driver_ids      : {null_ids}")
print(f"Duplicate IDs        : {dupl_ids}")
print()

print("=== Tracing original DRV001 through full pipeline ===")
row = df[df['driver_id'] == 'DRV001']
if not row.empty:
    r = row.iloc[0]
    print(f"driver_id      : {r['driver_id']}")
    print(f"name           : {r['name']}")
    print(f"city           : {r['city']}")
    print(f"rating         : {r['rating']}")
    print(f"source         : {r['source']}")
    print("STATUS: DRV001 FOUND IN DATASET - lookup WILL succeed")
else:
    print("STATUS: DRV001 NOT FOUND - this would trigger assessment form")

print()
row_old = df[df['driver_id'] == 'DRV0001']
old_exists = not row_old.empty
print(f"Old broken DRV0001 exists: {old_exists} (should be False)")

print()
print("=== Backend model info ===")
print(f"Model name     : {store['model_name']}")
print(f"Feature cols   : {store['feature_cols']}")
print(f"Class names    : {store['class_names']}")
