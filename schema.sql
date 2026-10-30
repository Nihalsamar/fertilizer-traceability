-- ============================================================================
-- KisanTrace 3D: Turso / libSQL Database Schema
-- Blockchain Traceable Supply Chain System for Fertilizers
-- ============================================================================

-- 1. Batches Table
CREATE TABLE IF NOT EXISTS batches (
    id TEXT PRIMARY KEY,
    batch_number TEXT UNIQUE NOT NULL,
    formulation TEXT NOT NULL DEFAULT 'Neem-Coated Urea (46.2% N)',
    nitrogen_pct REAL NOT NULL DEFAULT 46.2,
    moisture_pct REAL NOT NULL DEFAULT 0.42,
    biuret_pct REAL NOT NULL DEFAULT 1.15,
    quantity_bags INTEGER NOT NULL DEFAULT 1000,
    total_weight_mt REAL NOT NULL DEFAULT 50.0,
    manufacturer_name TEXT NOT NULL DEFAULT 'IFFCO Phulpur Unit',
    plant_gps TEXT NOT NULL DEFAULT '26.45°N 80.33°E',
    genesis_tx_hash TEXT NOT NULL,
    qc_cert_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Packaging Hierarchy Table (3-Level QR Serialization)
CREATE TABLE IF NOT EXISTS packaging_hierarchy (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    level TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    parent_code TEXT,
    merkle_root TEXT,
    rfid_epc TEXT,
    weight_kg REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(batch_id) REFERENCES batches(id)
);

-- 3. Telemetry Logs Table (IoT Edge Sensor Stream)
CREATE TABLE IF NOT EXISTS telemetry_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT NOT NULL,
    node_index INTEGER NOT NULL,
    node_name TEXT NOT NULL,
    gps_coordinates TEXT NOT NULL,
    temperature REAL NOT NULL,
    humidity REAL NOT NULL,
    is_breached INTEGER NOT NULL DEFAULT 0,
    status_note TEXT,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(batch_id) REFERENCES batches(id)
);

-- 4. Custody Chain Table (Multi-Hop Transfers)
CREATE TABLE IF NOT EXISTS custody_chain (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT NOT NULL,
    stage_number INTEGER NOT NULL,
    from_entity TEXT NOT NULL,
    to_entity TEXT NOT NULL,
    location_name TEXT NOT NULL,
    carrier_vehicle_id TEXT,
    tx_hash TEXT NOT NULL,
    nonce INTEGER NOT NULL DEFAULT 0,
    is_offline_signed INTEGER NOT NULL DEFAULT 0,
    verified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(batch_id) REFERENCES batches(id)
);

-- 5. DBT Disbursements Table (Farmer Verification & Subsidy)
CREATE TABLE IF NOT EXISTS dbt_disbursements (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    bag_code TEXT NOT NULL,
    farmer_name TEXT NOT NULL DEFAULT 'Ramesh Kumar Patel',
    farmer_aadhaar_hash TEXT NOT NULL,
    bank_account_last4 TEXT NOT NULL DEFAULT '4091',
    subsidy_amount REAL NOT NULL DEFAULT 1500.0,
    verification_channel TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'CREDITED',
    disbursed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(batch_id) REFERENCES batches(id)
);

-- 6. Reverse Flow Events Table (Quality / Thermal Breach Recalls)
CREATE TABLE IF NOT EXISTS reverse_flow_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT NOT NULL,
    trigger_node TEXT NOT NULL,
    reason TEXT NOT NULL,
    trigger_temperature REAL,
    trigger_humidity REAL,
    return_route TEXT NOT NULL DEFAULT 'Distributor -> Warehouse -> Factory',
    return_waybill TEXT NOT NULL,
    quarantined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(batch_id) REFERENCES batches(id)
);

-- 7. Click & User Interaction Events Table (Single Click Audit Trail)
CREATE TABLE IF NOT EXISTS click_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT NOT NULL DEFAULT 'batch-iffco-2026-x992',
    action_type TEXT NOT NULL,
    target_element TEXT NOT NULL,
    node_index INTEGER DEFAULT 0,
    node_name TEXT DEFAULT 'Facility',
    gps_coordinates TEXT DEFAULT '26.45°N 80.33°E',
    temperature REAL DEFAULT 28.5,
    humidity REAL DEFAULT 55.0,
    details TEXT,
    clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(batch_id) REFERENCES batches(id)
);

-- ============================================================================
-- Farm-to-Fork Traceability & Quality Certification Tables (AgriProduce)
-- ============================================================================

