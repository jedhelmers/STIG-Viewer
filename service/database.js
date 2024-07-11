const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('stigs.db');

const initDb = () => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS findings (
        checkid TEXT PRIMARY KEY,
        checktext TEXT,
        description TEXT,
        fixid TEXT,
        fixtext TEXT,
        iacontrols TEXT,
        id TEXT,
        ruleID TEXT,
        severity TEXT,
        title TEXT,
        version TEXT,
        userResponse TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS stigs (
        date TEXT,
        description TEXT,
        slug TEXT PRIMARY KEY,
        title TEXT,
        version TEXT,
        profiles TEXT,
        findings TEXT,
        FOREIGN KEY(findings) REFERENCES findings(checkid)
      )
    `);
  });
};

const insertData = (payload) => {
    const { stig } = payload;
    const findings = stig.findings;

    db.serialize(() => {
      // Insert findings
      const findingsStmt = db.prepare(`
        INSERT INTO findings (
          checkid, checktext, description, fixid, fixtext, iacontrols, id, ruleID, severity, title, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const key in findings) {
        const finding = findings[key];
        findingsStmt.run(
          finding.checkid, finding.checktext, finding.description, finding.fixid,
          finding.fixtext, finding.iacontrols, finding.id, finding.ruleID,
          finding.severity, finding.title, finding.version
        );
      }
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
};

module.exports = { db, initDb, insertData };
