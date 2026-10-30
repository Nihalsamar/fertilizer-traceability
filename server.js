/**
 * ============================================================================
 * KisanTrace: Dedicated Fertilizer Traceability Web Service & Database Hub
 * Full-stack Express server for Fertilizer Supply Chain (Manufacturer to Farmer)
 * Features: Turso DB, 1-Click Excel Export, Telemetry Logging & DBT Verification
 * ============================================================================
 */

const express = require('express');
const path = require('path');
const {
  getBatches,
  getTelemetry,
  logTelemetry,
  logClickEvent,
  initDb,
  seedDb,
  getTablesStatus,
  getAllDatabaseRecords,
  parseGps,
  updateClientConfig,
  isCloud,
  url
} = require('./turso_db');
const { generateExcelXml, generateTelemetryCsv } = require('./excel_export');

const app = express();
const PORT = process.env.PORT || 3001;

// Security & CORS
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.use(express.json());
app.use(express.static(__dirname));

// --- API Endpoints ---

// 1. Get Fertilizer Batches
app.get('/api/batches', async (req, res) => {
  try {
    const batches = await getBatches();
    res.json({ success: true, count: batches.length, batches });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Get Telemetry Logs
app.get('/api/telemetry', async (req, res) => {
  try {
    const logs = await getTelemetry(req.query.batch_id || 'batch-iffco-2026-x992');
    res.json({ success: true, count: logs.length, telemetry: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Log Telemetry
app.post('/api/telemetry', async (req, res) => {
  try {
    const { batch_id, node_index, node_name, gps, temp, humidity, is_breached, note } = req.body;
    await logTelemetry(batch_id, node_index, node_name, gps, temp, humidity, is_breached ? 1 : 0, note);
    res.json({ success: true, message: 'Telemetry recorded successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Log Single-Click Interaction Audit
app.post('/api/click-event', async (req, res) => {
  try {
    const { batch_id, action_type, target_element, node_index, node_name, gps, temperature, humidity, details } = req.body;
    await logClickEvent(batch_id, action_type, target_element, node_index, node_name, gps, temperature, humidity, details);
    res.json({ success: true, message: 'Click event logged to database' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. 1-Click Excel Export Endpoint (.xlsx SpreadsheetML)
app.get('/api/export-excel', async (req, res) => {
  try {
    const data = await getAllDatabaseRecords();
    const xml = generateExcelXml(data);
    const filename = `Fertilizer_Traceability_Consortium_Database_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(xml);
  } catch (err) {
    res.status(500).send('Error generating Excel file: ' + err.message);
  }
});

// 6. CSV Telemetry Export
app.get('/api/export-csv', async (req, res) => {
  try {
    const logs = await getTelemetry();
    const csv = generateTelemetryCsv(logs);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="fertilizer_telemetry_stream.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).send('Error generating CSV: ' + err.message);
  }
});

// 7. Database Tables Status
app.get('/api/database/tables', async (req, res) => {
  try {
    const status = await getTablesStatus();
    res.json({ success: true, database: status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Update Turso Config
app.post('/api/config', async (req, res) => {
  try {
    const { url: newUrl, authToken } = req.body;
    const result = await updateClientConfig(newUrl, authToken);
    res.json({ success: true, message: 'Configuration updated', ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Default Root Route serves index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize database and start listening
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`============================================================`);
    console.log(`⚡ KisanTrace: Fertilizer Traceability Service Running!`);
    console.log(`🌐 Local URL: http://localhost:${PORT}/`);
    console.log(`🗄️ Database: ${isCloud ? 'Turso Cloud (' + url + ')' : 'Local libSQL/SQLite (kisan_trace.db)'}`);
    console.log(`============================================================`);
  });
}).catch(err => {
  console.error('Database initialization error:', err);
  app.listen(PORT, () => console.log(`Server started on port ${PORT} (degraded mode)`));
});
