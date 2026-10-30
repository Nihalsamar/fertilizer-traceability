/**
 * ============================================================================
 * KisanTrace 3D: Excel & CSV Export Generator (SpreadsheetML & Tabular Builder)
 * Generates Native Multi-Sheet Excel XML (.xls/.xml) and CSV Workbooks
 * Zero External Dependencies, 100% Compatible with MS Excel, LibreOffice & Google Sheets
 * ============================================================================
 */

function escapeXml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildWorksheetXml(sheetName, columns, rows) {
  let xml = `  <Worksheet ss:Name="${escapeXml(sheetName)}">\n`;
  xml += `    <Table>\n`;

  // Define column widths
  columns.forEach(col => {
    const width = col.width || 120;
    xml += `      <Column ss:Width="${width}"/>\n`;
  });

  // Header row
  xml += `      <Row ss:Height="24">\n`;
  columns.forEach(col => {
    xml += `        <Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(col.title)}</Data></Cell>\n`;
  });
  xml += `      </Row>\n`;

  // Data rows
  rows.forEach((row, idx) => {
    const isAlt = idx % 2 === 1;
    xml += `      <Row ss:Height="18">\n`;
    columns.forEach(col => {
      const val = col.accessor ? col.accessor(row) : row[col.key];
      const styleId = col.getStyle ? col.getStyle(row, val) : (isAlt ? 'AltRow' : 'Normal');

      if (val === null || val === undefined || val === '') {
        xml += `        <Cell ss:StyleID="${styleId}"><Data ss:Type="String">-</Data></Cell>\n`;
      } else if (typeof val === 'number') {
        xml += `        <Cell ss:StyleID="${styleId}"><Data ss:Type="Number">${val}</Data></Cell>\n`;
      } else {
        xml += `        <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(val)}</Data></Cell>\n`;
      }
    });
    xml += `      </Row>\n`;
  });

  xml += `    </Table>\n`;
  xml += `  </Worksheet>\n`;
  return xml;
}