-- 8. Agricultural Produce Batches Table (Farm Origin & Organic Certification)
CREATE TABLE IF NOT EXISTS agri_produce_batches (
    id TEXT PRIMARY KEY,
    batch_number TEXT UNIQUE NOT NULL,
    produce_name TEXT NOT NULL DEFAULT 'Organic Alphonso Mango (GI Tagged)',
    variety TEXT NOT NULL DEFAULT 'Ratnagiri Hapus (GI Reg #124)',
    farm_name TEXT NOT NULL DEFAULT 'Shinde Organic Orchards, Ratnagiri',
    farmer_name TEXT NOT NULL DEFAULT 'Santosh Shinde',
    farmer_id TEXT NOT NULL DEFAULT 'FARMER-MH-RTG-8821',
    farmer_aadhaar_hash TEXT NOT NULL DEFAULT '0xzk_aadhaar_7f9914bca82',
    farm_gps TEXT NOT NULL DEFAULT '16.9944°N 73.3000°E',
    farm_altitude_m REAL NOT NULL DEFAULT 145.0,
    soil_health_index TEXT NOT NULL DEFAULT 'NPK: 240-45-310 kg/ha | pH: 6.4 | OC: 1.1%',
    organic_cert_number TEXT NOT NULL DEFAULT 'NPOP/NAB/0019/2026/8912',
    inputs_used TEXT NOT NULL DEFAULT 'Panchagavya, Cold-Pressed Neem Oil, Drip Solar Irrigation',
    harvest_date DATETIME NOT NULL DEFAULT '2026-10-28 06:30:00',
    total_crates INTEGER NOT NULL DEFAULT 120,
    total_weight_kg REAL NOT NULL DEFAULT 2400.0,
    fair_trade_premium_pct REAL NOT NULL DEFAULT 28.5,
    farmer_payout_per_kg REAL NOT NULL DEFAULT 165.0,
    genesis_tx_hash TEXT NOT NULL,
    quality_cert_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'EXPORT_CERTIFIED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. Computer Vision AI Quality Grading Logs Table
CREATE TABLE IF NOT EXISTS cv_quality_grading_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT NOT NULL,
    sample_item_code TEXT NOT NULL,
    produce_type TEXT NOT NULL DEFAULT 'Alphonso Mango',
    model_name TEXT NOT NULL DEFAULT 'AgriVision-YOLOv8-FruitGrading-v3',
    detection_confidence REAL NOT NULL DEFAULT 0.994,
    caliber_diameter_mm REAL NOT NULL DEFAULT 72.4,
    estimated_weight_g REAL NOT NULL DEFAULT 265.0,
    ripeness_color_pct REAL NOT NULL DEFAULT 88.2,
    sugar_brix_rating REAL NOT NULL DEFAULT 19.2,
    defect_count INTEGER NOT NULL DEFAULT 0,
    defect_type TEXT NOT NULL DEFAULT 'None / Zero Defects',
    defect_area_pct REAL NOT NULL DEFAULT 0.0,
    mrl_pesticide_ppm REAL NOT NULL DEFAULT 0.002,
    mrl_status TEXT NOT NULL DEFAULT 'PASSED_APEDA_EXPORT_STANDARD',
    assigned_grade TEXT NOT NULL DEFAULT 'GRADE_A_PLUS_EXPORT',
    quality_cert_hash TEXT NOT NULL,
    graded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. Cold-Chain IoT Telemetry Logs Table (Reefer Truck & Cold Storage)
CREATE TABLE IF NOT EXISTS coldchain_telemetry_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT NOT NULL,
    stage_node TEXT NOT NULL DEFAULT 'Reefer Truck In-Transit',
    vehicle_id TEXT NOT NULL DEFAULT 'MH-08-AG-9941',
    gps_coordinates TEXT NOT NULL DEFAULT '18.9220°N 72.8347°E',
    temperature_celsius REAL NOT NULL DEFAULT 12.8,
    relative_humidity_pct REAL NOT NULL DEFAULT 89.5,
    ethylene_level_ppm REAL NOT NULL DEFAULT 0.04,
    is_cold_chain_breached INTEGER NOT NULL DEFAULT 0,
    status_note TEXT DEFAULT 'Compliant: Cold-Chain Preserved',
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. Farm-to-Fork Custody Handovers Table
CREATE TABLE IF NOT EXISTS farm_custody_hops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT NOT NULL,
    hop_sequence INTEGER NOT NULL,
    from_stakeholder TEXT NOT NULL,
    to_stakeholder TEXT NOT NULL,
    location_name TEXT NOT NULL,
    custody_document TEXT NOT NULL,
    carrier_vehicle_id TEXT,
    tx_hash TEXT NOT NULL,
    is_offline_signed INTEGER NOT NULL DEFAULT 0,
    verified_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 12. Consumer & Buyer Fork Verification Logs Table
CREATE TABLE IF NOT EXISTS consumer_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT NOT NULL,
    scanned_qr_code TEXT NOT NULL,
    scan_channel TEXT NOT NULL DEFAULT 'Consumer Smartphone PWA',
    consumer_location TEXT NOT NULL DEFAULT 'Mumbai Retail Hypermarket',
    provenance_verified INTEGER NOT NULL DEFAULT 1,
    fair_trade_farmer_tip REAL NOT NULL DEFAULT 0.0,
    scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
