import pandas as pd

# Check what format original driver_features.csv uses
df_feat = pd.read_csv('processed/driver_features.csv')
print('driver_features.csv:')
has_id = 'driver_id' in df_feat.columns
print(f'  Has driver_id: {has_id}')
print(f'  Shape: {df_feat.shape}')
if has_id:
    print(f'  Sample IDs: {list(df_feat["driver_id"].head(10))}')
    print(f'  ID format length: {len(df_feat["driver_id"].iloc[0])}')
    print(f'  ID format sample: {repr(df_feat["driver_id"].iloc[0])}')

print()
# Check final_driver_dataset — what source values and ID formats mix
df = pd.read_csv('processed/final_driver_dataset.csv')
print('final_driver_dataset.csv source breakdown:')
print(df['source'].value_counts().to_dict())
print()

# Check original rows IDs
orig_rows = df[df['source']=='original']
print(f'Original rows: {len(orig_rows)}')
if len(orig_rows) > 0:
    print(f'  First original ID: {repr(orig_rows["driver_id"].iloc[0])}')
    print(f'  Last original ID:  {repr(orig_rows["driver_id"].iloc[-1])}')
    print(f'  Sample IDs: {list(orig_rows["driver_id"].head(5))}')
    
synth_rows = df[df['source']=='synthetic']
print(f'Synthetic rows: {len(synth_rows)}')
if len(synth_rows) > 0:
    print(f'  First synthetic ID: {repr(synth_rows["driver_id"].iloc[0])}')
    print(f'  Last synthetic ID:  {repr(synth_rows["driver_id"].iloc[-1])}')
    print(f'  Sample IDs: {list(synth_rows["driver_id"].head(5))}')