function generateExcelXml(data) {
  const {
    clicks = [],
    timeline = [],
    agri_batches = [],
    cv_grading = [],
    coldchain_telemetry = [],
    farm_custody = [],
    consumer_scans = [],
    telemetry = [],
    batches = [],
    custody = [],
    dbt = [],
    reverse_flow = [],
    packaging = []
  } = data;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<?mso-application progid="Excel.Sheet"?>\n`;
  xml += `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n`;
  xml += ` xmlns:o="urn:schemas-microsoft-com:office:office"\n`;
  xml += ` xmlns:x="urn:schemas-microsoft-com:office:excel"\n`;
  xml += ` xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n`;
  xml += ` xmlns:html="http://www.w3.org/TR/REC-html40">\n`;

  // Workbook Styles
  xml += `  <Styles>\n`;
  xml += `    <Style ss:ID="Default" ss:Name="Normal">\n`;
  xml += `      <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#1E293B"/>\n`;
  xml += `      <Alignment ss:Vertical="Center"/>\n`;
  xml += `    </Style>\n`;
  xml += `    <Style ss:ID="Header">\n`;
  xml += `      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>\n`;
  xml += `      <Interior ss:Color="#047857" ss:Pattern="Solid"/>\n`;
  xml += `      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n`;
  xml += `    </Style>\n`;
  xml += `    <Style ss:ID="Normal">\n`;
  xml += `      <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#0F172A"/>\n`;
  xml += `      <Alignment ss:Vertical="Center"/>\n`;
  xml += `    </Style>\n`;
  xml += `    <Style ss:ID="AltRow">\n`;
  xml += `      <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#0F172A"/>\n`;
  xml += `      <Interior ss:Color="#F0FDF4" ss:Pattern="Solid"/>\n`;
  xml += `      <Alignment ss:Vertical="Center"/>\n`;
  xml += `    </Style>\n`;
  xml += `    <Style ss:ID="BreachStyle">\n`;
  xml += `      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#991B1B"/>\n`;
  xml += `      <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>\n`;
  xml += `      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n`;
  xml += `    </Style>\n`;
  xml += `    <Style ss:ID="CompliantStyle">\n`;
  xml += `      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#166534"/>\n`;
  xml += `      <Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/>\n`;
  xml += `      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n`;
  xml += `    </Style>\n`;
  xml += `  </Styles>\n`;

  // 1. Single Click Interactions Sheet
  const clickColumns = [
    { title: 'Click ID', key: 'id', width: 65 },
    { title: 'Click Timestamp', key: 'clicked_at', width: 155 },
    { title: 'Action Type', key: 'action_type', width: 140 },
    { title: 'Target Element', key: 'target_element', width: 170 },
    { title: 'Facility / Station', key: 'node_name', width: 160 },
    { title: 'Latitude (°N/S)', key: 'latitude', width: 95 },
    { title: 'Longitude (°E/W)', key: 'longitude', width: 95 },
    { title: 'Decimal Lat', key: 'decimal_latitude', width: 105 },
    { title: 'Decimal Lng', key: 'decimal_longitude', width: 105 },
    { title: 'Recorded Temp (°C)', key: 'temperature', width: 110 },
    { title: 'Recorded Hum (%)', key: 'humidity', width: 105 },
    { title: 'Batch ID', key: 'batch_id', width: 150 },
    { title: 'Interaction Details', key: 'details', width: 220 }
  ];
  xml += buildWorksheetXml('Single_Click_Audit_Log', clickColumns, clicks);

  // 2. Unified Chronological Master Timeline
  const timelineColumns = [
    { title: 'Event ID', key: 'event_id', width: 80 },
    { title: 'Event Timestamp (UTC/Local)', key: 'timestamp', width: 160 },
    { title: 'Event Category', key: 'category', width: 160 },
    { title: 'Action / Type', key: 'action_or_type', width: 140 },
    { title: 'Facility Location', key: 'facility_name', width: 160 },
    { title: 'Target Subject', key: 'target_element', width: 180 },
    { title: 'Latitude', key: 'latitude', width: 95 },
    { title: 'Longitude', key: 'longitude', width: 95 },
    { title: 'Decimal Lat', key: 'decimal_latitude', width: 100 },
    { title: 'Decimal Lng', key: 'decimal_longitude', width: 100 },
    { title: 'Temp (°C)', key: 'temperature', width: 90 },
    { title: 'Humidity (%)', key: 'humidity', width: 90 },
    { title: 'Status Result', key: 'status', width: 110 },
    { title: 'Audit Details & Blockchain Hash', key: 'notes', width: 260 }
  ];
  xml += buildWorksheetXml('Master_Event_Timeline', timelineColumns, timeline);

  // 3. Farm Produce Batches Sheet
  const agriBatchColumns = [
    { title: 'Batch ID', key: 'id', width: 160 },
    { title: 'Lot Number', key: 'batch_number', width: 110 },
    { title: 'Produce Name', key: 'produce_name', width: 180 },
    { title: 'Variety', key: 'variety', width: 160 },
    { title: 'Farm / Orchard', key: 'farm_name', width: 180 },
    { title: 'Farmer Name', key: 'farmer_name', width: 140 },
    { title: 'Farmer ID', key: 'farmer_id', width: 130 },
    { title: 'Farm GPS (DMS)', key: 'farm_gps', width: 110 },
    { title: 'Decimal Lat', key: 'farm_decimal_latitude', width: 95 },
    { title: 'Decimal Lng', key: 'farm_decimal_longitude', width: 95 },
    { title: 'Altitude (m)', key: 'farm_altitude_m', width: 85 },
    { title: 'Soil Health Index', key: 'soil_health_index', width: 190 },
    { title: 'Organic Cert #', key: 'organic_cert_number', width: 160 },
    { title: 'Inputs Used', key: 'inputs_used', width: 210 },
    { title: 'Harvest Date & Time', key: 'harvest_date', width: 150 },
    { title: 'Total Crates', key: 'total_crates', width: 85 },
    { title: 'Weight (kg)', key: 'total_weight_kg', width: 90 },
    { title: 'Fair Trade Premium %', key: 'fair_trade_premium_pct', width: 125 },
    { title: 'Farmer Payout (₹/kg)', key: 'farmer_payout_per_kg', width: 125 },
    { title: 'Genesis Tx Hash', key: 'genesis_tx_hash', width: 200 },
    { title: 'Quality Cert Hash', key: 'quality_cert_hash', width: 200 },
    { title: 'Batch Status', key: 'status', width: 120 }
  ];
  xml += buildWorksheetXml('Farm_Produce_Batches', agriBatchColumns, agri_batches);

  // 4. Computer Vision AI Quality Grading Sheet
  const cvColumns = [
    { title: 'Grade ID', key: 'id', width: 65 },
    { title: 'Batch ID', key: 'batch_id', width: 160 },
    { title: 'Sample Code', key: 'sample_item_code', width: 140 },
    { title: 'Produce Type', key: 'produce_type', width: 120 },
    { title: 'AI Model Name', key: 'model_name', width: 180 },
    { title: 'Confidence Score', key: 'detection_confidence', width: 100 },
    { title: 'Caliber Size (mm)', key: 'caliber_diameter_mm', width: 105 },
    { title: 'Weight Est. (g)', key: 'estimated_weight_g', width: 95 },
    { title: 'Ripeness Color %', key: 'ripeness_color_pct', width: 105 },
    { title: 'Sugar Brix (°)', key: 'sugar_brix_rating', width: 90 },
    { title: 'Defect Count', key: 'defect_count', width: 85 },
    { title: 'Defect Type', key: 'defect_type', width: 160 },
    { title: 'MRL Chemical (ppm)', key: 'mrl_pesticide_ppm', width: 120 },
    { title: 'MRL Status', key: 'mrl_status', width: 180 },
    { title: 'Assigned Grade', key: 'assigned_grade', width: 140 },
    { title: 'Quality Cert Hash', key: 'quality_cert_hash', width: 200 },
    { title: 'Grading Timestamp', key: 'graded_at', width: 150 }
  ];
  xml += buildWorksheetXml('CV_Quality_Grading', cvColumns, cv_grading);

  // 5. Cold-Chain IoT Telemetry Sheet
  const coldChainColumns = [
    { title: 'Cold Log ID', key: 'id', width: 75 },
    { title: 'Batch ID', key: 'batch_id', width: 160 },
    { title: 'Stage Node', key: 'stage_node', width: 160 },
    { title: 'Vehicle / Chamber ID', key: 'vehicle_id', width: 140 },
    { title: 'GPS Coordinates', key: 'gps_coordinates', width: 120 },
    { title: 'Latitude', key: 'latitude', width: 95 },
    { title: 'Longitude', key: 'longitude', width: 95 },
    { title: 'Decimal Lat', key: 'decimal_latitude', width: 95 },
    { title: 'Decimal Lng', key: 'decimal_longitude', width: 95 },
    { title: 'Temp (°C)', key: 'temperature_celsius', width: 85 },
    { title: 'Humidity (%)', key: 'relative_humidity_pct', width: 90 },
    { title: 'Ethylene (ppm)', key: 'ethylene_level_ppm', width: 95 },
    {
      title: 'Compliance Status',
      accessor: r => r.is_cold_chain_breached ? 'BREACHED' : 'COMPLIANT',
      getStyle: r => r.is_cold_chain_breached ? 'BreachStyle' : 'CompliantStyle',
      width: 120
    },
    { title: 'Condition Note', key: 'status_note', width: 190 },
    { title: 'Recorded Timestamp', key: 'recorded_at', width: 150 }
  ];
  xml += buildWorksheetXml('ColdChain_IoT_Telemetry', coldChainColumns, coldchain_telemetry);

  // 6. Farm Custody Handovers Sheet
  const farmCustodyColumns = [
    { title: 'Hop ID', key: 'id', width: 65 },
    { title: 'Batch ID', key: 'batch_id', width: 160 },
    { title: 'Sequence #', key: 'hop_sequence', width: 75 },
    { title: 'From Stakeholder', key: 'from_stakeholder', width: 160 },
    { title: 'To Stakeholder', key: 'to_stakeholder', width: 160 },
    { title: 'Location Name', key: 'location_name', width: 160 },
    { title: 'Custody Document', key: 'custody_document', width: 200 },
    { title: 'Carrier Vehicle ID', key: 'carrier_vehicle_id', width: 140 },
    { title: 'Tx Hash', key: 'tx_hash', width: 190 },
    { title: 'Offline Signed', key: 'is_offline_signed', width: 95 },
    { title: 'Handover Timestamp', key: 'verified_at', width: 150 }
  ];
  xml += buildWorksheetXml('Farm_Custody_Handovers', farmCustodyColumns, farm_custody);

  // 7. Consumer & Buyer Fork Scans Sheet
  const consumerColumns = [
    { title: 'Scan ID', key: 'id', width: 65 },
    { title: 'Batch ID', key: 'batch_id', width: 160 },
    { title: 'Scanned GS1 Code', key: 'scanned_qr_code', width: 180 },
    { title: 'Scan Channel', key: 'scan_channel', width: 150 },
    { title: 'Consumer Location', key: 'consumer_location', width: 180 },
    { title: 'Provenance Verified', key: 'provenance_verified', width: 120 },
    { title: 'Farmer Tip (₹)', key: 'fair_trade_farmer_tip', width: 95 },
    { title: 'Scanned Timestamp', key: 'scanned_at', width: 150 }
  ];
  xml += buildWorksheetXml('Consumer_Fork_Scans', consumerColumns, consumer_scans);

  // 8. Legacy Fertilizer Batches & Hierarchy Sheets (100% Preserved)
  if (batches && batches.length > 0) {
    const batchColumns = [
      { title: 'Batch ID', key: 'id', width: 160 },
      { title: 'Batch Number', key: 'batch_number', width: 110 },
      { title: 'Fertilizer Formulation', key: 'formulation', width: 180 },
      { title: 'Nitrogen (% N)', key: 'nitrogen_pct', width: 95 },
      { title: 'Moisture (%)', key: 'moisture_pct', width: 95 },
      { title: 'Biuret (%)', key: 'biuret_pct', width: 90 },
      { title: 'Total Bags', key: 'quantity_bags', width: 100 },
      { title: 'Weight (MT)', key: 'total_weight_mt', width: 95 },
      { title: 'Manufacturer', key: 'manufacturer_name', width: 170 },
      { title: 'Status', key: 'status', width: 85 }
    ];
    xml += buildWorksheetXml('Fertilizer_Batches_Legacy', batchColumns, batches);
  }

  xml += `</Workbook>\n`;
  return xml;
}

