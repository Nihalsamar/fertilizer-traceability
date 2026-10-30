/**
 * ============================================================================
 * Turso Database Client & Service Layer
 * Supports both Turso Cloud (libsql://...) and local libSQL/SQLite (file:...)
 * ============================================================================
 */

const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

// Auto-load .env file if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  try {
    const envText = fs.readFileSync(envPath, 'utf8');
    envText.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || '').trim();
        val = val.replace(/^['"](.*)['"]$/, '$1');
        process.env[key] = val;
      }
    });
  } catch (e) {
    console.warn('[Turso DB] Could not read .env file:', e.message);
  }
}

const DEFAULT_TURSO_URL = 'libsql://kisantrace-nihalsamar.aws-ap-south-1.turso.io';
const DEFAULT_TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE1MzQwODYsImlkIjoiMDFhMTFmYWYtYWQwMS03MTg5LWI0ZGYtNTE4NWVjMTNmZGRjIiwia2lkIjoia2xYWG0wMlBIWV9JTDd0ZHEzU3dEVHRHdUFhTWdfMlUzc3J3c29tUEdKYyIsInJpZCI6IjRhNmM3NjljLWNmMjMtNGE2NC1hYWNlLWZhN2E2YjY4MTZkZSJ9.b2bl_Ls1znkV8MvjDGmiYYN9O4nE2XygVjgxZDHIDuyQAiY1mEnJRsb7Qf2zcKaZozfFFs7onnyj6SfJqVsECw';

let url = process.env.TURSO_DATABASE_URL || DEFAULT_TURSO_URL;
let authToken = process.env.TURSO_AUTH_TOKEN || DEFAULT_TURSO_TOKEN;
let isCloud = url.startsWith('libsql://') || url.startsWith('https://');

let client = createClient({
  url,
  authToken
});

console.log(`[Turso DB] Initialized client connected to: ${isCloud ? 'Turso Cloud (' + url + ')' : 'Local libSQL file (' + url + ')'}`);

function updateClientConfig(newUrl, newAuthToken) {
  if (!newUrl) throw new Error('Database URL is required');
  url = newUrl.trim();
  authToken = newAuthToken ? newAuthToken.trim() : undefined;
  isCloud = url.startsWith('libsql://') || url.startsWith('https://');

  client = createClient({
    url,
    authToken
  });

  // Persist to .env
  const adminKey = process.env.ADMIN_KEY || 'kisantrace-admin-2026';
  const envContent = `TURSO_DATABASE_URL=${url}\nTURSO_AUTH_TOKEN=${authToken || ''}\nADMIN_KEY=${adminKey}\n`;
  try {
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('[Turso DB] Saved new credentials to .env');
  } catch (e) {
    console.warn('[Turso DB] Could not write .env:', e.message);
  }

  invalidateCache();

  console.log(`[Turso DB] Reconfigured client to: ${isCloud ? 'Turso Cloud (' + url + ')' : 'Local libSQL file (' + url + ')'}`);
  return { isCloud, url: maskUrl(url) };
}

function maskUrl(u) {
  if (!u) return '';
  if (!u.startsWith('libsql://') && !u.startsWith('https://')) return u;
  const parts = u.split('@');
  return parts.length > 1 ? 'libsql://***@' + parts[1] : u;
}

async function initDb() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Split schema into individual executable statements
  const statements = schemaSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    try {
      await client.execute(statement);
    } catch (err) {
      console.error('[Turso DB] Error executing schema statement:', err.message);
      throw err;
    }
  }
  console.log('[Turso DB] All schema tables verified successfully.');
}

