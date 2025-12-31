# H-1B Wage Map 2027 🇺🇸

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Status](https://img.shields.io/badge/Status-Live-green)

An interactive geospatial tool designed to help H-1B applicants navigate the new **FY 2027 Weighted Selection Rule**.

**[🔴 Screenshot]([https://your-project-name.vercel.app](https://h1b-wage-map.vercel.app))**

<img width="2880" height="1800" alt="image" src="https://github.com/user-attachments/assets/0e49c694-55f2-467c-900c-65150a77a682" />


## 🧐 The Problem
Starting March 2026 (FY 2027), the US Department of Homeland Security (DHS) is shifting the H-1B lottery from a random selection to a **Wage-Level Weighted Selection**.
* **Level 4 (Senior)** roles will have significantly higher odds (+107%).
* **Level 1 (Entry)** roles will have significantly lower odds (-48%).

Applicants currently have to manually dig through massive Department of Labor (DOL) spreadsheets to find wage requirements for their specific county.

## 💡 The Solution
This tool visualizes official DOL FLC wage data on an interactive US map. It allows users to:
1.  **Input their Salary & Job Title.**
2.  **Instant Visualization:** See a choropleth map of 3,000+ counties color-coded by "Safety Level" (Green = Safe, Red = Risky).
3.  **Check Odds:** Hover over any county to see the projected lottery selection probability.
4.  **AI Reverse Search:** Users can paste their job description, and our integrated **Gemini AI** determines the correct SOC Code.

## ✨ Features
* **Real-time Geospatial Rendering:** Built with `react-map-gl` (Mapbox) to render 3,200+ county shapes with high performance.
* **Client-Side Data Merging:** innovative "Pre-Paint" logic to merge massive JSON wage datasets with GeoJSON boundaries instantly on the client.
* **AI-Powered Classification:** Uses Google's **Llama 3** to analyze user resumes and map them to O*NET SOC Codes.
* **Compliance Logic:** Built-in alerts for the "Lowest Wage Rule" regarding hybrid/remote work.

## 🛠️ Tech Stack
* **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
* **Language:** TypeScript
* **Map Engine:** [Mapbox GL JS](https://www.mapbox.com/) via `react-map-gl`
* **Styling:** Tailwind CSS
* **AI:** Google Gemini API (Generative AI SDK)
* **Deployment:** Vercel

## 🚀 Getting Started

### Prerequisites
* Node.js 18+
* A Mapbox API Token (Free tier is sufficient)
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
    Create a `.env.local` file in the root directory:
    ```bash
    NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token_here
    GEMINI_API_KEY=your_google_ai_key_here
    ```

4.  **Run the development server**
    ```bash
    npm run dev
    ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## ⚖️ Legal Disclaimer
This tool is for **informational purposes only** and does not constitute legal advice.
* Data Source: US Department of Labor FLC Data Center (July 2025).
* Rule Source: DHS Docket No. USCIS-2025-0040.
* Calculations are projections based on proposed government rules.

## 👤 Author
**Akshay Jain**
* LinkedIn: [@akshayjain128](https://www.linkedin.com/in/akshayjain128/)
* GitHub: [@idealidler](https://github.com/idealidler)

---
*If you found this helpful, please give it a ⭐️!*
