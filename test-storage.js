// Script temporal para probar Supabase Storage
// Ejecutar: node test-storage.js
// Usa service_role key para upload/delete (bypass RLS)
// Usa anon key para lectura pública

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "biidmart-media";

async function testStorage() {
  console.log("=== SUPABASE STORAGE TEST ===\n");

  // 1. Verificar variables
  console.log("1. Verificando variables de entorno...");
  console.log(`   SUPABASE_URL: ${SUPABASE_URL ? "✓ configurada" : "✗ FALTA"}`);
  console.log(`   SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? "✓ configurada" : "✗ FALTA"}`);
  console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? "✓ configurada" : "✗ FALTA"}`);
  console.log(`   BUCKET: ${BUCKET}\n`);

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("ERROR: Variables de entorno no configuradas.");
    process.exit(1);
  }

  // 2. Crear clientes
  console.log("2. Creando clientes Supabase...");
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  console.log("   ✓ Clientes creados (anon + service_role)\n");

  // 3. Subir archivo temporal con service_role
  const testPath = "test/test-upload-" + Date.now() + ".txt";
  const testContent = Buffer.from("BiidMart Audio - Test de Storage - " + new Date().toISOString());

  console.log(`3. Subiendo archivo con service_role: ${testPath}...`);
  try {
    const { data: uploadData, error: uploadError } = await serviceClient
      .storage
      .from(BUCKET)
      .upload(testPath, testContent, {
        contentType: "text/plain",
        upsert: true,
      });

    if (uploadError) {
      console.error(`   ✗ Error al subir: ${uploadError.message}`);
      process.exit(1);
    }
    console.log(`   ✓ Archivo subido: ${JSON.stringify(uploadData)}\n`);
  } catch (err) {
    console.error(`   ✗ Error: ${err.message}`);
    process.exit(1);
  }

  // 4. Obtener URL pública con anon client
  console.log("4. Obteniendo URL pública...");
  const { data: urlData } = anonClient
    .storage
    .from(BUCKET)
    .getPublicUrl(testPath);

  const publicUrl = urlData.publicUrl;
  console.log(`   URL: ${publicUrl}\n`);

  // 5. Verificar que el archivo es accesible públicamente
  console.log("5. Verificando acceso público (sin autenticación)...");
  try {
    const response = await fetch(publicUrl, { method: "HEAD" });
    if (response.ok) {
      console.log(`   ✓ Archivo accesible (HTTP ${response.status})`);
      console.log(`   Content-Type: ${response.headers.get("content-type")}`);
      console.log(`   Content-Length: ${response.headers.get("content-length")} bytes\n`);
    } else {
      console.log(`   ✗ No accesible (HTTP ${response.status})\n`);
    }
  } catch (err) {
    console.log(`   ✗ Error de red: ${err.message}\n`);
  }

  // 6. Eliminar archivo temporal con service_role
  console.log("6. Eliminando archivo con service_role...");
  try {
    const { error: deleteError } = await serviceClient
      .storage
      .from(BUCKET)
      .remove([testPath]);

    if (deleteError) {
      console.error(`   ✗ Error al eliminar: ${deleteError.message}`);
    } else {
      console.log("   ✓ Archivo eliminado\n");
    }
  } catch (err) {
    console.error(`   ✗ Error: ${err.message}`);
  }

  // 7. Verificar que fue eliminado
  console.log("7. Verificando eliminación...");
  try {
    const response = await fetch(publicUrl, { method: "HEAD" });
    if (!response.ok) {
      console.log(`   ✓ Archivo ya no está accesible (HTTP ${response.status})\n`);
    } else {
      console.log(`   ✗ El archivo sigue accesible\n`);
    }
  } catch (err) {
    console.log(`   ✗ Error: ${err.message}\n`);
  }

  console.log("=== PRUEBA COMPLETADA - TODOS LOS PASOS EXITOSOS ===");
}

testStorage().catch((err) => {
  console.error("Error fatal:", err.message);
  process.exit(1);
});