async function seedDb(force = false) {
  await initDb();

  const batchId = 'batch-iffco-2026-x992';
  let needFertilizerSeed = force;

  if (!force) {
    const existing = await client.execute({
      sql: 'SELECT id FROM batches WHERE id = ?',
      args: [batchId]
    });

    if (existing.rows.length === 0) {
      needFertilizerSeed = true;
    } else {
      console.log('[Turso DB] Fertilizer seed batch already exists.');
    }
  } else {
    // If force, clean up existing sample records first
    try {
      await client.execute({ sql: 'DELETE FROM reverse_flow_events WHERE batch_id = ?', args: [batchId] });
      await client.execute({ sql: 'DELETE FROM dbt_disbursements WHERE batch_id = ?', args: [batchId] });
      await client.execute({ sql: 'DELETE FROM custody_chain WHERE batch_id = ?', args: [batchId] });
      await client.execute({ sql: 'DELETE FROM telemetry_logs WHERE batch_id = ?', args: [batchId] });
      await client.execute({ sql: 'DELETE FROM packaging_hierarchy WHERE batch_id = ?', args: [batchId] });
      await client.execute({ sql: 'DELETE FROM batches WHERE id = ?', args: [batchId] });
    } catch (e) {}
  }

  if (needFertilizerSeed) {
    // Insert Batch
    await client.execute({
      sql: `INSERT INTO batches (
        id, batch_number, formulation, nitrogen_pct, moisture_pct, biuret_pct,
        quantity_bags, total_weight_mt, manufacturer_name, plant_gps,
        genesis_tx_hash, qc_cert_hash, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        batchId,
        'LOT-2026-X992',
        'Neem-Coated Urea (46.2% N)',
        46.2,
        0.42,
        1.15,
        1000,
        50.0,
        'IFFCO Phulpur Production Unit',
        '26.45°N 80.33°E',
        '0x8a9f3b14e92a83c7104b901fc88a10427e1892b189a7401c9018e7492a83c710',
        '0xqc462pass99014aef72c81093bc71a0912f8471c90081e7492a83c7104b901fc8',
        'ACTIVE'
      ]
    });

    // Packaging Hierarchy
    const packagingLevels = [
      {
        id: 'pack-bag-01',
        level: 'BAG',
        code: 'BAG-2026-X992-0001',
        parent_code: 'PALLET-2026-X992-01',
        merkle_root: '0x3a91e47f01c9a8b72c9182d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3',
        rfid_epc: null,
        weight_kg: 50.0
      },
      {
        id: 'pack-pallet-01',
        level: 'PALLET',
        code: 'PALLET-2026-X992-01',
        parent_code: 'CONTAINER-2026-X992',
        merkle_root: '0x7b14e92a83c7104b901fc88a10427e1892b189a7401c9018e7492a83c710e47f',
        rfid_epc: 'EPC96-3008-0001-A992',
        weight_kg: 2500.0
      },
      {
        id: 'pack-container-01',
        level: 'MASTER_CONTAINER',
        code: 'CONTAINER-2026-X992',
        parent_code: null,
        merkle_root: '0x99014aef72c81093bc71a0912f8471c90081e7492a83c7104b901fc88a9f3b14',
        rfid_epc: 'EPC96-3008-CONT-992',
        weight_kg: 50000.0
      }
    ];

    for (const p of packagingLevels) {
      await client.execute({
        sql: `INSERT INTO packaging_hierarchy (id, batch_id, level, code, parent_code, merkle_root, rfid_epc, weight_kg)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [p.id, batchId, p.level, p.code, p.parent_code, p.merkle_root, p.rfid_epc, p.weight_kg]
      });
    }

    // Telemetry stream
    const telemetries = [
      { node_index: 0, node_name: 'Manufacturer Plant', gps: '26.45°N 80.33°E', temp: 28.4, hum: 52.0, note: 'Batch generated & sealed' },
      { node_index: 1, node_name: 'Quality Lab', gps: '26.85°N 80.95°E', temp: 27.2, hum: 49.0, note: '46.2% N purity certified' },
      { node_index: 2, node_name: 'Central Warehouse', gps: '26.80°N 81.02°E', temp: 28.1, hum: 54.0, note: 'RFID inward gate logged' },
      { node_index: 6, node_name: 'IoT Transporter (Truck)', gps: '26.30°N 81.80°E', temp: 29.5, hum: 56.0, note: 'Live highway transit NH-19' },
      { node_index: 3, node_name: 'District Distributor', gps: '25.75°N 82.68°E', temp: 28.8, hum: 55.0, note: 'Pallet custody verified' },
      { node_index: 4, node_name: 'Retailer POS (Kisan Kendra)', gps: '25.45°N 82.80°E', temp: 29.1, hum: 57.0, note: 'Offline transaction signed' },
      { node_index: 5, node_name: 'Indian Farmer Farmstead', gps: '25.40°N 82.85°E', temp: 28.5, hum: 55.0, note: 'Aadhaar verified & DBT credited' }
    ];

    for (const t of telemetries) {
      await client.execute({
        sql: `INSERT INTO telemetry_logs (batch_id, node_index, node_name, gps_coordinates, temperature, humidity, is_breached, status_note)
              VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
        args: [batchId, t.node_index, t.node_name, t.gps, t.temp, t.hum, t.note]
      });
    }

    // Custody steps
    const custodySteps = [
      { stage: 1, from: 'IFFCO Synthesis', to: 'QC Quality Control', loc: 'Phulpur Plant', veh: null, tx: '0x101a...991a', offline: 0 },
      { stage: 2, from: 'QC Lab', to: 'Central Warehouse', loc: 'Lucknow Hub', veh: 'UP-32-BT-9014', tx: '0x202b...882b', offline: 0 },
      { stage: 3, from: 'Central Warehouse', to: 'District Distributor', loc: 'Varanasi Central', veh: 'UP-65-AR-4011', tx: '0x303c...773c', offline: 0 },
      { stage: 4, from: 'District Distributor', to: 'Kisan Seva Kendra', loc: 'Chiraigaon Rural', veh: 'UP-65-T-1288', tx: '0x404d...664d', offline: 1 }
    ];

    for (const c of custodySteps) {
      await client.execute({
        sql: `INSERT INTO custody_chain (batch_id, stage_number, from_entity, to_entity, location_name, carrier_vehicle_id, tx_hash, nonce, is_offline_signed)
              VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        args: [batchId, c.stage, c.from, c.to, c.loc, c.veh, c.tx, c.offline]
      });
    }

    // DBT Disbursement
    await client.execute({
      sql: `INSERT INTO dbt_disbursements (id, batch_id, bag_code, farmer_name, farmer_aadhaar_hash, bank_account_last4, subsidy_amount, verification_channel, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        'dbt-tx-88912',
        batchId,
        'BAG-2026-X992-0001',
        'Ramesh Kumar Patel',
        '0xaadhaar7f201948bc819e01f2984c90',
        '4091',
        1500.0,
        'SMARTPHONE_QR',
        'CREDITED'
      ]
    });

    console.log('[Turso DB] Seed data populated successfully for batch LOT-2026-X992.');
  }

  // --------------------------------------------------------------------------
  // Seed Farm-to-Fork Agricultural Produce Batch (Organic Alphonso Mangoes)
  // --------------------------------------------------------------------------
  const agriBatchId = 'BATCH-AGRI-2026-F2F-091';
  try {
    const existingAgri = await client.execute({
      sql: 'SELECT id FROM agri_produce_batches WHERE id = ?',
      args: [agriBatchId]
    });

    if (force || existingAgri.rows.length === 0) {
      if (force) {
        try {
          await client.execute({ sql: 'DELETE FROM consumer_verifications WHERE batch_id = ?', args: [agriBatchId] });
          await client.execute({ sql: 'DELETE FROM farm_custody_hops WHERE batch_id = ?', args: [agriBatchId] });
          await client.execute({ sql: 'DELETE FROM coldchain_telemetry_logs WHERE batch_id = ?', args: [agriBatchId] });
          await client.execute({ sql: 'DELETE FROM cv_quality_grading_logs WHERE batch_id = ?', args: [agriBatchId] });
          await client.execute({ sql: 'DELETE FROM agri_produce_batches WHERE id = ?', args: [agriBatchId] });
        } catch (e) {}
      }

      await client.execute({
        sql: `INSERT INTO agri_produce_batches (
          id, batch_number, produce_name, variety, farm_name, farmer_name, farmer_id,
          farmer_aadhaar_hash, farm_gps, farm_altitude_m, soil_health_index, organic_cert_number,
          inputs_used, harvest_date, total_crates, total_weight_kg, fair_trade_premium_pct,
          farmer_payout_per_kg, genesis_tx_hash, quality_cert_hash, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          agriBatchId,
          'LOT-2026-F2F-091',
          'Organic Alphonso Mango (GI Tagged)',
          'Ratnagiri Hapus (GI Reg #124)',
          'Shinde Organic Orchards, Ratnagiri',
          'Santosh Shinde',
          'FARMER-MH-RTG-8821',
          '0xzk_aadhaar_7f9914bca82e01',
          '16.9944°N 73.3000°E',
          145.0,
          'NPK: 240-45-310 kg/ha | pH: 6.4 | OC: 1.1%',
          'NPOP/NAB/0019/2026/8912',
          'Panchagavya, Cold-Pressed Neem Oil, Drip Solar Irrigation',
          '2026-10-28 06:30:00',
          120,
          2400.0,
          28.5,
          165.0,
          '0x7f14a89bc0192e48dc7104b901fc88a10427e1892b189a7401c9018e7492a83c',
          '0xqc994pass_alphonso_export_grade_a_plus_apeda_certified',
          'EXPORT_CERTIFIED'
        ]
      });

      const cvGradingRecords = [
        { code: 'FRUIT-ALPH-091-0001', type: 'Alphonso Mango', conf: 0.994, caliber: 72.4, weight: 265.0, color: 88.2, brix: 19.2, defectCount: 0, defectType: 'None / Zero Defects', defectArea: 0.0, mrlPpm: 0.002, grade: 'GRADE_A_PLUS_EXPORT', certHash: '0xqc994pass_grade_a_plus_0001' },
        { code: 'FRUIT-ALPH-091-0002', type: 'Alphonso Mango', conf: 0.988, caliber: 74.1, weight: 278.0, color: 91.5, brix: 19.8, defectCount: 0, defectType: 'None / Zero Defects', defectArea: 0.0, mrlPpm: 0.001, grade: 'GRADE_A_PLUS_EXPORT', certHash: '0xqc994pass_grade_a_plus_0002' },
        { code: 'FRUIT-ALPH-091-0003', type: 'Alphonso Mango', conf: 0.976, caliber: 68.2, weight: 242.0, color: 82.0, brix: 18.1, defectCount: 1, defectType: 'Minor surface scratch (non-punctured)', defectArea: 0.4, mrlPpm: 0.003, grade: 'GRADE_A_DOMESTIC', certHash: '0xqc994pass_grade_a_domestic_0003' }
      ];

      for (const r of cvGradingRecords) {
        await client.execute({
          sql: `INSERT INTO cv_quality_grading_logs (
            batch_id, sample_item_code, produce_type, model_name, detection_confidence,
            caliber_diameter_mm, estimated_weight_g, ripeness_color_pct, sugar_brix_rating,
            defect_count, defect_type, defect_area_pct, mrl_pesticide_ppm, mrl_status,
            assigned_grade, quality_cert_hash
          ) VALUES (?, ?, ?, 'AgriVision-YOLOv8-FruitGrading-v3', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PASSED_APEDA_EXPORT_STANDARD', ?, ?)`,
          args: [
            agriBatchId, r.code, r.type, r.conf, r.caliber, r.weight, r.color, r.brix,
            r.defectCount, r.defectType, r.defectArea, r.mrlPpm, r.grade, r.certHash
          ]
        });
      }

      const coldChainRecords = [
        { node: 'Packhouse Pre-Cooling Chamber', veh: 'CHAMBER-02', gps: '16.9944°N 73.3000°E', temp: 12.4, hum: 91.0, eth: 0.02, breached: 0, note: 'Pre-cooling optimal: 12.4°C / 91% RH' },
        { node: 'Cold Storage Holding Staging', veh: 'STAGING-A1', gps: '17.3100°N 73.5500°E', temp: 12.8, hum: 89.5, eth: 0.03, breached: 0, note: 'Cold storage optimal: 12.8°C / 89.5% RH' },
        { node: 'Reefer Truck In-Transit (NH-48)', veh: 'MH-08-AG-9941', gps: '18.5204°N 73.8567°E', temp: 13.1, hum: 88.0, eth: 0.04, breached: 0, note: 'In transit to export terminal: cold chain intact' },
        { node: 'Cargo Port Cold Warehouse', veh: 'PORT-GATE-04', gps: '18.9220°N 72.8347°E', temp: 12.9, hum: 90.0, eth: 0.03, breached: 0, note: 'Port terminal arrival verified: all cold parameters preserved' }
      ];

      for (const cc of coldChainRecords) {
        await client.execute({
          sql: `INSERT INTO coldchain_telemetry_logs (
            batch_id, stage_node, vehicle_id, gps_coordinates, temperature_celsius,
            relative_humidity_pct, ethylene_level_ppm, is_cold_chain_breached, status_note
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [agriBatchId, cc.node, cc.veh, cc.gps, cc.temp, cc.hum, cc.eth, cc.breached, cc.note]
        });
      }

      const custodyHops = [
        { seq: 1, from: 'Santosh Shinde (Farmer)', to: 'Sahyadri FPO Mandi Hub', loc: 'Ratnagiri APMC Yard', doc: 'e-NWR Electronic Warehouse Receipt #99104', veh: 'Farm Mini-Truck MH-08-B-4411', tx: '0x101a99f1...881a', off: 1 },
        { seq: 2, from: 'Sahyadri FPO Mandi Hub', to: 'Vashi Agro Packhouse & AI Lab', loc: 'Vashi Post-Harvest Terminal', doc: 'AgriConsignment Gate Pass #VSH-882', veh: 'MH-08-AG-9941 (Reefer)', tx: '0x202b88e2...772b', off: 0 },
        { seq: 3, from: 'Vashi Agro Packhouse', to: 'Cold Logistics Transporter', loc: 'NH-48 Transit Corridor', doc: 'Reefer Bilateral IoT Custody Waybill #RET-901', veh: 'MH-08-AG-9941 (Reefer)', tx: '0x303c77d3...663c', off: 0 },
        { seq: 4, from: 'Cold Logistics Transporter', to: 'Nature Basket Gourmet Hypermarket', loc: 'Mumbai Flagship Retail Hub', doc: 'Retail Inward Stock Audit Cert #NB-MUM-449', veh: 'Internal Unloader', tx: '0x404d66c4...554d', off: 1 }
      ];

      for (const h of custodyHops) {
        await client.execute({
          sql: `INSERT INTO farm_custody_hops (
            batch_id, hop_sequence, from_stakeholder, to_stakeholder, location_name,
            custody_document, carrier_vehicle_id, tx_hash, is_offline_signed
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [agriBatchId, h.seq, h.from, h.to, h.loc, h.doc, h.veh, h.tx, h.off]
        });
      }

      await client.execute({
        sql: `INSERT INTO consumer_verifications (
          batch_id, scanned_qr_code, scan_channel, consumer_location, provenance_verified, fair_trade_farmer_tip
        ) VALUES (?, ?, 'Consumer Smartphone PWA', 'Nature Basket Retail Store, Bandra, Mumbai', 1, 50.0)`,
        args: [agriBatchId, 'GS1-DL-8901030-BATCH-AGRI-091']
      });

      console.log('[Turso DB] Seed data populated successfully for agricultural produce batch BATCH-AGRI-2026-F2F-091.');
    }
  } catch (agriErr) {
    console.warn('[Turso DB] Seed agricultural produce notice:', agriErr.message);
  }

  invalidateCache();
}

