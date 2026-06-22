import pandas as pd
df = pd.read_csv('../processed/final_driver_dataset.csv')
drivers = ['DRV0001', 'DRV0050', 'DRV0100', 'DRV0200', 'DRV0500']
for d in drivers:
    row = df[df['driver_id'] == d]
    if row.empty:
        print(f"{d} | N/A")
    else:
        print(f"{d} | {int(row['total_flags'].values[0])}")
