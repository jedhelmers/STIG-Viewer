const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { db, initDb, insertData } = require('./database');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

initDb();

const insertFromJsonFile = (filename) => {
    fs.readFile(filename, 'utf8', (err, data) => {
      if (err) {
        console.error(`Error reading ${filename}: ${err}`);
        return;
      }

      const payload = JSON.parse(data);
      const { stig } = payload;
      const findings = stig.findings;

      db.serialize(() => {
        // Insert findings
        const findingsStmt = db.prepare(`
          INSERT INTO findings (
            checkid, checktext, description, fixid, fixtext, iacontrols, id, ruleID, severity, title, version
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        Object.keys(findings).forEach(key => {
          const finding = findings[key];
          findingsStmt.run(
            finding.checkid, finding.checktext, finding.description, finding.fixid,
            finding.fixtext, finding.iacontrols, finding.id, finding.ruleID,
            finding.severity, finding.title, finding.version
          );
        });

        findingsStmt.finalize();

        // Insert STIG
        const stigsStmt = db.prepare(`
          INSERT INTO stigs (
            date, description, slug, title, version, profiles, findings
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        stigsStmt.run(
          stig.date, stig.description, stig.slug, stig.title, stig.version,
          JSON.stringify(stig.profiles), Object.keys(findings).join(',')
        );

        stigsStmt.finalize();
      });
    });
};

// API endpoint to insert data from stigs.json
app.post('/api/upload', (req, res) => {
    insertFromJsonFile('./stigs.json');
    res.sendStatus(200);
});

app.get('/api/findings/:id', (req, res) => {
    const { id } = req.params

    const query = `
        SELECT * FROM findings
        WHERE id = ?
    `;

    db.get(query, [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(row);
    });
});

app.get('/api/findings', (req, res) => {
    const query = `
        SELECT * FROM findings
    `;

    db.all(query, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.get('/api/findingslist', (req, res) => {
    const query = `
        SELECT id, title, userResponse FROM findings
    `;

    db.all(query, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/findings', (req, res) => {
    const { userResponse, id } = req.body;

    const query = `
        UPDATE findings
        SET userResponse = ?
        WHERE id = ?;
    `;

    db.run(query, [userResponse, id], function(err) {
        if (err) {
            console.error('Error updating user response:', err);
            res.status(500).send('Failed to update user response');
        } else {
            console.log(`User response updated successfully for id ${id}`);
            res.status(200).send('User response updated successfully');
        }
    });
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
