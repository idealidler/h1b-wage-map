import pandas as pd
import json
import math
import ssl
import shutil
from pathlib import Path

try:
    ssl._create_default_https_context = ssl._create_unverified_context
except AttributeError:
    pass

DATA_VERSION = "2026-27"
BASE_DIR = Path(__file__).resolve().parent
INPUT_DIR = BASE_DIR / "raw_data_26_27"
OUTPUT_DIR = BASE_DIR.parent / "site" / "public" / f"jobs-{DATA_VERSION}"
WAGE_FILE = INPUT_DIR / "ALC_Export.csv"
GEOGRAPHY_FILE = INPUT_DIR / "Geography.csv"
OCCUPATION_FILE = INPUT_DIR / "oes_soc_occs.csv"
FIPS_URL = "https://raw.githubusercontent.com/kjhealy/fips-codes/master/county_fips_master.csv"


def require_columns(frame, required, source):
    missing = sorted(set(required) - set(frame.columns))
    if missing:
        raise ValueError(f"{source} is missing required columns: {', '.join(missing)}")


def normalize_soc(value):
    return str(value).strip().replace(".00", "")

print("--- STEP 1: LOAD DATA ---")
df_fact = pd.read_csv(WAGE_FILE, low_memory=False)
require_columns(df_fact, ["Area", "SocCode", "Level1", "Level2", "Level3", "Level4"], WAGE_FILE.name)
df_fact["Area"] = df_fact["Area"].astype(str).str.strip()
df_fact["SocCode"] = df_fact["SocCode"].map(normalize_soc)

df_geo = pd.read_csv(GEOGRAPHY_FILE, dtype=str)
require_columns(df_geo, ["Area", "StateAb", "State", "CountyTownName"], GEOGRAPHY_FILE.name)
df_geo["Area"] = df_geo["Area"].astype(str).str.strip()

# Load Job Titles (So we can show "Accountant" instead of "13-2011")
df_jobs = pd.read_csv(OCCUPATION_FILE, dtype=str)
require_columns(df_jobs, ["soccode", "Title"], OCCUPATION_FILE.name)
df_jobs["soccode"] = df_jobs["soccode"].map(normalize_soc)
job_map = pd.Series(df_jobs.Title.values, index=df_jobs.soccode).to_dict()

print("--- STEP 2: JOIN WAGES + GEOGRAPHY ---")
df_merged = pd.merge(df_fact, df_geo, on='Area', how='inner')
if len(df_merged) == 0:
    raise ValueError("No wage records matched the geography file")
print(f"Wage rows: {len(df_fact)}; geography matches: {len(df_merged)}")

print("--- STEP 3: PREPARE FIPS TRANSLATOR ---")
fips_url = "https://raw.githubusercontent.com/kjhealy/fips-codes/master/county_fips_master.csv"
df_fips = pd.read_csv(FIPS_URL, encoding='ISO-8859-1', dtype=str)

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
if len(final_df) == 0:
    raise ValueError("No records matched the FIPS geography translator")

# --- STEP 4: GENERATE FILES (THE MAGIC PART) ---
if OUTPUT_DIR.exists():
    shutil.rmtree(OUTPUT_DIR)
OUTPUT_DIR.mkdir(parents=True)

# Wage exports can contain hourly or annual rows. Decide once per row so an
# hourly Level 4 value above $200 is not misclassified by itself.
def get_annual_levels(row):
    values = []
    for column in ["Level1", "Level2", "Level3", "Level4"]:
        try:
            value = float(row[column])
            values.append(value if math.isfinite(value) else 0)
        except (TypeError, ValueError):
            values.append(0)

    multiplier = 1 if max(values) >= 1000 else 2080
    return [int(value * multiplier) if value else 0 for value in values]

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
        level1, level2, level3, level4 = get_annual_levels(row)
        fips = str(row['fips']).zfill(5)
        job_data[fips] = {
            "c": row['CountyTownName'],
            "s": row['StateAb'],
            "l1": level1,
            "l2": level2,
            "l3": level3,
            "l4": level4
        }
    
    # Save file: e.g., "public/jobs/15-1252.json"
    safe_soc = soc.replace("/", "-") # Handle weird codes
    with open(OUTPUT_DIR / f'{safe_soc}.json', 'w') as f:
        json.dump(job_data, f)
        
    # Add to search index
    job_title = job_map.get(soc, f"Job Code {soc}") # Use name if found, else code
    search_index.append({"soc": safe_soc, "title": job_title})

# Save the Master Search List
with open(OUTPUT_DIR / 'job-index.json', 'w') as f:
    json.dump(search_index, f)

manifest = {
    "dataset": "OFLC Wage Year 2026-27",
    "effective_period": "July 2026 - June 2027",
    "source": "U.S. Department of Labor OFLC",
    "primary_wage_file": WAGE_FILE.name,
    "geography_file": GEOGRAPHY_FILE.name,
    "occupation_file": OCCUPATION_FILE.name,
    "wage_rows": int(len(df_fact)),
    "mapped_rows": int(len(final_df)),
    "soc_count": int(len(search_index)),
    "generated_at_utc": pd.Timestamp.now(tz="UTC").isoformat(),
}
with open(OUTPUT_DIR / 'data-manifest.json', 'w') as f:
    json.dump(manifest, f, indent=2)

print(f"✅ DONE! Created {len(search_index)} job files and 1 master index in {OUTPUT_DIR}.")