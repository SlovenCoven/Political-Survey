const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite database
const db = new sqlite3.Database('./survey_results.db', (err) => {
  if (err) console.error('Database connection error:', err);
  else console.log('Connected to SQLite database');
});

// Create table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    liberty INTEGER NOT NULL,
    economic INTEGER NOT NULL,
    social INTEGER NOT NULL,
    change INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// POST endpoint to save survey results
app.post('/api/results', (req, res) => {
  const { label, liberty, economic, social, change } = req.body;

  // Validate input
  if (!label || liberty === undefined || economic === undefined || social === undefined || change === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = `
    INSERT INTO results (label, liberty, economic, social, change)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.run(query, [label, liberty, economic, social, change], function (err) {
    if (err) {
      console.error('Database insert error:', err);
      return res.status(500).json({ error: 'Failed to save results' });
    }
    res.json({ success: true, id: this.lastID });
  });
});

// GET endpoint to fetch aggregate statistics
app.get('/api/stats', (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as total_responses,
      ROUND(AVG(liberty), 1) as avg_liberty,
      ROUND(AVG(economic), 1) as avg_economic,
      ROUND(AVG(social), 1) as avg_social,
      ROUND(AVG(change), 1) as avg_change,
      ROUND(MIN(liberty), 1) as min_liberty,
      ROUND(MAX(liberty), 1) as max_liberty,
      ROUND(MIN(economic), 1) as min_economic,
      ROUND(MAX(economic), 1) as max_economic,
      ROUND(MIN(social), 1) as min_social,
      ROUND(MAX(social), 1) as max_social,
      ROUND(MIN(change), 1) as min_change,
      ROUND(MAX(change), 1) as max_change
    FROM results
  `;

  db.get(query, (err, row) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Failed to fetch statistics' });
    }
    res.json(row || {});
  });
});

// GET endpoint to fetch all results grouped by label
app.get('/api/labels', (req, res) => {
  const query = `
    SELECT 
      label,
      COUNT(*) as count,
      ROUND(AVG(liberty), 1) as avg_liberty,
      ROUND(AVG(economic), 1) as avg_economic,
      ROUND(AVG(social), 1) as avg_social,
      ROUND(AVG(change), 1) as avg_change
    FROM results
    GROUP BY label
    ORDER BY count DESC
  `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Failed to fetch labels' });
    }
    res.json(rows || []);
  });
});

// GET endpoint to get user's percentile ranking
app.get('/api/percentile/:axis/:value', (req, res) => {
  const { axis, value } = req.params;
  const axisName = axis.toLowerCase();

  if (!['liberty', 'economic', 'social', 'change'].includes(axisName)) {
    return res.status(400).json({ error: 'Invalid axis' });
  }

  const query = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN ${axisName} <= ? THEN 1 ELSE 0 END) as below
    FROM results
  `;

  db.get(query, [value], (err, row) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Failed to calculate percentile' });
    }
    const percentile = row.total > 0 ? Math.round((row.below / row.total) * 100) : 0;
    res.json({ percentile, total_responses: row.total });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
