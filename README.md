# 🚀 AI-Powered Deal Intelligence & Aggregation Pipeline

https://github.com/user-attachments/assets/32a03532-1171-41ab-bf82-9c92e104afc8

---

## 📌 Overview
An end-to-end, asynchronous ecosystem designed for data extraction, AI-driven data sanitization, and automated publishing of e-commerce/travel offers. This project successfully bypasses heavy anti-bot protections using native client-side injection and integrates a **Human-in-the-Loop (HITL)** validation panel powered by Generative AI.

## ⚙️ Core Architecture

### 1. Client-Side Web Scraper (Bypass Anti-Bot)
* **The Problem:** Traditional backend scrapers (Python/Requests) are instantly blocked by modern travel agencies' and airlines' anti-bot systems.
* **The Solution:** Custom JavaScript algorithms injected directly into the browser (Userscripts). They operate within the authenticated user session, scraping DOM elements in real-time.
* **Output:** Generates normalized `.csv` structures containing promotional prices, metadata, and hidden business rules, entirely immune to IP bans.

### 2. Human-in-the-Loop (HITL) Curation Panel
* **The Interface:** A decoupled local web application served via a Python HTTP server, designed to handle heavy data manipulation while bypassing local CORS restrictions.
* **Dynamic Visual Rendering:** The panel features a responsive CSS engine that auto-detects missing or low-res assets (e.g., tiny airline logos) and automatically injects high-resolution contextual fallbacks (via Unsplash). It renders 1:1 preview cards dynamically, mimicking the final production layout before API dispatch.
* **CMS Integration:** One-click deployment via REST API with JWT authentication, sending structured payloads directly to the target database/platform.

### 3. LLM Integration (Google Gemini API)
* **AI Copywriting:** The panel processes extracted data in batches, calling the Gemini API to rewrite offer titles, format persuasive copywriting, and translate contexts.
* **Strict Formatting:** The prompt engineering ensures the AI strictly adheres to character limits (max 80 chars) and business rules, eliminating manual rewriting hours.

### 4. Complex Data Normalization & Parsing
* **The Challenge:** Target platforms intentionally obfuscate DOM structures, meshing final prices, discounts, and legacy prices into single, unstructured text nodes. Multi-city flights completely lack standard tagging.
* **The Solution:** Implemented advanced Regex pattern matching and mathematical fallback algorithms within the JS parser to dynamically decouple and classify chaotic strings into normalized JSON architectures (`Old Price`, `New Price`, `Action Type`) in real-time.

---

## 🔄 The Workflow

1. **Extract:** The user clicks the floating Tampermonkey button on the target platform (e.g., OTA websites). The script extracts the data and downloads a clean `.csv`.
2. **Upload & Parse:** The `.csv` is uploaded to the Local Web App, generating visual review cards.
3. **AI Optimization:** With a single click, the Gemini LLM normalizes the data, translating and optimizing titles for maximum conversion.
4. **Publish:** The user validates the AI output (preventing LLM hallucinations) and clicks publish, dispatching the clean payload to the backend API.

---

## 🛠️ Tech Stack
* **Extraction:** `JavaScript (ES6+)`, `Tampermonkey`, `DOM Manipulation`
* **Local Server & API:** `Python 3`, `HTTP.server`, `RESTful APIs`
* **AI & NLP:** `Google Gemini LLM API`
* **Frontend Panel:** `HTML5`, `CSS3`, `Vanilla JS`