// In-Memory TTL Cache State
let statusCache = { data: null, expiresAt: 0 };
let batchesCache = { data: null, expiresAt: 0 };
let statusInFlight = null;

function invalidateCache() {
  statusCache = { data: null, expiresAt: 0 };
  batchesCache = { data: null, expiresAt: 0 };
}

async function getTablesStatus(skipCache = false) {
  const now = Date.now();
  if (!skipCache && statusCache.data && statusCache.expiresAt > now) {
    return statusCache.data;
  }

  // Prevent cache stampede / thundering herd under concurrent storms
  if (!skipCache && statusInFlight) {
    return statusInFlight;
  }

  statusInFlight = (async () => {
    try {
      const sql = `SELECT 
        (SELECT count(*) FROM batches) as batches,
        (SELECT count(*) FROM packaging_hierarchy) as packaging_hierarchy,
        (SELECT count(*) FROM telemetry_logs) as telemetry_logs,
        (SELECT count(*) FROM custody_chain) as custody_chain,
        (SELECT count(*) FROM dbt_disbursements) as dbt_disbursements,
        (SELECT count(*) FROM reverse_flow_events) as reverse_flow_events,
        (SELECT count(*) FROM click_audit_logs) as click_audit_logs,
        (SELECT count(*) FROM agri_produce_batches) as agri_produce_batches,
        (SELECT count(*) FROM cv_quality_grading_logs) as cv_quality_grading_logs,
        (SELECT count(*) FROM coldchain_telemetry_logs) as coldchain_telemetry_logs,
        (SELECT count(*) FROM farm_custody_hops) as farm_custody_hops,
        (SELECT count(*) FROM consumer_verifications) as consumer_verifications;`;

      const res = await client.execute(sql);
      const row = res.rows[0] || {};
      const summary = {
        batches: Number(row.batches || 0),
        packaging_hierarchy: Number(row.packaging_hierarchy || 0),
        telemetry_logs: Number(row.telemetry_logs || 0),
        custody_chain: Number(row.custody_chain || 0),
        dbt_disbursements: Number(row.dbt_disbursements || 0),
        reverse_flow_events: Number(row.reverse_flow_events || 0),
        click_audit_logs: Number(row.click_audit_logs || 0),
        agri_produce_batches: Number(row.agri_produce_batches || 0),
        cv_quality_grading_logs: Number(row.cv_quality_grading_logs || 0),
        coldchain_telemetry_logs: Number(row.coldchain_telemetry_logs || 0),
        farm_custody_hops: Number(row.farm_custody_hops || 0),
        consumer_verifications: Number(row.consumer_verifications || 0)
      };

      statusCache = {
        data: summary,
        expiresAt: Date.now() + 5000 // 5 seconds TTL cache
      };
      return summary;
    } catch (e) {
      console.error('[Turso DB] getTablesStatus query error:', e.message);
      return statusCache.data || {
        batches: 0, packaging_hierarchy: 0, telemetry_logs: 0,
        custody_chain: 0, dbt_disbursements: 0, reverse_flow_events: 0
      };
    } finally {
      statusInFlight = null;
    }
  })();

  return statusInFlight;
}

