// Script para probar el endpoint de upload de conocimiento
const fs = require("fs");
const path = require("path");

async function testUpload() {
  const filePath = path.join(__dirname, "test-knowledge.txt");
  const fileBuffer = fs.readFileSync(filePath);
  
  // Construir manualmente un multipart/form-data
  const boundary = "----TestBoundary" + Date.now();
  const CRLF = "\r\n";
  
  let body = "";
  body += "--" + boundary + CRLF;
  body += 'Content-Disposition: form-data; name="file"; filename="test-knowledge.txt"' + CRLF;
  body += "Content-Type: text/plain" + CRLF + CRLF;
  
  const bodyStart = Buffer.from(body);
  const bodyEnd = Buffer.from(CRLF + "--" + boundary + CRLF);
  body += 'Content-Disposition: form-data; name="category"' + CRLF + CRLF;
  body += "pricing" + CRLF;
  body += "--" + boundary + CRLF;
  body += 'Content-Disposition: form-data; name="tags"' + CRLF + CRLF;
  body += "precio,proceso,pago" + CRLF;
  body += "--" + boundary + "--" + CRLF;

  // Reconstruir con buffers
  const preFile = Buffer.from(
    "--" + boundary + CRLF +
    'Content-Disposition: form-data; name="file"; filename="test-knowledge.txt"' + CRLF +
    "Content-Type: text/plain" + CRLF + CRLF
  );
  
  const mid = Buffer.from(
    CRLF + "--" + boundary + CRLF +
    'Content-Disposition: form-data; name="category"' + CRLF + CRLF +
    "pricing" + CRLF +
    "--" + boundary + CRLF +
    'Content-Disposition: form-data; name="tags"' + CRLF + CRLF +
    "precio,proceso,pago" + CRLF +
    "--" + boundary + "--" + CRLF
  );

  const fullBody = Buffer.concat([preFile, fileBuffer, mid]);

  const response = await fetch("http://localhost:3001/api/knowledge/upload", {
    method: "POST",
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body: fullBody,
  });

  const data = await response.json();
  console.log(`Status: ${response.status}`);
  console.log(JSON.stringify(data, null, 2));
}

testUpload().catch(console.error);