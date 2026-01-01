import pandas as pd
import glob
import os
import json
import gc
import re

# --- CONFIGURATION ---
RAW_DATA_PATH = "raw_data/*.xlsx"
OUTPUT_FILE = "../site/public/company_soc_map.json"

# --- O*NET INTELLIGENCE MAP (The "Rosetta Stone") ---
# Maps Broad SOC Codes -> Specific O*NET Titles
# This is hardcoded for efficiency (covers 95% of H-1B roles)
ONET_MAP = {
    # COMPUTER & MATH
    "15-1252": ["15-1252.00: Software Developers"],
    "15-1253": ["15-1253.00: Software Quality Assurance Analysts and Testers"],
    "15-1299": ["15-1299.08: Computer Systems Engineers/Architects", "15-1299.09: IT Project Managers"],
    "15-1211": ["15-1211.00: Computer Systems Analysts"],
    "15-1212": ["15-1212.00: Information Security Analysts"],
    "15-1231": ["15-1231.00: Computer Network Support Specialists"],
    "15-1241": ["15-1241.00: Computer Network Architects"],
    "15-1242": ["15-1242.00: Database Administrators"],
    "15-1243": ["15-1243.00: Database Architects"],
    "15-2051": ["15-2051.01: Business Intelligence Analysts", "15-2051.02: Clinical Data Managers", "15-2051.00: Data Scientists"],
    "15-2031": ["15-2031.00: Operations Research Analysts"],
    "15-2041": ["15-2041.00: Statisticians"],
    "15-2011": ["15-2011.00: Actuaries"],
    
    # ENGINEERING
    "17-2071": ["17-2071.00: Electrical Engineers"],
    "17-2072": ["17-2072.00: Electronics Engineers, Except Computer"],
    "17-2141": ["17-2141.00: Mechanical Engineers"],
    "17-2061": ["17-2061.00: Computer Hardware Engineers"],
    "17-2051": ["17-2051.00: Civil Engineers"],
    "17-2112": ["17-2112.00: Industrial Engineers"],
    
    # BUSINESS & FINANCE
    "13-1111": ["13-1111.00: Management Analysts"],
    "13-2011": ["13-2011.00: Accountants and Auditors"],
    "13-2051": ["13-2051.00: Financial Analysts"],
    "13-1161": ["13-1161.00: Market Research Analysts and Marketing Specialists"],
    "13-1081": ["13-1081.01: Logistics Engineers", "13-1081.02: Logistics Analysts"],
    "11-3021": ["11-3021.00: Computer and Information Systems Managers"],
    "11-2021": ["11-2021.00: Marketing Managers"],
    
    # SCIENCE
    "19-1029": ["19-1029.01: Bioinformatics Scientists"],
    "19-1042": ["19-1042.00: Medical Scientists, Except Epidemiologists"]
}

# --- COLUMN MAPPING ---
TARGET_COLS = {
    'status': ['CASE_STATUS', 'STATUS'],
    'company': ['EMPLOYER_NAME', 'EMPLOYER_LEGAL_BUSINESS_NAME'],
    'title': ['JOB_TITLE'],
    'soc_code': ['SOC_CODE'],
    'soc_title': ['SOC_TITLE', 'SOC_NAME'] 
}

def clean_text(text):
    if not isinstance(text, str):
        return ""
    # Standardize to uppercase, remove dots/commas
    return text.upper().strip().replace(".", "").replace(",", "")

def extract_year_from_filename(filename):
    """Extracts year (e.g., 2023) from filename"""
    match = re.search(r"FY(\d{4})", filename, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return 0

def get_columns_to_load(header_row):
    """Smart column detection"""
    clean_headers = [h.strip().upper() for h in header_row]
    cols_to_use = []
    rename_map = {}
    
    for standard_name, possible_names in TARGET_COLS.items():
        found = False
        for possible in possible_names:
            possible_clean = possible.strip().upper()
            if possible_clean in clean_headers:
                idx = clean_headers.index(possible_clean)
                original_name = header_row[idx]
                cols_to_use.append(original_name)
                rename_map[original_name] = standard_name
                found = True
                break
        if not found:
            return None, None
            
    return cols_to_use, rename_map

def process_files():
    all_files = glob.glob(RAW_DATA_PATH)
    print(f"🏭 Found {len(all_files)} raw files.")
    
    master_counts = {}

    for filename in all_files:
        print(f"\n📄 Reading: {os.path.basename(filename)}...")
        year = extract_year_from_filename(os.path.basename(filename))
        
        try:
            # 1. Read Headers
            header_df = pd.read_excel(filename, nrows=0)
            headers = list(header_df.columns)
            cols_to_use, rename_map = get_columns_to_load(headers)
            
            if not cols_to_use:
                print("   ❌ Missing headers, skipping.")
                continue
                
            # 2. Load Data (RAM Safe)
            df = pd.read_excel(filename, usecols=cols_to_use)
            df = df.rename(columns=rename_map)
            
            # 3. Filter Certified
            df['status'] = df['status'].astype(str).str.upper().str.strip()
            df = df[df['status'] == 'CERTIFIED']
            
            if len(df) == 0: continue

            # 4. Clean & Normalize
            df = df.dropna(subset=['company', 'title', 'soc_code'])
            df['company'] = df['company'].apply(clean_text)
            df['title'] = df['title'].apply(clean_text)
            
            # Normalize SOC Codes: "15-1252.00" -> "15-1252"
            df['soc_code'] = df['soc_code'].astype(str).str.replace(".00", "", regex=False)

            # 5. Aggregate
            grouped = df.groupby(['company', 'title', 'soc_code', 'soc_title']).size().reset_index(name='count')
            print(f"   📉 Found {len(grouped)} unique patterns.")

            # 6. Merge into Master Dictionary
            for _, row in grouped.iterrows():
                key = (row['company'], row['title'])
                soc_key = str(row['soc_code'])
                
                if key not in master_counts:
                    master_counts[key] = {}
                
                if soc_key not in master_counts[key]:
                    master_counts[key][soc_key] = {
                        'name': str(row['soc_title']),
                        'count': 0,
                        'years': set()
                    }
                
                master_counts[key][soc_key]['count'] += int(row['count'])
                master_counts[key][soc_key]['years'].add(year)
            
            del df
            del grouped
            gc.collect()

        except Exception as e:
            print(f"   ❌ Error: {e}")

    print("\n🏁 Finalizing & Injecting O*NET Data...")
    
    final_output = {}
    
    for (company, title), soc_candidates in master_counts.items():
        
        candidate_list = []
        for code, data in soc_candidates.items():
            
            # --- INTELLIGENCE INJECTION ---
            # We check our O*NET map. If the code exists, we grab the detailed titles.
            onet_titles = ONET_MAP.get(code, [])
            # ------------------------------

            candidate_list.append({
                "s": code,
                "t": data['name'],
                "n": data['count'],
                "y": sorted(list(data['years'])),
                "o": onet_titles # Pass the O*NET data to frontend
            })
        
        # Sort by popularity
        candidate_list.sort(key=lambda x: x['n'], reverse=True)
        
        # Keep Top 3
        filtered = [c for c in candidate_list if c['n'] >= 3 or len(candidate_list) == 1][:3]

        if not filtered: continue
            
        if company not in final_output:
            final_output[company] = {}
            
        final_output[company][title] = filtered

    print(f"💾 Saving to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(final_output, f)
        
    print("✅ Done! You now have a map with O*NET Intelligence.")

if __name__ == "__main__":
    process_files()