// Service helper methods
async function getBatches(skipCache = false) {
  const now = Date.now();
  if (!skipCache && batchesCache.data && batchesCache.expiresAt > now) {
    return batchesCache.data;
  }

  const result = await client.execute('SELECT * FROM batches ORDER BY created_at DESC');
  batchesCache = {
    data: result.rows,
    expiresAt: now + 8000 // 8 seconds TTL cache
  };
  return result.rows;
}

async function getTelemetry(batchId) {
  const result = await client.execute({
    sql: 'SELECT * FROM telemetry_logs WHERE batch_id = ? ORDER BY id ASC',
    args: [batchId || 'batch-iffco-2026-x992']
  });
  return result.rows;
}

async function logTelemetry(batchId, nodeIndex, nodeName, gps, temp, hum) {
  const isBreached = temp > 40.0 || hum > 85.0 ? 1 : 0;
  const note = isBreached ? 'BREACH: Critical Limit Exceeded' : 'Condition Compliant';

  const res = await client.execute({
    sql: `INSERT INTO telemetry_logs (batch_id, node_index, node_name, gps_coordinates, temperature, humidity, is_breached, status_note)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [batchId || 'batch-iffco-2026-x992', nodeIndex, nodeName, gps, temp, hum, isBreached, note]
  });

  if (isBreached) {
    await client.execute({
      sql: `INSERT INTO reverse_flow_events (batch_id, trigger_node, reason, trigger_temperature, trigger_humidity, return_waybill)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        batchId || 'batch-iffco-2026-x992',
        nodeName,
        `Sensor threshold breach: ${temp.toFixed(1)}°C, ${hum.toFixed(1)}%`,
        temp,
        hum,
        'RET-LOT-2026-' + Math.floor(Math.random() * 90000 + 10000)
      ]
    });
  }

  // Bust cache when new telemetry is logged
  invalidateCache();

  return { success: true, isBreached };
}

