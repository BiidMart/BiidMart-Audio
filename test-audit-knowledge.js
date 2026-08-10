require("dotenv").config();
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const c = await pool.connect();
  try {
    const { rows } = await c.query(
      "SELECT id, title, category, tags, is_active FROM knowledge ORDER BY category, title"
    );
    console.log("=== ACTIVE KNOWLEDGE ===");
    for (const r of rows) {
      console.log(`[${r.category}] ${r.title} (active: ${r.is_active})`);
      console.log(`  tags: ${(r.tags || []).join(", ")}`);
    }
    console.log(`\nTotal: ${rows.length} records`);
  } finally {
    c.release();
    await pool.end();
  }
})();