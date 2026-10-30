# ⚡ KisanTrace: 3D Fertilizer Traceability & DBT Subsidy Digital Twin

A specialized, full-featured supply chain traceability platform for agricultural fertilizers, recording the complete journey from **Manufacturer (IFFCO Phulpur)** to **Farmer Field Delivery** in an immutable digital twin.

---

## 🌟 Core System Capabilities

1. **3D Interactive Supply Chain Diorama:**
   - **Station 1: IFFCO Production Plant** (Chemical reactor, granulation tower, steam plumes).
   - **Station 2: Bulk Rail Freight Depot** (1200MT rake wagons with digital seals).
   - **Station 3: District Buffer Warehouse** (Multi-tier pallet racking & QC bag weighment).
   - **Station 4: PACS / POS Retailer Counter** (Point-of-sale scanner & Aadhaar e-KYC).
   - **Station 5: Farmer Field Delivery** (Aadhaar biometric authentication & instant ₹450 DBT subsidy release).

2. **Supply Chain Guardrails:**
   - **Thermal & Moisture Telemetry:** Real-time humidity and temperature tracking to prevent caking.
   - **Reverse-Flow Recall Trigger:** Simulates quality failure recall propagating back to the manufacturer.
   - **4-Level Packaging Serialization:**
     - 50 kg HDPE Bag QR
     - 1 MT Sling Bag Barcode
     - 1,200 MT Rail Rake EPC
     - Farmer Plot Allocation

3. **Database & 1-Click Excel Hub:**
   - **Turso Cloud (libSQL) / Local SQLite:** Real-time cryptographic ledger with zero data loss.
   - **Single-Click Excel (.xlsx) Generation:** Multi-sheet audit report with separated Latitude and Longitude columns for GIS mapping.

---

## 🚀 How to Run the Project

### Option A: Direct Offline Opening (No Setup Required)
Simply double-click `fertilizer_standalone.html` or `index.html` in any web browser (Chrome, Edge, Firefox, Safari). It runs 100% offline with zero server needed!

### Option B: Run with Node.js Server & Turso Cloud DB
```bash
# 1. Navigate to this folder
cd fertilizer-traceability

# 2. Start the local server
node server.js

# 3. Open in your browser
http://localhost:3001/
```

---

## 📁 Folder Structure

```
fertilizer-traceability/
├── index.html                  # Main Web Application Frontend
├── styles.css                  # UI Stylesheet & Glassmorphic Components
├── app.js                      # Three.js 3D Diorama & Supply Chain Physics
├── server.js                   # Node.js Express Server & API Gateway
├── turso_db.js                 # Database Connector (Turso Cloud / SQLite)
├── excel_export.js             # 1-Click Multi-Sheet Excel Spreadsheet Generator
├── schema.sql                  # Database Schema for Batches, Packaging & Subsidy
├── fertilizer_standalone.html  # 100% Standalone Single-File Bundle
├── package.json                # Project Dependencies & Scripts
└── README.md                   # System Documentation
```
