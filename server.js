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

// Create tables if they don't exist
db.run(`
  CREATE TABLE IF NOT EXISTS political_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    liberty INTEGER NOT NULL,
    economic INTEGER NOT NULL,
    social INTEGER NOT NULL,
    change INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS big5_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    extroversion INTEGER NOT NULL,
    agreeableness INTEGER NOT NULL,
    conscientiousness INTEGER NOT NULL,
    neuroticism INTEGER NOT NULL,
    openness INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// ====== POLITICAL SURVEY ENDPOINTS ======

// POST endpoint to save political survey results
app.post('/api/results', (req, res) => {
  const { label, liberty, economic, social, change, surveyType } = req.body;

  // Default to political if not specified (for backward compatibility)
  const type = surveyType || 'political';

  if (type === 'political') {
    // Validate political survey input
    if (!label || liberty === undefined || economic === undefined || social === undefined || change === undefined) {
      return res.status(400).json({ error: 'Missing required fields for political survey' });
    }

    const query = `
      INSERT INTO political_results (label, liberty, economic, social, change)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.run(query, [label, liberty, economic, social, change], function (err) {
      if (err) {
        console.error('Database insert error:', err);
        return res.status(500).json({ error: 'Failed to save political survey results' });
      }
      res.json({ success: true, id: this.lastID, surveyType: 'political' });
    });
  } else if (type === 'big5') {
    // Validate Big 5 survey input
    const { extroversion, agreeableness, conscientiousness, neuroticism, openness } = req.body;
    if (extroversion === undefined || agreeableness === undefined || conscientiousness === undefined || 
        neuroticism === undefined || openness === undefined) {
      return res.status(400).json({ error: 'Missing required fields for Big 5 survey' });
    }

    const query = `
      INSERT INTO big5_results (extroversion, agreeableness, conscientiousness, neuroticism, openness)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.run(query, [extroversion, agreeableness, conscientiousness, neuroticism, openness], function (err) {
      if (err) {
        console.error('Database insert error:', err);
        return res.status(500).json({ error: 'Failed to save Big 5 survey results' });
      }
      res.json({ success: true, id: this.lastID, surveyType: 'big5' });
    });
  } else {
    return res.status(400).json({ error: 'Invalid survey type' });
  }
});

// GET endpoint to fetch aggregate statistics for political survey
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
    FROM political_results
  `;

  db.get(query, (err, row) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Failed to fetch political statistics' });
    }
    res.json(row || {});
  });
});

// GET endpoint to fetch all political results grouped by label
app.get('/api/labels', (req, res) => {
  const query = `
    SELECT 
      label,
      COUNT(*) as count,
      ROUND(AVG(liberty), 1) as avg_liberty,
      ROUND(AVG(economic), 1) as avg_economic,
      ROUND(AVG(social), 1) as avg_social,
      ROUND(AVG(change), 1) as avg_change
    FROM political_results
    GROUP BY label
    ORDER BY count DESC
  `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Failed to fetch political labels' });
    }
    res.json(rows || []);
  });
});

// GET endpoint to get user's percentile ranking for political survey
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
    FROM political_results
  `;

  db.get(query, [value], (err, row) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Failed to calculate political percentile' });
    }
    const percentile = row.total > 0 ? Math.round((row.below / row.total) * 100) : 0;
    res.json({ percentile, total_responses: row.total });
  });
});

// ====== BIG 5 SURVEY ENDPOINTS ======

// GET endpoint to fetch aggregate statistics for Big 5 survey
app.get('/api/big5/stats', (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as total_responses,
      ROUND(AVG(extroversion), 2) as avg_extroversion,
      ROUND(AVG(agreeableness), 2) as avg_agreeableness,
      ROUND(AVG(conscientiousness), 2) as avg_conscientiousness,
      ROUND(AVG(neuroticism), 2) as avg_neuroticism,
      ROUND(AVG(openness), 2) as avg_openness,
      ROUND(MIN(extroversion), 2) as min_extroversion,
      ROUND(MAX(extroversion), 2) as max_extroversion,
      ROUND(MIN(agreeableness), 2) as min_agreeableness,
      ROUND(MAX(agreeableness), 2) as max_agreeableness,
      ROUND(MIN(conscientiousness), 2) as min_conscientiousness,
      ROUND(MAX(conscientiousness), 2) as max_conscientiousness,
      ROUND(MIN(neuroticism), 2) as min_neuroticism,
      ROUND(MAX(neuroticism), 2) as max_neuroticism,
      ROUND(MIN(openness), 2) as min_openness,
      ROUND(MAX(openness), 2) as max_openness
    FROM big5_results
  `;

  db.get(query, (err, row) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Failed to fetch Big 5 statistics' });
    }
    res.json(row || {});
  });
});

// GET endpoint to get user's percentile ranking for Big 5 survey traits
app.get('/api/big5/percentile/:trait/:value', (req, res) => {
  const { trait, value } = req.params;
  const traitName = trait.toLowerCase();

  const validTraits = ['extroversion', 'agreeableness', 'conscientiousness', 'neuroticism', 'openness'];
  if (!validTraits.includes(traitName)) {
    return res.status(400).json({ error: 'Invalid trait' });
  }

  const query = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN ${traitName} <= ? THEN 1 ELSE 0 END) as below
    FROM big5_results
  `;

  db.get(query, [value], (err, row) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Failed to calculate Big 5 percentile' });
    }
    const percentile = row.total > 0 ? Math.round((row.below / row.total) * 100) : 0;
    res.json({ percentile, total_responses: row.total });
  });
});

// GET endpoint for all Big 5 results (for distribution analysis)
app.get('/api/big5/all', (req, res) => {
  const query = `
    SELECT 
      extroversion, 
      agreeableness, 
      conscientiousness, 
      neuroticism, 
      openness
    FROM big5_results
    LIMIT 1000
  `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Failed to fetch Big 5 results' });
    }
    res.json(rows || []);
  });
});

// ====== GENERAL ENDPOINTS ======

// GET endpoint for overall survey statistics
app.get('/api/survey-stats', (req, res) => {
  const politicalQuery = `SELECT COUNT(*) as count FROM political_results`;
  const big5Query = `SELECT COUNT(*) as count FROM big5_results`;

  db.get(politicalQuery, (err1, politicalRow) => {
    if (err1) {
      console.error('Database query error:', err1);
      return res.status(500).json({ error: 'Failed to fetch survey stats' });
    }

    db.get(big5Query, (err2, big5Row) => {
      if (err2) {
        console.error('Database query error:', err2);
        return res.status(500).json({ error: 'Failed to fetch survey stats' });
      }

      res.json({
        political_responses: politicalRow?.count || 0,
        big5_responses: big5Row?.count || 0,
        total_responses: (politicalRow?.count || 0) + (big5Row?.count || 0)
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
