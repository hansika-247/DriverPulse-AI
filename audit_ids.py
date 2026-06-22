import pandas as pd
import os

base = r'c:\Users\rishi\OneDrive\Desktop\Driverpulse\driver-pulse-hackathon'

# Check final_driver_dataset.csv columns
df_final = pd.read_csv(f'{base}/processed/final_driver_dataset.csv')
df_feat  = pd.read_csv(f'{base}/processed/driver_features.csv')
df_drv   = pd.read_csv(f'{base}/driver_pulse_hackathon_data/drivers.csv')

print("=== final_driver_dataset.csv ===")
print("Columns:", list(df_final.columns))
has_id = 'driver_id' in df_final.columns
print("Has driver_id:", has_id)
print("Shape:", df_final.shape)
print()

print("=== Source drivers.csv driver_id ===")
print("IDs:", df_drv['driver_id'].head(5).tolist())
print("Total:", len(df_drv))
print()

print("=== driver_features.csv driver_id ===")
print("IDs:", df_feat['driver_id'].head(5).tolist())
print("Total:", len(df_feat))
print()

# Simulate what backend does
df_reset = df_final.reset_index(drop=True)
df_reset['driver_id'] = df_reset.index.map(lambda i: f'DRV{i+1:04d}')
print("=== Backend-generated driver_id (model_loader.py line 68) ===")
print("First 5:", df_reset['driver_id'].head(5).tolist())
print("Last 1: ", df_reset['driver_id'].tail(1).values[0])
print()

# ID collision check
orig_ids    = set(df_drv['driver_id'].tolist())
backend_ids = set(df_reset['driver_id'].tolist())
matching    = orig_ids.intersection(backend_ids)
print("=== ID Collision Analysis ===")
print("Source IDs (sample):", sorted(list(orig_ids))[:5], "(format: DRV001)")
print("Backend IDs (sample):", sorted(list(backend_ids))[:5], "(format: DRV0001)")
print("ID overlap count:", len(matching))
if matching:
    print("Overlapping IDs:", sorted(list(matching))[:5])
print()

# Check if 15k dataset exists
path_15k = f'{base}/processed/final_driver_dataset_15k.csv'
if os.path.exists(path_15k):
    df_15k = pd.read_csv(path_15k)
    print("=== final_driver_dataset_15k.csv ===")
    print("Shape:", df_15k.shape)
    print("Columns:", list(df_15k.columns))
    has_15k_id = 'driver_id' in df_15k.columns
    print("Has driver_id:", has_15k_id)
else:
    print("final_driver_dataset_15k.csv does NOT exist")

print()
# Other source datasets
for fname in ['earnings_velocity_log.csv', 'flagged_moments.csv', 'trip_summaries.csv', 'accelerometer_data.csv', 'audio_intensity_data.csv', 'driver_goals.csv']:
    path = f'{base}/driver_pulse_hackathon_data/{fname}'
    if os.path.exists(path):
        df_tmp = pd.read_csv(path)
        has_drvid = 'driver_id' in df_tmp.columns
        first_ids = df_tmp['driver_id'].head(3).tolist() if has_drvid else []
        print(f"{fname}: shape={df_tmp.shape}, has_driver_id={has_drvid}, first_ids={first_ids}")
