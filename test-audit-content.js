require("dotenv").config();
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const c = await pool.connect();
  try {
    const { rows } = await c.query(
      "SELECT id, title, category, content, tags, metadata FROM knowledge WHERE is_active = true ORDER BY category, title"
    );
    for (const r of rows) {
      console.log("=".repeat(60));
      console.log(`ID: ${r.id}`);
      console.log(`[${r.category}] ${r.title}`);
      console.log(`Tags: ${(r.tags || []).join(", ")}`);
      console.log(`Metadata: ${JSON.stringify(r.metadata)}`);
      console.log("---CONTENT---");
      console.log(r.content);
      console.log("");
    }
  } finally {
    c.release();
    await pool.end();
  }
})();