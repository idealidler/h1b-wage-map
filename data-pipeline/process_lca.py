import pandas as pd
import glob
import os
import json
import re
import shutil

# --- CONFIGURATION ---
RAW_DATA_PATH = "raw_data/*.xlsx"
OUTPUT_DIR = "../site/public/db" 
REFERENCE_DATA_PATH = "reference_data/Occupation_Data.txt"

# --- COLUMN MAPPING ---
# Maps different column names the government might use across years to a standard name
TARGET_COLS = {
    'status': ['CASE_STATUS', 'STATUS'],
    'company': ['EMPLOYER_NAME', 'EMPLOYER_LEGAL_BUSINESS_NAME'],
    'title': ['JOB_TITLE'],
    'soc_code': ['SOC_CODE'],
    'soc_title': ['SOC_TITLE', 'SOC_NAME'] 
}

# ==========================================
# Phase 1: Dynamic Data Loaders
# ==========================================

def build_onet_map(filepath: str) -> dict:
    """
    Dynamically builds the ONET mapping dictionary from the official DOL dataset.
    """
    if not os.path.exists(filepath):
        print(f"⚠️ Warning: Reference file '{filepath}' not found.")
        print("   Proceeding without O*NET enhancements.")
        return {}
        
    try:
        # O*NET text files are tab-separated
        df = pd.read_csv(filepath, sep='\t')
        
        if 'O*NET-SOC Code' not in df.columns or 'Title' not in df.columns:
            print("⚠️ Warning: Invalid O*NET dataset columns. Proceeding without map.")
            return {}

        # Extract Base SOC Code (e.g., "15-1252.00" -> "15-1252")
        df['Base_SOC'] = df['O*NET-SOC Code'].astype(str).str.split('.').str[0]
        
        # Create formatted string ("15-1252.00: Software Developers")
        df['Formatted_Title'] = df['O*NET-SOC Code'] + ": " + df['Title']
        
        # Group by Base SOC into a dictionary of lists
        dynamic_map = df.groupby('Base_SOC')['Formatted_Title'].apply(list).to_dict()
        
        print(f"📚 Successfully loaded {len(dynamic_map)} base SOC codes from O*NET database.")
        return dynamic_map
        
    except Exception as e:
        print(f"❌ Error building O*NET map: {e}")
        return {}

# Build the map ONCE at module level
ONET_MAP = build_onet_map(REFERENCE_DATA_PATH)


# ==========================================
# Phase 2: Helper Functions
# ==========================================

def extract_year_from_filename(filename: str) -> int:
    """Extracts the FY year from the Excel filename."""
    match = re.search(r"FY(\d{4})", filename, re.IGNORECASE)
    return int(match.group(1)) if match else 0

def get_shard_key(company_name: str) -> str:
    """Returns a 2-character prefix for the database shard file."""
    if not pd.isna(company_name) and company_name:
        prefix = str(company_name)[:2].upper()
        if prefix.isalpha() and len(prefix) == 2:
            return prefix
        elif prefix[0].isalpha():
            return prefix[0] + "_"
    return "00"


# ==========================================
# Phase 3: Core Pipeline Logic
# ==========================================

