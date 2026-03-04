import pandas as pd
import json
import os

# Point directly to your new official reference file
EXCEL_PATH = "reference_data/Occupation_Data.xlsx"
# Single source of truth for runtime + API
JSON_PATH = "../site/public/soc_data.json"

def convert():
    print(f"🔄 Reading Official O*NET Data from {EXCEL_PATH}...")
    if not os.path.exists(EXCEL_PATH):
        print(f"❌ Error: Could not find {EXCEL_PATH}")
        print("   Make sure the file is in data-pipeline/reference_data/")
        return

    try:
        # Read the Excel file
        df = pd.read_excel(EXCEL_PATH)
        
        # The official O*NET columns are typically named like this:
        code_col = 'O*NET-SOC Code'
        title_col = 'Title'
        desc_col = 'Description'

        # Ensure the columns exist
        if not all(col in df.columns for col in [code_col, title_col, desc_col]):
            print(f"❌ Error: Missing required columns in Excel file.")
            print(f"   Expected: {code_col}, {title_col}, {desc_col}")
            print(f"   Found: {list(df.columns)}")
            return

        # Filter out rows missing a description or code
        valid_data = df.dropna(subset=[code_col, desc_col])
        
        json_data = []
        for _, row in valid_data.iterrows():
            json_data.append({
                # We strip the .00 if you want it to match the base SOC codes exactly
                "code": str(row[code_col]).replace(".00", ""), 
                "title": str(row[title_col]),
                "description": str(row[desc_col])
            })

        # Save to JSON
        with open(JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, ensure_ascii=False, indent=2)
            
        print(f"✅ Successfully converted {len(json_data)} official SOC codes to JSON.")
        print(f"📁 Saved to: {JSON_PATH}")
        
    except Exception as e:
        print(f"❌ Error processing Excel file: {e}")

if __name__ == "__main__":
    convert()