function parseGps(gpsStr) {
  if (!gpsStr) return { lat: '', lng: '', decimalLat: null, decimalLng: null, raw: '' };
  const str = String(gpsStr).trim();
  const dmsMatch = str.match(/([0-9.]+)\s*°?\s*([NSns])\s*,?\s*([0-9.]+)\s*°?\s*([EWew])/);
  if (dmsMatch) {
    const latVal = parseFloat(dmsMatch[1]);
    const latDir = dmsMatch[2].toUpperCase();
    const lngVal = parseFloat(dmsMatch[3]);
    const lngDir = dmsMatch[4].toUpperCase();
    const decLat = latDir === 'S' ? -latVal : latVal;
    const decLng = lngDir === 'W' ? -lngVal : lngVal;
    return {
      lat: `${latVal}°${latDir}`,
      lng: `${lngVal}°${lngDir}`,
      decimalLat: Number(decLat.toFixed(6)),
      decimalLng: Number(decLng.toFixed(6)),
      raw: str
    };
  }
  const numMatch = str.match(/(-?[0-9.]+)\s*,\s*(-?[0-9.]+)/);
  if (numMatch) {
    const latNum = parseFloat(numMatch[1]);
    const lngNum = parseFloat(numMatch[2]);
    return {
      lat: `${Math.abs(latNum)}°${latNum >= 0 ? 'N' : 'S'}`,
      lng: `${Math.abs(lngNum)}°${lngNum >= 0 ? 'E' : 'W'}`,
      decimalLat: Number(latNum.toFixed(6)),
      decimalLng: Number(lngNum.toFixed(6)),
      raw: str
    };
  }
  return { lat: str, lng: '', decimalLat: null, decimalLng: null, raw: str };
}

