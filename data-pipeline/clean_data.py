import pandas as pd
import numpy as np
import json
import os

# --- CONFIGURATION ---
OUTPUT_DIR = '../site/public/jobs'
# This replaces the need for the convert_soc.py script entirely!
SOC_DATA_FILE = '../site/public/soc_data.json' 
OFFICIAL_SOC_EXCEL = 'reference_data/Occupation_Data.xlsx'
TECH_SKILLS_EXCEL = 'reference_data/Technology Skills.xlsx'
# Pointing directly to your local master file
FIPS_FILE = 'reference_data/county_fips_master.csv'

def process_wage_data():
    print("🚀 STEP 1: LOAD WAGE & GEOGRAPHY DATA...")
    try:
        df_fact = pd.read_csv('ALC_Export.csv', low_memory=False)
        df_geo = pd.read_csv('Geography.csv', dtype=str)
    except Exception as e:
        print(f"❌ Error loading raw CSV files: {e}")
        return

    df_fact['Area'] = df_fact['Area'].astype(str)
    df_fact['SocCode'] = df_fact['SocCode'].astype(str)
    df_geo['Area'] = df_geo['Area'].astype(str)

    print("🔗 STEP 2: JOIN WAGES + GEOGRAPHY...")
    df_merged = pd.merge(df_fact, df_geo, on='Area', how='inner')

    print("🗺️  STEP 3: LOAD LOCAL FIPS MASTER...")
    try:
        # Using the local file you downloaded!
        df_fips = pd.read_csv(FIPS_FILE, encoding='ISO-8859-1', dtype=str)
    except Exception as e:
        print(f"❌ Error loading local FIPS dataset at {FIPS_FILE}: {e}")
        return

    # Vectorized string normalization
    df_merged['CleanName'] = df_merged['CountyTownName'].astype(str).str.lower().str.replace(' county', '', regex=False).str.strip()
    df_merged['State'] = df_merged['State'].astype(str).str.upper().str.strip()
    
    df_fips['county_name'] = df_fips['county_name'].astype(str).str.lower().str.replace(' county', '', regex=False).str.strip()
    df_fips['state_name'] = df_fips['state_name'].astype(str).str.upper().str.strip()

    # Join to get FIPS codes
    final_df = pd.merge(
        df_merged,
        df_fips,
        left_on=['State', 'CleanName'],
        right_on=['state_name', 'county_name'],
        how='inner'
    )
    final_df['fips'] = final_df['fips'].astype(str).str.zfill(5)

    print(f"✅ Total Mapped Records: {len(final_df)}")

    print("⚡ STEP 4: VECTORIZING WAGE CALCULATIONS...")
    wage_cols = ['Level1', 'Level2', 'Level3', 'Level4']
    for col in wage_cols:
        final_df[col] = pd.to_numeric(final_df[col], errors='coerce').fillna(0)
        final_df[col] = np.where(final_df[col] < 200, final_df[col] * 2080, final_df[col]).astype(int)

    print("📊 STEP 5: BUILDING SOC DIMENSION TABLE...")
    try:
        df_soc = pd.read_excel(OFFICIAL_SOC_EXCEL)
        dim_soc = pd.DataFrame()
        
        # 1. Detailed O*NET Code (e.g. 15-2051.01)
        dim_soc['onet_soc_code'] = df_soc['O*NET-SOC Code'].astype(str)
        
        # 2. Base SOC Code (e.g. 15-2051) - Strip the decimal extension
        dim_soc['base_soc'] = dim_soc['onet_soc_code'].str.split('.').str[0]
        
        # 3. Official Title
        dim_soc['occupation_title'] = df_soc['Title'].astype(str)
        
        # 4. Description (for the AI Matcher)
        if 'Description' in df_soc.columns:
            dim_soc['description'] = df_soc['Description'].astype(str)
        else:
            dim_soc['description'] = ""
            
    except Exception as e:
        print(f"❌ Error loading Official SOC data: {e}")
        return

    print("🧠 STEP 5B: BUILDING TECHNOLOGY SKILLS INDEX...")
    tech_by_onet = {}
    tech_by_base = {}
    try:
        df_tech = pd.read_excel(
            TECH_SKILLS_EXCEL,
            usecols=["O*NET-SOC Code", "Title", "Example"]
        )
        df_tech = df_tech.rename(columns={
            "O*NET-SOC Code": "onet_soc_code",
            "Title": "title",
            "Example": "example",
        })

        df_tech["onet_soc_code"] = df_tech["onet_soc_code"].astype(str).str.strip()
        df_tech["base_soc"] = df_tech["onet_soc_code"].str.split(".").str[0]
        df_tech["example"] = df_tech["example"].astype(str).str.strip()
        df_tech = df_tech[(df_tech["onet_soc_code"] != "") & (df_tech["example"] != "")]

        # Keep frequent examples first so downstream retrieval has stronger signals.
        by_onet = (
            df_tech.groupby(["onet_soc_code", "example"], as_index=False)
            .size()
            .sort_values(["onet_soc_code", "size"], ascending=[True, False])
        )
        for code, group in by_onet.groupby("onet_soc_code"):
            tech_by_onet[code] = group["example"].head(25).tolist()

        by_base = (
            df_tech.groupby(["base_soc", "example"], as_index=False)
            .size()
            .sort_values(["base_soc", "size"], ascending=[True, False])
        )
        for code, group in by_base.groupby("base_soc"):
            tech_by_base[code] = group["example"].head(30).tolist()

        print(f"✅ Loaded tech examples for {len(tech_by_onet)} O*NET codes and {len(tech_by_base)} base SOC codes.")
    except Exception as e:
        print(f"⚠️ Warning: Technology skills index was not loaded: {e}")

    print("📁 STEP 6: GENERATING OPTIMIZED MAP FILES...")
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    grouped = final_df.groupby('SocCode')
    count = 0
    generated_map_socs = set() # Track which base files we successfully generate

    for soc, df_job in grouped:
        if len(df_job) < 50: 
            continue # Skip sparse data

        export_df = df_job[['fips', 'CountyTownName', 'StateAb', 'Level1', 'Level2', 'Level3', 'Level4']].copy()
        export_df = export_df.rename(columns={
            'CountyTownName': 'c',
            'StateAb': 's',
            'Level1': 'l1', 'Level2': 'l2', 'Level3': 'l3', 'Level4': 'l4'
        })
        # Some SOC/area rows duplicate the same county FIPS. Collapse them deterministically.
        export_df = (
            export_df.groupby('fips', as_index=False)
            .agg({
                'c': 'first',
                's': 'first',
                'l1': 'max',
                'l2': 'max',
                'l3': 'max',
                'l4': 'max',
            })
            .set_index('fips')
        )
        
        job_data = export_df.to_dict(orient='index')
        safe_soc = str(soc).replace("/", "-")
        
        with open(os.path.join(OUTPUT_DIR, f"{safe_soc}.json"), 'w') as f:
            json.dump(job_data, f)
            
        generated_map_socs.add(safe_soc)
        count += 1

    print(f"🎉 SUCCESS! Created {count} high-performance map shards.")

    print("🔍 STEP 7: EXPORTING SEARCH INDEX...")
    # INNER JOIN logic: Only keep O*NET detailed roles if we generated a map file for their Base SOC!
    search_dim = dim_soc[dim_soc['base_soc'].isin(generated_map_socs)]
    
    search_index = []
    for _, row in search_dim.iterrows():
        onet_code = row['onet_soc_code']
        base_soc = row['base_soc']
        tech_examples = tech_by_onet.get(onet_code, tech_by_base.get(base_soc, []))

        search_index.append({
            "code": onet_code,                # Displayed in UI (15-2051.01)
            "base_soc": base_soc,             # Hidden link to the map file (15-2051)
            "title": row['occupation_title'], # Displayed in UI (Business Intelligence Analyst)
            "description": row['description'],
            "tech_examples": tech_examples
        })
        
    with open(SOC_DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(search_index, f, ensure_ascii=False, indent=2)
        
    print(f"📚 Search index updated at {SOC_DATA_FILE} with {len(search_index)} detailed O*NET roles.")

if __name__ == "__main__":
    process_wage_data()
