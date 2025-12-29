import pandas as pd

# Load the geography file
df = pd.read_csv('geography.csv', nrows=10)

print("--- COLUMN NAMES ---")
print(list(df.columns))

print("\n--- SAMPLE DATA (First 5 Rows) ---")
print(df.head(5))