async function logClickEvent(batchId, actionType, targetElement, nodeIndex, nodeName, gps, temp, hum, details) {
  try {
    const res = await client.execute({
      sql: `INSERT INTO click_audit_logs (batch_id, action_type, target_element, node_index, node_name, gps_coordinates, temperature, humidity, details)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        batchId || 'batch-iffco-2026-x992',
        actionType || 'SINGLE_CLICK',
        targetElement || 'UI_ACTION',
        nodeIndex != null ? parseInt(nodeIndex, 10) : 0,
        nodeName || 'Facility Station',
        gps || '26.45°N 80.33°E',
        temp != null ? Number(temp) : 28.5,
        hum != null ? Number(hum) : 55.0,
        details || 'User interaction click captured'
      ]
    });
    invalidateCache();
    return { success: true, id: res.lastInsertRowid };
  } catch (err) {
    console.warn('[Turso DB] logClickEvent notice:', err.message);
    return { success: false, error: err.message };
  }
}

async function logCustodyHop(batchId, stageNumber, fromEntity, toEntity, locationName, carrierVehicle, txHash, isOfflineSigned = 0) {
  try {
    const res = await client.execute({
      sql: `INSERT INTO custody_chain (batch_id, stage_number, from_entity, to_entity, location_name, carrier_vehicle_id, tx_hash, is_offline_signed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        batchId || 'batch-iffco-2026-x992',
        stageNumber || 1,
        fromEntity || 'Sender Entity',
        toEntity || 'Receiver Entity',
        locationName || 'Transit Hub',
        carrierVehicle || 'UP-32-BT-9014',
        txHash || '0x' + Math.random().toString(16).slice(2, 18),
        isOfflineSigned ? 1 : 0
      ]
    });
    invalidateCache();
    return { success: true, id: res.lastInsertRowid };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function logDbtDisbursement(batchId, bagCode, farmerName, farmerAadhaarHash, bankAccountLast4, subsidyAmount, verificationChannel) {
  try {
    const res = await client.execute({
      sql: `INSERT INTO dbt_disbursements (id, batch_id, bag_code, farmer_name, farmer_aadhaar_hash, bank_account_last4, subsidy_amount, verification_channel, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CREDITED')`,
      args: [
        'dbt-tx-' + Date.now().toString().slice(-6),
        batchId || 'batch-iffco-2026-x992',
        bagCode || 'BAG-2026-X992-0001',
        farmerName || 'Ramesh Kumar Patel',
        farmerAadhaarHash || '0xaadhaar7f201948bc819e01f2984c90',
        bankAccountLast4 || '4091',
        subsidyAmount || 1500.0,
        verificationChannel || 'SMARTPHONE_QR'
      ]
    });
    invalidateCache();
    return { success: true, id: res.lastInsertRowid };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ----------------------------------------------------------------------------
// AgriProduce Farm-to-Fork Service Layer Helpers
// ----------------------------------------------------------------------------
async function getAgriBatches() {
  try {
    const res = await client.execute('SELECT * FROM agri_produce_batches ORDER BY created_at DESC');
    return res.rows;
  } catch (e) {
    return [];
  }
}

async function getCvGradingLogs(batchId = 'BATCH-AGRI-2026-F2F-091') {
  try {
    const res = await client.execute({
      sql: 'SELECT * FROM cv_quality_grading_logs WHERE batch_id = ? ORDER BY id DESC',
      args: [batchId]
    });
    return res.rows;
  } catch (e) {
    return [];
  }
}

async function logCvGrading(batchId, sampleCode, produceType, confidence, caliber, weight, ripeness, brix, defectCount, defectType, defectArea, mrlPpm, grade, certHash) {
  try {
    const res = await client.execute({
      sql: `INSERT INTO cv_quality_grading_logs (
        batch_id, sample_item_code, produce_type, model_name, detection_confidence,
        caliber_diameter_mm, estimated_weight_g, ripeness_color_pct, sugar_brix_rating,
        defect_count, defect_type, defect_area_pct, mrl_pesticide_ppm, mrl_status,
        assigned_grade, quality_cert_hash
      ) VALUES (?, ?, ?, 'AgriVision-YOLOv8-FruitGrading-v3', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PASSED_APEDA_EXPORT_STANDARD', ?, ?)`,
      args: [
        batchId || 'BATCH-AGRI-2026-F2F-091',
        sampleCode || ('FRUIT-ALPH-091-' + Math.floor(Math.random() * 9000 + 1000)),
        produceType || 'Alphonso Mango',
        confidence != null ? Number(confidence) : 0.994,
        caliber != null ? Number(caliber) : 72.4,
        weight != null ? Number(weight) : 265.0,
        ripeness != null ? Number(ripeness) : 88.2,
        brix != null ? Number(brix) : 19.2,
        defectCount != null ? parseInt(defectCount, 10) : 0,
        defectType || 'None / Zero Defects',
        defectArea != null ? Number(defectArea) : 0.0,
        mrlPpm != null ? Number(mrlPpm) : 0.002,
        grade || 'GRADE_A_PLUS_EXPORT',
        certHash || ('0xqc' + Math.random().toString(16).slice(2, 18))
      ]
    });
    invalidateCache();
    return { success: true, id: res.lastInsertRowid };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function getColdChainTelemetry(batchId = 'BATCH-AGRI-2026-F2F-091') {
  try {
    const res = await client.execute({
      sql: 'SELECT * FROM coldchain_telemetry_logs WHERE batch_id = ? ORDER BY id DESC LIMIT 50',
      args: [batchId]
    });
    return res.rows;
  } catch (e) {
    return [];
  }
}

async function logColdChainTelemetry(batchId, stageNode, vehicleId, gps, temp, hum, ethylene, isBreached = 0, note = 'Cold chain compliant') {
  try {
    const res = await client.execute({
      sql: `INSERT INTO coldchain_telemetry_logs (
        batch_id, stage_node, vehicle_id, gps_coordinates, temperature_celsius,
        relative_humidity_pct, ethylene_level_ppm, is_cold_chain_breached, status_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        batchId || 'BATCH-AGRI-2026-F2F-091',
        stageNode || 'Reefer Truck In-Transit',
        vehicleId || 'MH-08-AG-9941',
        gps || '18.9220°N 72.8347°E',
        temp != null ? Number(temp) : 12.8,
        hum != null ? Number(hum) : 89.5,
        ethylene != null ? Number(ethylene) : 0.04,
        isBreached ? 1 : 0,
        note
      ]
    });
    invalidateCache();
    return { success: true, id: res.lastInsertRowid };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function logFarmCustodyHop(batchId, hopSeq, fromStakeholder, toStakeholder, locationName, doc, vehicleId, txHash, isOfflineSigned = 0) {
  try {
    const res = await client.execute({
      sql: `INSERT INTO farm_custody_hops (
        batch_id, hop_sequence, from_stakeholder, to_stakeholder, location_name,
        custody_document, carrier_vehicle_id, tx_hash, is_offline_signed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        batchId || 'BATCH-AGRI-2026-F2F-091',
        hopSeq || 1,
        fromStakeholder || 'Farmer',
        toStakeholder || 'Aggregator',
        locationName || 'Collection Point',
        doc || 'e-NWR Electronic Warehouse Receipt',
        vehicleId || 'MH-08-AG-9941',
        txHash || ('0x' + Math.random().toString(16).slice(2, 18)),
        isOfflineSigned ? 1 : 0
      ]
    });
    invalidateCache();
    return { success: true, id: res.lastInsertRowid };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function logConsumerScan(batchId, qrCode, channel, location, verified = 1, tip = 0) {
  try {
    const res = await client.execute({
      sql: `INSERT INTO consumer_verifications (
        batch_id, scanned_qr_code, scan_channel, consumer_location, provenance_verified, fair_trade_farmer_tip
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        batchId || 'BATCH-AGRI-2026-F2F-091',
        qrCode || 'GS1-DL-8901030-BATCH-AGRI-091',
        channel || 'Consumer Smartphone PWA',
        location || 'Mumbai Supermarket',
        verified ? 1 : 0,
        tip != null ? Number(tip) : 0.0
      ]
    });
    invalidateCache();
    return { success: true, id: res.lastInsertRowid };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function getAllDatabaseRecords() {
  const [
    telemetryRes,
    batchesRes,
    custodyRes,
    dbtRes,
    reverseRes,
    packagingRes,
    clicksRes,
    agriBatchesRes,
    cvGradingRes,
    coldchainRes,
    farmCustodyRes,
    consumerRes
  ] = await Promise.all([
    client.execute('SELECT * FROM telemetry_logs ORDER BY id DESC').catch(() => ({ rows: [] })),
    client.execute('SELECT * FROM batches ORDER BY created_at DESC').catch(() => ({ rows: [] })),
    client.execute('SELECT * FROM custody_chain ORDER BY stage_number ASC').catch(() => ({ rows: [] })),
    client.execute('SELECT * FROM dbt_disbursements ORDER BY disbursed_at DESC').catch(() => ({ rows: [] })),
    client.execute('SELECT * FROM reverse_flow_events ORDER BY id DESC').catch(() => ({ rows: [] })),
    client.execute('SELECT * FROM packaging_hierarchy ORDER BY level ASC').catch(() => ({ rows: [] })),
    client.execute('SELECT * FROM click_audit_logs ORDER BY id DESC').catch(() => ({ rows: [] })),
    client.execute('SELECT * FROM agri_produce_batches ORDER BY created_at DESC').catch(() => ({ rows: [] })),
    client.execute('SELECT * FROM cv_quality_grading_logs ORDER BY id DESC').catch(() => ({ rows: [] })),
    client.execute('SELECT * FROM coldchain_telemetry_logs ORDER BY id DESC').catch(() => ({ rows: [] })),
    client.execute('SELECT * FROM farm_custody_hops ORDER BY hop_sequence ASC').catch(() => ({ rows: [] })),
    client.execute('SELECT * FROM consumer_verifications ORDER BY id DESC').catch(() => ({ rows: [] }))
  ]);

  const enrichedTelemetry = telemetryRes.rows.map(row => {
    const gps = parseGps(row.gps_coordinates);
    return {
      ...row,
      latitude: gps.lat,
      longitude: gps.lng,
      decimal_latitude: gps.decimalLat,
      decimal_longitude: gps.decimalLng,
      compliance_status: row.is_breached ? 'BREACHED' : 'COMPLIANT'
    };
  });

  const enrichedColdChain = coldchainRes.rows.map(row => {
    const gps = parseGps(row.gps_coordinates);
    return {
      ...row,
      latitude: gps.lat,
      longitude: gps.lng,
      decimal_latitude: gps.decimalLat,
      decimal_longitude: gps.decimalLng,
      compliance_status: row.is_cold_chain_breached ? 'BREACHED' : 'COMPLIANT'
    };
  });

  const enrichedAgriBatches = agriBatchesRes.rows.map(row => {
    const gps = parseGps(row.farm_gps);
    return {
      ...row,
      farm_latitude: gps.lat,
      farm_longitude: gps.lng,
      farm_decimal_latitude: gps.decimalLat,
      farm_decimal_longitude: gps.decimalLng
    };
  });

  const enrichedBatches = batchesRes.rows.map(row => {
    const gps = parseGps(row.plant_gps);
    return {
      ...row,
      plant_latitude: gps.lat,
      plant_longitude: gps.lng,
      plant_decimal_latitude: gps.decimalLat,
      plant_decimal_longitude: gps.decimalLng
    };
  });

  const enrichedClicks = clicksRes.rows.map(row => {
    const gps = parseGps(row.gps_coordinates);
    return {
      ...row,
      latitude: gps.lat,
      longitude: gps.lng,
      decimal_latitude: gps.decimalLat,
      decimal_longitude: gps.decimalLng
    };
  });

  // Construct Unified Master Event Timeline
  const masterTimeline = [];

  // 1. Add click events
  enrichedClicks.forEach(c => {
    masterTimeline.push({
      event_id: `CLK-${c.id}`,
      timestamp: c.clicked_at || new Date().toISOString(),
      category: 'SINGLE_CLICK_ACTION',
      action_or_type: c.action_type,
      facility_name: c.node_name,
      target_element: c.target_element,
      latitude: c.latitude,
      longitude: c.longitude,
      decimal_latitude: c.decimal_latitude,
      decimal_longitude: c.decimal_longitude,
      temperature: c.temperature,
      humidity: c.humidity,
      status: 'CAPTURED',
      notes: c.details
    });
  });

  // 2. Add AgriProduce Farm Harvest Events
  enrichedAgriBatches.forEach(b => {
    masterTimeline.push({
      event_id: `HARVEST-${b.id}`,
      timestamp: b.harvest_date,
      category: 'AGRI_FARM_HARVEST',
      action_or_type: 'Organic Harvest & Genesis Block Minted',
      facility_name: b.farm_name,
      target_element: `${b.produce_name} (${b.variety})`,
      latitude: b.farm_latitude,
      longitude: b.farm_longitude,
      decimal_latitude: b.farm_decimal_latitude,
      decimal_longitude: b.farm_decimal_longitude,
      temperature: 24.5,
      humidity: 78.0,
      status: 'GENESIS_MINTED',
      notes: `Farmer: ${b.farmer_name} | Soil: ${b.soil_health_index} | Cert: ${b.organic_cert_number}`
    });
  });

  // 3. Add Computer Vision AI Quality Grading Events
  cvGradingRes.rows.forEach(g => {
    masterTimeline.push({
      event_id: `CV-GRADE-${g.id}`,
      timestamp: g.graded_at,
      category: 'COMPUTER_VISION_AI_GRADING',
      action_or_type: g.assigned_grade,
      facility_name: 'Vashi Agro Packhouse AI Inspection Lab',
      target_element: `Sample: ${g.sample_item_code} (${g.produce_type})`,
      latitude: '19.0760°N',
      longitude: '72.8777°E',
      decimal_latitude: 19.0760,
      decimal_longitude: 72.8777,
      temperature: 18.0,
      humidity: 65.0,
      status: g.assigned_grade,
      notes: `Conf: ${(g.detection_confidence * 100).toFixed(1)}% | Caliber: ${g.caliber_diameter_mm}mm | Brix: ${g.sugar_brix_rating}° | Ripeness: ${g.ripeness_color_pct}% | MRL: ${g.mrl_pesticide_ppm} ppm`
    });
  });

  // 4. Add Cold-Chain IoT Telemetry Events
  enrichedColdChain.forEach(cc => {
    masterTimeline.push({
      event_id: `COLD-${cc.id}`,
      timestamp: cc.recorded_at,
      category: 'COLD_CHAIN_IOT_TELEMETRY',
      action_or_type: cc.compliance_status,
      facility_name: cc.stage_node,
      target_element: `Carrier: ${cc.vehicle_id}`,
      latitude: cc.latitude,
      longitude: cc.longitude,
      decimal_latitude: cc.decimal_latitude,
      decimal_longitude: cc.decimal_longitude,
      temperature: cc.temperature_celsius,
      humidity: cc.relative_humidity_pct,
      status: cc.compliance_status,
      notes: `${cc.status_note} | Ethylene: ${cc.ethylene_level_ppm} ppm`
    });
  });

  // 5. Add Farm-to-Fork Custody Handovers
  farmCustodyRes.rows.forEach(h => {
    masterTimeline.push({
      event_id: `AGRI-CUST-${h.id}`,
      timestamp: h.verified_at,
      category: 'FARM_TO_FORK_CUSTODY_HOP',
      action_or_type: `Hop ${h.hop_sequence}: Handover`,
      facility_name: h.location_name,
      target_element: `${h.from_stakeholder} -> ${h.to_stakeholder}`,
      latitude: '18.9220°N',
      longitude: '72.8347°E',
      decimal_latitude: 18.9220,
      decimal_longitude: 72.8347,
      temperature: 13.0,
      humidity: 89.0,
      status: h.is_offline_signed ? 'OFFLINE_SIGNED' : 'VERIFIED',
      notes: `Doc: ${h.custody_document} | Vehicle: ${h.carrier_vehicle_id || 'N/A'} | Tx: ${h.tx_hash}`
    });
  });

  // 6. Add Consumer & Buyer Verification Scans
  consumerRes.rows.forEach(cs => {
    masterTimeline.push({
      event_id: `FORK-SCAN-${cs.id}`,
      timestamp: cs.scanned_at,
      category: 'CONSUMER_FORK_VERIFICATION',
      action_or_type: 'GS1 Digital Link Verification',
      facility_name: cs.consumer_location,
      target_element: `QR: ${cs.scanned_qr_code}`,
      latitude: '19.0596°N',
      longitude: '72.8295°E',
      decimal_latitude: 19.0596,
      decimal_longitude: 72.8295,
      temperature: 22.0,
      humidity: 60.0,
      status: cs.provenance_verified ? 'VERIFIED_ORGANIC' : 'UNVERIFIED',
      notes: `Channel: ${cs.scan_channel} | Fair Trade Farmer Tip: ₹${cs.fair_trade_farmer_tip}`
    });
  });

  // 7. Add legacy fertilizer telemetry events
  enrichedTelemetry.forEach(t => {
    masterTimeline.push({
      event_id: `IOT-${t.id}`,
      timestamp: t.recorded_at,
      category: 'FERTILIZER_TELEMETRY',
      action_or_type: t.compliance_status,
      facility_name: t.node_name,
      target_element: `Sensor Station #${t.node_index}`,
      latitude: t.latitude,
      longitude: t.longitude,
      decimal_latitude: t.decimal_latitude,
      decimal_longitude: t.decimal_longitude,
      temperature: t.temperature,
      humidity: t.humidity,
      status: t.compliance_status,
      notes: t.status_note
    });
  });

  // 3. Add custody events
  custodyRes.rows.forEach(c => {
    masterTimeline.push({
      event_id: `CUST-${c.id}`,
      timestamp: c.verified_at,
      category: 'BLOCKCHAIN_CUSTODY_HOP',
      action_or_type: `Stage ${c.stage_number} Transfer`,
      facility_name: c.location_name,
      target_element: `${c.from_entity} -> ${c.to_entity}`,
      latitude: '26.80°N',
      longitude: '81.02°E',
      decimal_latitude: 26.80,
      decimal_longitude: 81.02,
      temperature: 28.1,
      humidity: 54.0,
      status: c.is_offline_signed ? 'OFFLINE_SIGNED' : 'VERIFIED',
      notes: `Tx: ${c.tx_hash} | Vehicle: ${c.carrier_vehicle_id || 'N/A'}`
    });
  });

  // 4. Add DBT events
  dbtRes.rows.forEach(d => {
    masterTimeline.push({
      event_id: `DBT-${d.id}`,
      timestamp: d.disbursed_at,
      category: 'DBT_SUBSIDY_RELEASE',
      action_or_type: 'Direct Benefit Transfer',
      facility_name: 'Farmer Farmstead',
      target_element: `Farmer: ${d.farmer_name}`,
      latitude: '25.40°N',
      longitude: '82.85°E',
      decimal_latitude: 25.40,
      decimal_longitude: 82.85,
      temperature: 28.5,
      humidity: 55.0,
      status: d.status,
      notes: `Subsidy: ₹${d.subsidy_amount} to A/C ending ${d.bank_account_last4} (${d.verification_channel})`
    });
  });

  // 5. Add Reverse Flow events
  reverseRes.rows.forEach(r => {
    masterTimeline.push({
      event_id: `RET-${r.id}`,
      timestamp: r.quarantined_at,
      category: 'REVERSE_FLOW_RECALL',
      action_or_type: 'Thermal / QC Breach Recall',
      facility_name: r.trigger_node,
      target_element: `Waybill: ${r.return_waybill}`,
      latitude: '26.30°N',
      longitude: '81.80°E',
      decimal_latitude: 26.30,
      decimal_longitude: 81.80,
      temperature: r.trigger_temperature,
      humidity: r.trigger_humidity,
      status: 'QUARANTINED',
      notes: `${r.reason} | Route: ${r.return_route}`
    });
  });

  // Sort master timeline descending by timestamp
  masterTimeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return {
    clicks: enrichedClicks,
    timeline: masterTimeline,
    agri_batches: enrichedAgriBatches,
    cv_grading: cvGradingRes.rows,
    coldchain_telemetry: enrichedColdChain,
    farm_custody: farmCustodyRes.rows,
    consumer_scans: consumerRes.rows,
    telemetry: enrichedTelemetry,
    batches: enrichedBatches,
    custody: custodyRes.rows,
    dbt: dbtRes.rows,
    reverse_flow: reverseRes.rows,
    packaging: packagingRes.rows
  };
}

module.exports = {
  client: () => client,
  initDb,
  seedDb,
  getBatches,
  getTelemetry,
  logTelemetry,
  logClickEvent,
  logCustodyHop,
  logDbtDisbursement,
  getAgriBatches,
  getCvGradingLogs,
  logCvGrading,
  getColdChainTelemetry,
  logColdChainTelemetry,
  logFarmCustodyHop,
  logConsumerScan,
  getTablesStatus,
  getAllDatabaseRecords,
  parseGps,
  updateClientConfig,
  invalidateCache,
  isCloud: () => isCloud,
  url: () => url
};

if (require.main === module) {
  seedDb()
    .then(() => {
      console.log('[Turso DB] Completed setup and seeding.');
      process.exit(0);
    })
    .catch(err => {
      console.error('[Turso DB] Error:', err);
      process.exit(1);
    });
}
