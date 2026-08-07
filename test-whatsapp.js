// Script para probar envío real a WhatsApp Cloud API
// Ejecutar: node test-whatsapp.js

require("dotenv").config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const TO = "573004016256"; // Número de destino
const API_VERSION = "v21.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

async function sendMessage(type, payload) {
  const body = {
    messaging_product: "whatsapp",
    to: TO,
    type,
    ...payload,
  };

  console.log(`\nEnviando ${type}...`);
  console.log(`URL: ${BASE_URL}`);
  console.log(`Body: ${JSON.stringify(body, null, 2)}`);

  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  console.log(`Status: ${response.status}`);
  console.log(`Response: ${JSON.stringify(data, null, 2)}`);
  return { ok: response.ok, data };
}

async function main() {
  console.log("=== WHATSAPP CLOUD API TEST ===\n");

  // Prueba 1: Enviar texto
  console.log("--- Prueba 1: Enviar mensaje de texto ---");
  const r1 = await sendMessage("text", {
    text: { body: "¡Hola! 🎵 Soy BiidMart Audio. Esta es una prueba de integración con WhatsApp Cloud API.", preview_url: false },
  });

  if (!r1.ok) {
    console.log("\n✗ Prueba 1 falló. Revisa el token y el número de teléfono.");
    console.log("Posibles causas:");
    console.log("  - El número de destino no está en la lista de test numbers de Meta");
    console.log("  - El token expiró o no es válido");
    console.log("  - El PHONE_NUMBER_ID no es correcto");
  } else {
    console.log("\n✓ Prueba 1 exitosa: Mensaje de texto enviado.");
  }

  // Prueba 2: Enviar audio desde Supabase Storage
  console.log("\n--- Prueba 2: Enviar mensaje de audio ---");
  const audioUrl = "https://cdkjofomhxkfysrfaoij.supabase.co/storage/v1/object/public/biidmart-media/audio/demos/test-audio.mp3";
  const r2 = await sendMessage("audio", {
    audio: { link: audioUrl },
  });

  if (!r2.ok) {
    console.log("\n✗ Prueba 2 falló. Posiblemente el archivo no existe en Storage.");
  } else {
    console.log("\n✓ Prueba 2 exitosa: Audio enviado.");
  }

  console.log("\n=== PRUEBAS COMPLETADAS ===");
}

main().catch(console.error);