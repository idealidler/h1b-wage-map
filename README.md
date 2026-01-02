# H-1B Wage Map & Intelligence Tool (FY 2027) 🇺🇸

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Status](https://img.shields.io/badge/Status-Production-green)

An interactive geospatial intelligence tool designed to help H-1B applicants navigate the new **FY 2027 Weighted Selection Rule**. It combines official Department of Labor (DOL) wage data with a massive database of historical company filings.

**[🔴 Live Demo](https://h1b-wage-map.vercel.app)**

<img width="2880" height="1800" alt="App Screenshot" src="https://github.com/user-attachments/assets/0e49c694-55f2-467c-900c-65150a77a682" />

## 🧐 The Context (FY 2027 Rule Change)
Starting March 2026, the US Department of Homeland Security (DHS) is shifting the H-1B lottery from a random selection to a **Wage-Level Weighted Selection**.
* **Level 4 (Senior)** roles will have significantly higher odds (+107%).
* **Level 1 (Entry)** roles will have significantly lower odds (-48%).

Applicants currently have to blindly guess which job titles or locations yield the best odds. This tool solves that opacity.

## ✨ Key Features

### 1. 🗺️ Interactive Wage Map
* **Real-time Odds Calculation:** Visualizes "Safety Levels" (Green/Safe vs. Red/Risky) across 3,200+ US counties.
* **Smart Zoom:** Instantly drill down from State to County level.
* **Hybrid/Remote Logic:** Built-in compliance alerts for "Lowest Wage Rule" scenarios.

### 2. 🏢 Employer Filing Database (LCA Search)
* **Historical Data:** Search 200,000+ past H-1B filings (FY 2022–2025) to see exactly what SOC codes companies like Google, Amazon, or Tesla actually use.
* **O*NET Mapping:** Automatically links internal job titles (e.g., "BI Analyst") to official government SOC codes (e.g., "Data Scientist").

### 3. 🤖 AI SOC Matcher (RAG)
* **Resume Analysis:** Uses **Google Gemini / Llama 3** to analyze user job descriptions.
* **Reverse Mapping:** Matches natural language descriptions to the closest official O*NET Occupation Code using Retrieval-Augmented Generation (RAG).

---

## 🏗️ Technical Architecture

This project uses a high-performance **Serverless & Static** architecture to handle massive datasets without a backend database.

### ⚡ Performance Optimization: Static Sharding
Instead of querying a slow SQL database, the 200,000+ record LCA dataset is pre-processed into static JSON shards.
* **Process:** Python ETL pipeline (`process_lca.py`) splits the data into tiny chunks based on company prefixes (e.g., `db/GO.json` for Google).
* **Result:** **O(1) lookup time**. When a user types "Go", the app fetches only the relevant ~150KB shard, ensuring instant search results on mobile/edge networks.

### 🗺️ Client-Side Geospatial Merging
To render 3,000+ counties instantly:
* **Pre-Computation:** Wage data is pre-calculated per SOC code during build time.
* **Runtime:** The app fetches lightweight GeoJSON vector tiles and "paints" the wage data onto the map layer directly in the browser using `mapbox-gl`, avoiding heavy server-side rendering.

### 🛠️ Tech Stack
* **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
* **Maps:** Mapbox GL JS (`react-map-gl`), Turf.js (Geospatial analysis)
* **Data Pipeline:** Python (Pandas) for ETL, Static JSON Sharding
* **AI:** Google Generative AI SDK (Gemini)
* **Infrastructure:** Vercel (Edge Network)

---

## 🚀 Getting Started

### Prerequisites
* Node.js 18+
* Mapbox API Token (Free tier)
* Google Gemini API Key

### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/idealidler/h1b-wage-map.git](https://github.com/idealidler/h1b-wage-map.git)
    cd h1b-wage-map
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables**
    Create a `.env.local` file:
    ```bash
    NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token_here
    GEMINI_API_KEY=your_google_ai_key_here
    ```

4.  **Run the Data Pipeline (Optional)**
    If you want to re-process the raw DOL data:
    ```bash
    cd data-pipeline
    python3 clean_data.py  # Generates Wage Map JSONs
    python3 process_lca.py # Generates Company DB Shards
    ```

5.  **Run the App**
    ```bash
    npm run dev
    ```

## ⚖️ Data Sources & Disclaimer

**This tool is for informational purposes only and does not constitute legal advice.**

* **Wage Data:** Official US Department of Labor (DOL) FLC Data Center.
    * *Current Dataset:* **July 2025 – June 2026** (Active Cycle).
* **LCA Data:** OFLC Historical Disclosure Data (FY 2022 – 2025).
* **Data Updates:**
    * Wage Levels: Updated Annually (July).
    * Company Filings: Updated Quarterly.

## 👤 Author

**Akshay Jain**
* LinkedIn: [@akshayjain128](https://www.linkedin.com/in/akshayjain128/)
* GitHub: [@idealidler](https://github.com/idealidler)

---
*Built with ☕️ and 💻 to support the immigrant community.*