def process_single_file(filepath: str) -> pd.DataFrame:
    """Reads, cleans, and aggregates a single Excel file to minimize memory footprint."""
    year = extract_year_from_filename(os.path.basename(filepath))
    
    # Read headers efficiently
    try:
        header_df = pd.read_excel(filepath, nrows=0)
    except Exception as e:
        print(f"   ❌ Failed to read {os.path.basename(filepath)}: {e}")
        return pd.DataFrame()
        
    clean_headers = [str(h).strip().upper() for h in header_df.columns]
    
    cols_to_use = []
    rename_map = {}
    
    for standard_name, possible_names in TARGET_COLS.items():
        for possible in possible_names:
            if possible in clean_headers:
                original_name = header_df.columns[clean_headers.index(possible)]
                cols_to_use.append(original_name)
                rename_map[original_name] = standard_name
                break
                
    if len(cols_to_use) != len(TARGET_COLS):
        print(f"   ⚠️ Skipping {os.path.basename(filepath)}: Missing required columns.")
        return pd.DataFrame()

    # Load only the mapped columns
    df = pd.read_excel(filepath, usecols=cols_to_use)
    df = df.rename(columns=rename_map)
    
    # Vectorized Cleaning (High Performance)
    df['status'] = df['status'].astype(str).str.upper().str.strip()
    df = df[df['status'] == 'CERTIFIED']
    
    if df.empty:
        return pd.DataFrame()

    df = df.dropna(subset=['company', 'title', 'soc_code'])
    
    # Fast regex string replacements
    df['company'] = df['company'].astype(str).str.upper().str.strip().str.replace(r'[.,]', '', regex=True)
    df['title'] = df['title'].astype(str).str.upper().str.strip().str.replace(r'[.,]', '', regex=True)
    df['soc_code'] = df['soc_code'].astype(str).str.replace(".00", "", regex=False)
    
    # Aggregate at the file level
    grouped = df.groupby(['company', 'title', 'soc_code', 'soc_title'], as_index=False).size()
    grouped.rename(columns={'size': 'count'}, inplace=True)
    grouped['year'] = year
    
    print(f"   📉 Extracted {len(grouped)} unique combinations.")
    return grouped


def process_files():
    """Main execution function that coordinates the ETL process."""
    if os.path.exists(OUTPUT_DIR):
        print(f"🧹 Cleaning old database at {OUTPUT_DIR}...")
        shutil.rmtree(OUTPUT_DIR)
    os.makedirs(OUTPUT_DIR)

    all_files = glob.glob(RAW_DATA_PATH)
    print(f"🏭 Found {len(all_files)} raw files.")
    
    # 1. Process files individually to save RAM
    processed_dfs = []
    for filepath in all_files:
        print(f"\n📄 Processing: {os.path.basename(filepath)}...")
        file_df = process_single_file(filepath)
        if not file_df.empty:
            processed_dfs.append(file_df)

    if not processed_dfs:
        print("❌ No data processed. Exiting.")
        return

    print("\n🔗 Combining and aggregating across all years (This may take a moment)...")
    
    # 2. Combine all file-level aggregates
    master_df = pd.concat(processed_dfs, ignore_index=True)
    
    # 3. Final aggregation across all years
    final_agg = master_df.groupby(['company', 'title', 'soc_code', 'soc_title']).agg(
        total_count=('count', 'sum'),
        years=('year', lambda x: sorted(list(set(x))))
    ).reset_index()

    print("\n🏁 Generating Shards...")
    shards = {}

    # 4. Build the sharded dictionary
    for row in final_agg.itertuples(index=False):
        onet_titles = ONET_MAP.get(row.soc_code, [])
        candidate = {
            "s": row.soc_code,
            "t": row.soc_title,
            "n": row.total_count,
            "y": row.years,
            "o": onet_titles
        }
        
        shard_key = get_shard_key(row.company)
        
        # Build nested dictionary safely
        shards.setdefault(shard_key, {}).setdefault(row.company, {}).setdefault(row.title, []).append(candidate)

    # 5. Filter for Top 3 candidates and export
    count = 0
    for shard_key, companies in shards.items():
        for company, titles in companies.items():
            for title, candidates in titles.items():
                # Sort by count descending
                candidates.sort(key=lambda x: x['n'], reverse=True)
                # Keep top 3 where count >= 3, or if it's the only option
                filtered = [c for c in candidates if c['n'] >= 3 or len(candidates) == 1][:3]
                companies[company][title] = filtered
                
            # Remove job titles that ended up empty after filtering
            companies[company] = {k: v for k, v in companies.items() if v}
            
        # Write to JSON
        with open(os.path.join(OUTPUT_DIR, f"{shard_key}.json"), 'w', encoding='utf-8') as f:
            json.dump(companies, f, ensure_ascii=False)
        count += 1
        
    print(f"\n✅ SUCCESS! Created {count} database shards in {OUTPUT_DIR}")


if __name__ == "__main__":
    process_files()