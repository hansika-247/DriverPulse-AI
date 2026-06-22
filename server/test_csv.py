import pandas as pd
df = pd.read_csv('../processed/final_driver_dataset.csv')
drivers = ['DRV0001', 'DRV0050', 'DRV0100', 'DRV0200', 'DRV0500']
print('Driver ID | CSV Trips | CSV Flags')
for d in drivers:
    row = df[df['driver_id'] == d]
    if row.empty:
        print(d + ' NOT IN CSV')
    else:
        print(f"{d} | {int(row['total_trips'].values[0])} | {int(row['total_flags'].values[0])}")
