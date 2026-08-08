require("dotenv").config();
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const c = await pool.connect();
  try {
    // 1. Verificar cuántos registros existen
    const count = await c.query(
      "SELECT COUNT(*)::int AS cnt FROM knowledge WHERE is_active = true"
    );
    console.log("Knowledge records (active):", count.rows[0].cnt);

    // 2. Crear conocimiento de prueba
    const insert = await c.query(
      `INSERT INTO knowledge (title, content, content_type, category, tags, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING
       RETURNING id, title`,
      [
        "TEST_RAG_BIIDMART",
        "Este es un conocimiento temporal utilizado unicamente para verificar el funcionamiento del RAG en BiidMart Audio.",
        "text",
        "general",
        ["test", "rag", "verificacion"],
        JSON.stringify({ purpose: "test", temporary: true }),
      ]
    );
    console.log("INSERT result:", insert.rows[0]);

    // 3. Buscar el conocimiento creado (simulando search_knowledge)
    const search = await c.query(
      `SELECT id, title, content, category, tags
       FROM knowledge
       WHERE is_active = true
         AND (title ILIKE $1 OR content ILIKE $1)
       LIMIT 5`,
      ["%TEST_RAG%"]
    );
    console.log(
      "SEARCH result:",
      search.rows.map((r) => ({ id: r.id, title: r.title }))
    );

    // 4. Actualizar el conocimiento de prueba
    const update = await c.query(
      `UPDATE knowledge SET content = $1, updated_at = NOW() WHERE title = $2 AND is_active = true RETURNING id, title, content`,
      [
        "CONOCIMIENTO ACTUALIZADO: El RAG funciona correctamente en BiidMart Audio. La busqueda textual con ILIKE encuentra correctamente los fragmentos de conocimiento.",
        "TEST_RAG_BIIDMART",
      ]
    );
    console.log("UPDATE:", update.rows[0]?.title, "→ updated");

    // 5. Verificar búsqueda después de update
    const search2 = await c.query(
      `SELECT id, title, content
       FROM knowledge
       WHERE is_active = true AND title ILIKE $1
       LIMIT 1`,
      ["%TEST_RAG%"]
    );
    console.log("SEARCH after update:", search2.rows[0]?.content?.substring(0, 80));

    // 6. Desactivar (soft delete)
    const deactivate = await c.query(
      `UPDATE knowledge SET is_active = false, updated_at = NOW() WHERE title = $1 RETURNING is_active`,
      ["TEST_RAG_BIIDMART"]
    );
    console.log("DEACTIVATE: is_active =", deactivate.rows[0]?.is_active);

    // 7. Eliminar permanentemente
    await c.query("DELETE FROM knowledge WHERE title = $1", [
      "TEST_RAG_BIIDMART",
    ]);
    console.log("DELETE: removed permanently");
  } finally {
    c.release();
    await pool.end();
  }
})();