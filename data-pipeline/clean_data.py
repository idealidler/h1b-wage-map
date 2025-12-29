import pandas as pd
import json
import os
import ssl

# --- SSL PATCH ---
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

print("--- STEP 1: LOAD DATA ---")
df_fact = pd.read_csv('ALC_Export.csv', low_memory=False)
df_fact['Area'] = df_fact['Area'].astype(str)
df_fact['SocCode'] = df_fact['SocCode'].astype(str)

df_geo = pd.read_csv('geography.csv', dtype=str)
df_geo['Area'] = df_geo['Area'].astype(str)

# Load Job Titles (So we can show "Accountant" instead of "13-2011")
try:
    df_jobs = pd.read_csv('oes_soc_occs.csv', dtype=str)
    # Create a dictionary: {'15-1252': 'Software Developers'}
    job_map = pd.Series(df_jobs.Title.values, index=df_jobs.soccode).to_dict()
except:
    job_map = {}

print("--- STEP 2: JOIN WAGES + GEOGRAPHY ---")
df_merged = pd.merge(df_fact, df_geo, on='Area', how='inner')

print("--- STEP 3: PREPARE FIPS TRANSLATOR ---")
fips_url = "https://raw.githubusercontent.com/kjhealy/fips-codes/master/county_fips_master.csv"
df_fips = pd.read_csv(fips_url, encoding='ISO-8859-1', dtype=str)

# Normalize names for joining
df_merged['CleanName'] = df_merged['CountyTownName'].str.lower().str.replace(' county', '').str.strip()
df_merged['State'] = df_merged['State'].str.upper().str.strip()
df_fips['county_name'] = df_fips['county_name'].str.lower().str.replace(' county', '').str.strip()
df_fips['state_name'] = df_fips['state_name'].str.upper().str.strip()

# Full join to get FIPS codes
final_df = pd.merge(
    df_merged,
    df_fips,
    left_on=['State', 'CleanName'],
    right_on=['state_name', 'county_name'],
    how='inner'
)

print(f"Total Mapped Records: {len(final_df)}")

# --- STEP 4: GENERATE FILES (THE MAGIC PART) ---
output_dir = '../site/public/jobs'
os.makedirs(output_dir, exist_ok=True)

# helper for wages
def get_annual(val):
    try:
        f_val = float(val)
        return int(f_val * 2080) if f_val < 200 else int(f_val)
    except:
        return 0

# Get list of all unique jobs in the data
unique_socs = final_df['SocCode'].unique()
print(f"Splitting data into {len(unique_socs)} individual job files...")

search_index = [] # We will store "Job Title -> SOC Code" here for the search bar

for soc in unique_socs:
    # Filter for this specific job
    df_job = final_df[final_df['SocCode'] == soc]
    
    # Skip if too few data points (garbage data)
    if len(df_job) < 50: 
        continue
        
    # Build the JSON content
    job_data = {}
    for _, row in df_job.iterrows():
        fips = str(row['fips']).zfill(5)
        job_data[fips] = {
            "c": row['CountyTownName'],
            "s": row['StateAb'],
            "l1": get_annual(row['Level1']),
            "l2": get_annual(row['Level2']),
            "l3": get_annual(row['Level3']),
            "l4": get_annual(row['Level4'])
        }
    
    # Save file: e.g., "public/jobs/15-1252.json"
    safe_soc = soc.replace("/", "-") # Handle weird codes
    with open(f'{output_dir}/{safe_soc}.json', 'w') as f:
        json.dump(job_data, f)
        
    # Add to search index
    job_title = job_map.get(soc, f"Job Code {soc}") # Use name if found, else code
    search_index.append({"soc": safe_soc, "title": job_title})

# Save the Master Search List
with open('../site/public/job-index.json', 'w') as f:
    json.dump(search_index, f)

print(f"✅ DONE! Created {len(search_index)} job files and 1 master index.")