function escapeCsvField(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateTelemetryCsv(telemetryList) {
  const headers = [
    'Log_ID',
    'Recorded_Timestamp_UTC',
    'Batch_ID',
    'Node_Index',
    'Node_Name',
    'Latitude',
    'Longitude',
    'Decimal_Latitude',
    'Decimal_Longitude',
    'Raw_GPS_Coordinates',
    'Temperature_Celsius',
    'Humidity_Percent',
    'Compliance_Status',
    'Status_Note'
  ];

  const lines = [headers.join(',')];

  telemetryList.forEach(r => {
    const row = [
      escapeCsvField(r.id),
      escapeCsvField(r.recorded_at),
      escapeCsvField(r.batch_id),
      escapeCsvField(r.node_index),
      escapeCsvField(r.node_name),
      escapeCsvField(r.latitude),
      escapeCsvField(r.longitude),
      escapeCsvField(r.decimal_latitude),
      escapeCsvField(r.decimal_longitude),
      escapeCsvField(r.gps_coordinates),
      escapeCsvField(r.temperature),
      escapeCsvField(r.humidity),
      escapeCsvField(r.is_breached ? 'BREACHED' : 'COMPLIANT'),
      escapeCsvField(r.status_note)
    ];
    lines.push(row.join(','));
  });

  return lines.join('\r\n');
}

module.exports = {
  generateExcelXml,
  generateTelemetryCsv
};
