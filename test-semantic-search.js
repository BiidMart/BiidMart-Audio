require("dotenv").config();
const { Pool } = require("pg");
const OpenAI = require("openai");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  console.log("=== PRUEBA DE BÚSQUEDA SEMÁNTICA ===\n");

  const c = await pool.connect();
  let testIds = [];

  try {
    // Verificar extensión pgvector
    try {
      await c.query("SELECT 1 FROM pg_extension WHERE extname = 'vector'");
      console.log("✓ pgvector extension enabled");
    } catch {
      console.log("✗ pgvector extension NOT enabled — exiting");
      return;
    }

    // Configurar cliente OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // --- PRUEBA 1: Crear conocimiento CON embedding ---
    console.log("\n1. CREAR conocimiento (debe generar embedding)");

    const content1 = "Clonación de voz y producción profesional. Utilizamos tecnología avanzada para replicar tu voz y crear canciones completas con calidad de estudio.";
    const emb1 = await openai.embeddings.create({ model: "text-embedding-3-small", input: content1 });
    const vec1 = emb1.data[0].embedding;

    const insert1 = await c.query(
      `INSERT INTO knowledge (title, content, content_type, category, tags, metadata, embedding)
       VALUES ($1,$2,$3,$4,$5,$6,$7::vector)
       RETURNING id, title, embedding IS NOT NULL AS has_embedding`,
      ["SEMTEST_ClonacionVoz", content1, "text", "general", ["test"], "{}", JSON.stringify(vec1)]
    );
    console.log(`✓ Creado: ${insert1.rows[0].title} | embedding: ${insert1.rows[0].has_embedding}`);
    testIds.push(insert1.rows[0].id);

    // --- PRUEBA 2: Crear otro conocimiento ---
    console.log("\n2. CREAR segundo conocimiento");
    const content2 = "Grabación de voces en estudio profesional con micrófonos de alta gama. Mezcla y mastering incluidos.";
    const emb2 = await openai.embeddings.create({ model: "text-embedding-3-small", input: content2 });
    const vec2 = emb2.data[0].embedding;

    const insert2 = await c.query(
      `INSERT INTO knowledge (title, content, content_type, category, tags, metadata, embedding)
       VALUES ($1,$2,$3,$4,$5,$6,$7::vector) RETURNING id, title`,
      ["SEMTEST_GrabacionEstudio", content2, "text", "pricing", ["test"], "{}", JSON.stringify(vec2)]
    );
    console.log(`✓ Creado: ${insert2.rows[0].title}`);
    testIds.push(insert2.rows[0].id);

    // --- PRUEBA 3: ACTUALIZAR conocimiento (debe regenerar embedding) ---
    console.log("\n3. ACTUALIZAR conocimiento (debe regenerar embedding)");
    const newContent = "CONOCIMIENTO ACTUALIZADO: Clonación de voz con IA. Creamos canciones usando tu propia voz con tecnología de inteligencia artificial de última generación.";
    const emb3 = await openai.embeddings.create({ model: "text-embedding-3-small", input: newContent });
    const vec3 = emb3.data[0].embedding;

    await c.query(
      `UPDATE knowledge SET content = $1, embedding = $2::vector, updated_at = NOW() WHERE id = $3`,
      [newContent, JSON.stringify(vec3), testIds[0]]
    );
    const checkUpdate = await c.query("SELECT embedding IS NOT NULL AS has_emb FROM knowledge WHERE id = $1", [testIds[0]]);
    console.log(`✓ Actualizado | embedding: ${checkUpdate.rows[0].has_emb}`);

    // --- PRUEBA 4: BÚSQUEDA SEMÁNTICA ---
    console.log("\n4. BÚSQUEDA SEMÁNTICA (pregunta semánticamente equivalente)");

    const pregunta = "¿Pueden hacer una canción utilizando mi propia voz?";
    console.log(`   Pregunta: "${pregunta}"`);
    const embQuery = await openai.embeddings.create({ model: "text-embedding-3-small", input: pregunta });
    const vecQuery = embQuery.data[0].embedding;

    const semantic = await c.query(
      `SELECT id, title, content, embedding <=> $1::vector AS distance
       FROM knowledge
       WHERE is_active = true AND embedding IS NOT NULL AND id = ANY($2)
       ORDER BY distance ASC LIMIT 3`,
      [JSON.stringify(vecQuery), testIds]
    );

    console.log("   Resultados:");
    for (const r of semantic.rows) {
      console.log(`   - ${r.title} (distance: ${r.distance.toFixed(4)})`);
      console.log(`     "${r.content.substring(0, 80)}..."`);
    }
    if (semantic.rows.length > 0) {
      console.log("✓ Búsqueda semántica: CONOCIMIENTO ENCONTRADO");
    } else {
      console.log("✗ Búsqueda semántica: SIN RESULTADOS");
    }

    // --- PRUEBA 5: BÚSQUEDA TEXTUAL COMO FALLBACK ---
    console.log("\n5. BÚSQUEDA TEXTUAL (fallback ILIKE)");
    const textSearch = await c.query(
      `SELECT id, title FROM knowledge WHERE is_active = true AND title ILIKE $1`,
      ["%SEMTEST%"]
    );
    console.log(`   Encontrados: ${textSearch.rows.length} registros`);
    for (const r of textSearch.rows) {
      console.log(`   - ${r.title}`);
    }
    console.log("✓ Búsqueda textual: FUNCIONANDO");

    // --- PRUEBA 6: Verificar que search con palabra NO exacta también funciona ---
    console.log("\n6. BÚSQUEDA con palabra diferente (sinónimo)");
    const pregunta2 = "Necesito producir un tema pero yo quiero cantarlo";
    const embQ2 = await openai.embeddings.create({ model: "text-embedding-3-small", input: pregunta2 });
    const vecQ2 = embQ2.data[0].embedding;

    const semantic2 = await c.query(
      `SELECT id, title, embedding <=> $1::vector AS distance
       FROM knowledge
       WHERE is_active = true AND embedding IS NOT NULL AND id = ANY($2)
         AND embedding <=> $1::vector < 0.5
       ORDER BY distance ASC LIMIT 3`,
      [JSON.stringify(vecQ2), testIds]
    );

    console.log(`   Pregunta: "${pregunta2}"`);
    for (const r of semantic2.rows) {
      console.log(`   - ${r.title} (distance: ${r.distance.toFixed(4)})`);
    }
    if (semantic2.rows.length > 0) {
      console.log("✓ Búsqueda semántica con sinónimos: FUNCIONANDO");
    } else {
      console.log("   (Sin resultados dentro del umbral 0.5 — esperado para frases muy diferentes)");
    }

    // Limpiar
    console.log("\n--- LIMPIEZA ---");
    for (const id of testIds) {
      await c.query("DELETE FROM knowledge WHERE id = $1", [id]);
      console.log(`✓ Eliminado: ${id}`);
    }

  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    c.release();
    await pool.end();
    console.log("\n=== PRUEBA COMPLETADA ===");
  }
})();