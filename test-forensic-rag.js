require("dotenv").config();
const { Pool } = require("pg");
const OpenAI = require("openai");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const c = await pool.connect();
  try {
    console.log("=== AUDITORÍA FORENSE — CONTENIDO DE KNOWLEDGE ===\n");

    // 1. Obtener contenido completo de "Pagos y enlaces de Clonación de Voz"
    const { rows } = await c.query(
      "SELECT id, title, content, LENGTH(content) AS len, tags FROM knowledge WHERE is_active = true ORDER BY category, title"
    );

    console.log("=== CONOCIMIENTOS ACTIVOS (longitud real) ===\n");
    for (const r of rows) {
      console.log(`[${r.id.slice(0,8)}] ${r.title} — ${r.len} caracteres`);
    }

    console.log("\n\n=== CONTENIDO COMPLETO DE 'Pagos y enlaces de Clonación de Voz' ===\n");
    const pagos = rows.find(r => r.title.includes("Pagos y enlaces"));
    if (pagos) {
      console.log("Longitud total:", pagos.len, "caracteres");
      console.log("---CONTENIDO COMPLETO---");
      console.log(pagos.content);
      console.log("\n---TRUNCADO A 300 CARACTERES---");
      console.log(pagos.content.substring(0, 300) + "...");
      console.log("\n---DATOS CLAVE---");
      console.log("¿Contiene enlace Wompi?", pagos.content.includes("wompi"));
      console.log("¿Contiene 'HFAeOR'?", pagos.content.includes("HFAeOR"));
      console.log("¿Contiene '300 4016256'?", pagos.content.includes("300 4016256"));
      console.log("¿Contiene 'Iván Orozco'?", pagos.content.includes("Iv"));
      
      // Verificar después del truncamiento
      const truncated = pagos.content.substring(0, 300);
      console.log("\nTRAS TRUNCAR A 300 CHARS:");
      console.log("¿Contiene enlace Wompi?", truncated.includes("wompi"));
      console.log("¿Contiene 'HFAeOR'?", truncated.includes("HFAeOR"));
      console.log("¿Contiene '300 4016256'?", truncated.includes("300 4016256"));
      console.log("Últimos 100 chars del truncado:", truncated.slice(-100));
    }

    // 2. Simular búsqueda semántica con diferentes queries
    console.log("\n\n=== SIMULACIÓN DE BÚSQUEDA SEMÁNTICA ===\n");
    
    const testQueries = [
      "¿cuánto cuesta?",
      "¿cómo pago?",
      "dame el enlace de pago",
      "número de Nequi",
      "¿qué me entregan?",
      "¿cómo funciona?",
      "¿tengo que entregar la acapella?",
    ];

    if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      for (const query of testQueries) {
        console.log(`\nQuery: "${query}"`);
        
        // Generar embedding de la query
        const emb = await openai.embeddings.create({ model: "text-embedding-3-small", input: query });
        const vec = emb.data[0].embedding;
        
        // Búsqueda semántica
        const semantic = await c.query(
          `SELECT id, title, category, embedding <=> $1::vector AS distance
           FROM knowledge
           WHERE is_active = true AND embedding IS NOT NULL
           ORDER BY distance ASC LIMIT 3`,
          [JSON.stringify(vec)]
        );
        
        console.log("  Resultados semánticos:");
        for (const r of semantic.rows) {
          console.log(`    [${r.category}] ${r.title} (dist: ${r.distance.toFixed(4)})`);
        }
      }
    } else {
      console.log("  (OPENAI_API_KEY no configurada — saltando búsqueda semántica)");
    }

    // 3. Simular búsqueda textual (ILIKE) — el fallback
    console.log("\n\n=== SIMULACIÓN DE BÚSQUEDA TEXTUAL (ILIKE) ===\n");
    for (const query of testQueries) {
      console.log(`\nQuery: "${query}"`);
      const textSearch = await c.query(
        `SELECT id, title, category
         FROM knowledge
         WHERE is_active = true
           AND (title ILIKE $1 OR content ILIKE $1)
         ORDER BY created_at DESC LIMIT 3`,
        [`%${query}%`]
      );
      if (textSearch.rows.length === 0) {
        console.log("  Sin resultados ILIKE directos");
      } else {
        for (const r of textSearch.rows) {
          console.log(`    [${r.category}] ${r.title}`);
        }
      }
      
      // Búsqueda por tags
      const tagWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      if (tagWords.length > 0) {
        const tagSearch = await c.query(
          `SELECT id, title, category, tags
           FROM knowledge
           WHERE is_active = true AND tags && $1::text[]
           LIMIT 3`,
          [tagWords]
        );
        if (tagSearch.rows.length > 0) {
          console.log("  Por tags:");
          for (const r of tagSearch.rows) {
            console.log(`    [${r.category}] ${r.title} — tags: ${(r.tags||[]).slice(0,5).join(", ")}`);
          }
        }
      }
    }

  } finally {
    c.release();
    await pool.end();
  }
})();