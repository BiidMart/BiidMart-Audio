# Manual del Sistema Knowledge / RAG — BiidMart Audio

> **Versión:** 1.0 — Agosto 2026  
> **Propósito:** Documentar la administración y funcionamiento del Motor de Conocimiento (RAG) de BiidMart Audio.  
> **No incluye:** Panel administrativo, diseño React, CRM, catálogo multimedia.

---

## 1. QUÉ ES EL RAG ACTUAL

El sistema RAG (Retrieval-Augmented Generation) permite que Mateo, el asesor comercial IA, consulte información oficial del negocio antes de responder a los clientes. Mateo no improvisa precios, servicios ni políticas — busca la información en el Motor de Conocimiento.

### Flujo completo

```
Conocimiento (tabla knowledge)
        │
        ▼
knowledgeRepository.search() / searchSemantic()
        │
        ▼
knowledgeService.search()  ← búsqueda híbrida (semántica → ILIKE)
        │
        ▼
search-knowledge.tool.ts   ← herramienta del toolbelt
        │
        ▼
orchestrator.buildToolResultSummary()  ← formatea resultados
        │
        ▼
deepseekService.formulateResponse()    ← DeepSeek redacta respuesta
        │
        ▼
WhatsApp → respuesta de Mateo al cliente
```

- **Mateo NO tiene precios, enlaces ni políticas en su prompt.**  
- **Mateo consulta `search_knowledge` cuando necesita información del negocio.**  
- **Si el conocimiento no contiene la respuesta, Mateo no la inventa.**

---

## 2. ESTRUCTURA DEL CONOCIMIENTO

La tabla `knowledge` (creada por `src/config/migrations/002_redesign_knowledge.sql`) tiene la siguiente estructura:

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | UUID | Auto-generado | Identificador único |
| `title` | VARCHAR(200) | ✅ Sí (mín. 5 caracteres) | Título descriptivo |
| `content` | TEXT | ✅ Sí (mín. 10 caracteres) | Contenido. Lo que Mateo recupera y comunica |
| `category` | VARCHAR(100) | ✅ Sí | Categoría (ver lista abajo) |
| `content_type` | VARCHAR(50) | No (default: `text`) | Tipo: `text`, `audio_sample`, `image`, `video`, `file` |
| `tags` | TEXT[] | No (default: `{}`) | Array de palabras clave |
| `metadata` | JSONB | No (default: `{}`) | Datos extensibles (precios, URLs, pasos, etc.) |
| `embedding` | vector(1536) | No (auto-generado) | Vector semántico para búsqueda por similitud |
| `is_active` | BOOLEAN | No (default: `true`) | `false` = desactivado (soft delete) |
| `created_at` | TIMESTAMPTZ | Auto | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Auto | Fecha de última actualización |

### Categorías válidas (definidas en `knowledge.validator.ts`)

`pricing` | `process` | `examples` | `payments` | `faq` | `general` | `requirements` | `delivery`

### Tipos de contenido válidos

`text` | `audio_sample` | `image` | `video` | `file`

---

## 3. CÓMO CARGAR CONOCIMIENTO

### Endpoint

```
POST /api/knowledge
```

### Autenticación

```
Header: Authorization: Bearer <ADMIN_API_KEY>
```

### Body JSON

```json
{
  "title": "Título descriptivo del conocimiento",
  "content": "Contenido del conocimiento. Información concreta y clara.",
  "category": "pricing",
  "content_type": "text",
  "tags": ["tag1", "tag2"],
  "metadata": { "clave": "valor" }
}
```

### Campos obligatorios

- `title` — string, mínimo 5 caracteres
- `content` — string, mínimo 10 caracteres
- `category` — string, debe ser una de las categorías válidas

### Campos opcionales

- `content_type` — default: `"text"`
- `tags` — array de strings
- `metadata` — objeto JSON

### El embedding se genera AUTOMÁTICAMENTE al crear el conocimiento (si `OPENAI_API_KEY` está configurada).

---

### Ejemplos de conocimientos

> ⚠️ **Los precios, enlaces y políticas en estos ejemplos son FICTICIOS.**  
> Reemplazar con la información real de BiidMart Audio antes de cargar en producción.

#### Servicio (precio)

```powershell
$body = @{
  title = "Precio producción musical completa"
  content = "La producción musical completa tiene un costo de $XXX. Incluye: grabación de voz, producción de pista, mezcla profesional y mastering. Tiempo de entrega: 5-7 días hábiles. Incluye 2 revisiones gratuitas."
  category = "pricing"
  tags = @("precio", "produccion", "completa")
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/knowledge" `
  -Method Post `
  -Headers @{ "Authorization" = "Bearer $env:ADMIN_API_KEY"; "Content-Type" = "application/json" } `
  -Body $body
```

#### Promoción

```json
{
  "title": "Promoción primer proyecto 2026",
  "content": "Clientes nuevos obtienen 15% de descuento en su primer proyecto durante 2026. Válido para producción completa, mezcla o mastering. No acumulable con otras promociones.",
  "category": "pricing",
  "tags": ["promocion", "descuento", "nuevo", "2026"],
  "metadata": { "discount_percent": 15, "valid_until": "2026-12-31" }
}
```

#### Forma de pago

```json
{
  "title": "Métodos de pago aceptados",
  "content": "Aceptamos transferencia bancaria, Nequi, Daviplata y tarjetas de crédito/débito. El pago se divide en 30% de anticipo y 70% contra entrega del trabajo final.",
  "category": "payments",
  "tags": ["pago", "metodo", "anticipo", "transferencia"]
}
```

#### Enlace de pago

```json
{
  "title": "Enlace de pago anticipo 30%",
  "content": "El enlace para pagar el anticipo del 30% es: https://pay.example.com/biidmart/anticipo. El 70% restante se paga al recibir y aprobar el trabajo final.",
  "category": "payments",
  "tags": ["enlace", "pago", "anticipo"],
  "metadata": { "url": "https://pay.example.com/biidmart/anticipo", "percentage": 30 }
}
```

#### Proceso de trabajo

```json
{
  "title": "Proceso de producción musical",
  "content": "1. El cliente envía la letra y referencia de estilo. 2. Creamos la pista instrumental. 3. El cliente graba su voz (o nosotros la grabamos en estudio). 4. Realizamos mezcla profesional. 5. Realizamos mastering. 6. Entregamos el archivo final en formato WAV y MP3. El cliente tiene 2 revisiones gratuitas.",
  "category": "process",
  "tags": ["proceso", "pasos", "produccion", "trabajo"]
}
```

#### Requisitos del cliente

```json
{
  "title": "Requisitos para iniciar un proyecto",
  "content": "Para iniciar necesitamos: letra de la canción (si aplica), referencia de estilo o género musical, y el anticipo del 30%. Si el cliente va a grabar su voz, recomendamos usar un micrófono de buena calidad en un espacio sin ruido.",
  "category": "requirements",
  "tags": ["requisitos", "iniciar", "necesario", "cliente"]
}
```

#### Tiempo de entrega

```json
{
  "title": "Tiempos de entrega estimados",
  "content": "Producción completa: 5-7 días hábiles. Solo mezcla: 2-3 días hábiles. Solo mastering: 1-2 días hábiles. Los tiempos pueden variar según la complejidad del proyecto y la carga de trabajo actual.",
  "category": "delivery",
  "tags": ["tiempo", "entrega", "plazo", "demora"]
}
```

#### Entregables

```json
{
  "title": "Qué recibe el cliente al finalizar",
  "content": "El cliente recibe: archivo WAV (calidad profesional 24bit/48kHz), archivo MP3 (320kbps), stems de la mezcla (si se solicitaron), y factura. Todo se entrega por enlace de descarga.",
  "category": "delivery",
  "tags": ["entregable", "archivo", "formato", "WAV", "MP3"]
}
```

#### Política de revisiones

```json
{
  "title": "Política de revisiones",
  "content": "Cada proyecto incluye 2 revisiones gratuitas. Revisiones adicionales tienen un costo extra según el tipo de cambio solicitado. Cambios mayores (nueva pista, nueva letra) se consideran un nuevo proyecto.",
  "category": "general",
  "tags": ["revision", "politica", "cambio", "gratis"]
}
```

#### Garantía

```json
{
  "title": "Garantía de satisfacción",
  "content": "Trabajamos con el cliente hasta que quede satisfecho con el resultado. Si después de las revisiones incluidas el cliente no está conforme, revisamos el caso y buscamos una solución. No hacemos devoluciones una vez iniciado el trabajo de producción.",
  "category": "general",
  "tags": ["garantia", "satisfaccion", "devolucion"]
}
```

#### FAQ

```json
{
  "title": "¿Necesito saber de música para trabajar con ustedes?",
  "content": "No. Solo necesitas tener una idea de lo que quieres. Nosotros te guiamos en todo el proceso, desde la elección del estilo hasta la entrega final.",
  "category": "faq",
  "tags": ["faq", "conocimiento", "musica", "principiante"]
}
```

#### Objeción comercial — "Muy caro"

```json
{
  "title": "Manejo de objeción: precio elevado",
  "content": "Guía para manejar objeción de precio: Explicar que la producción profesional requiere equipo costoso, años de experiencia y tiempo dedicado. Comparar con el costo de un estudio tradicional (generalmente 3-5x más). Mencionar opciones de financiamiento o planes de pago si existen. Ofrecer mostrar ejemplos de calidad para justificar la inversión.",
  "category": "general",
  "tags": ["objecion", "precio", "caro", "objecion"]
}
```

---

## 4. REGLAS PARA ESCRIBIR BUEN CONOCIMIENTO

### Principios

1. **Una idea por conocimiento.** No mezclar precios, procesos y políticas en un solo registro.
2. **Contenido concreto y específico.** "Cuesta $XXX" es mejor que "tiene un precio competitivo".
3. **Evitar contradicciones.** Si dos conocimientos dicen cosas diferentes sobre el mismo tema, Mateo podría responder de forma inconsistente.
4. **Títulos descriptivos.** "Precio producción completa reggaetón" es mejor que "Precio 1".
5. **Usar tags útiles.** Los tags ayudan a filtrar. Usar palabras clave que un cliente usaría para buscar.
6. **Metadata para datos estructurados.** Precios, URLs, porcentajes, plazos → van en `metadata`, no solo en `content`.
7. **No inventar información.** Todo lo que se ponga en knowledge DEBE ser información verificada del negocio.
8. **Mantener actualizado.** Cambió un precio → actualizar el conocimiento. No crear uno nuevo y dejar el viejo activo.

### ¿Qué va en `content` vs `metadata`?

| `content` | `metadata` |
|---|---|
| Texto que Mateo leerá y usará para responder | Datos estructurados para filtros, cálculos o referencias |
| Explicación en lenguaje natural | Objeto JSON con campos específicos |
| Ej: "El precio es $XXX e incluye..." | Ej: `{ "price": 120000, "currency": "COP", "includes": ["mezcla", "mastering"] }` |

### Cuándo usar `tags`

- Palabras clave que un cliente podría mencionar: "precio", "regalado", "barato"
- Sinónimos: "costo", "valor", "tarifa"
- Temas relacionados: "producción", "grabación", "estudio"
- Los tags mejoran la búsqueda textual (ILIKE) y permiten filtros

---

## 5. EMBEDDINGS

### Configuración actual

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `OPENAI_API_KEY` | *(requerida)* | API key de OpenAI para generar embeddings |
| `EMBEDDING_PROVIDER` | `openai` | Proveedor de embeddings |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | Modelo que genera vectores de 1536 dimensiones |

### Comportamiento

- **Al CREAR conocimiento:** El servicio `knowledgeService.create()` genera automáticamente el embedding del `content` (si `OPENAI_API_KEY` está configurada). El vector se guarda en la columna `embedding`.
- **Al ACTUALIZAR el `content`:** El servicio `knowledgeService.update()` regenera automáticamente el embedding.
- **Si OpenAI no está disponible:** El conocimiento se guarda sin embedding. La búsqueda semántica no devolverá ese registro, pero la búsqueda textual (ILIKE) sí.
- **Si `OPENAI_API_KEY` no está configurada:** `embeddingService.isConfigured()` retorna `false`. El sistema funciona en modo solo-textual.

### Dónde se almacenan

Columna `embedding` de la tabla `knowledge`, tipo `vector(1536)`, usando la extensión `pgvector` de PostgreSQL.

---

## 6. BÚSQUEDA SEMÁNTICA

### Flujo

```
Pregunta del cliente: "¿Pueden hacer una canción con mi voz?"
        │
        ▼
embeddingService.generateEmbedding(pregunta)
  → POST https://api.openai.com/v1/embeddings
  ← vector de 1536 dimensiones
        │
        ▼
knowledgeRepository.searchSemantic(embedding, limit=5, threshold=0.5)
  → SELECT *, embedding <=> $embedding::vector AS _distance
    FROM knowledge
    WHERE is_active = true
      AND embedding IS NOT NULL
      AND embedding <=> $embedding::vector < 0.5
    ORDER BY _distance ASC LIMIT 5
        │
        ▼
Resultados ordenados por similitud (menor distancia = más relevante)
```

### Cosine distance (`<=>`)

- Operador de pgvector que mide la distancia coseno entre dos vectores.
- **0.0** = vectores idénticos (máxima similitud).
- **1.0** = vectores no relacionados.
- Umbral actual: **0.5**. Resultados con distancia ≥ 0.5 se descartan por ser poco relevantes.

### Qué ocurre cuando no encuentra resultados

1. Se intenta búsqueda semántica → 0 resultados.
2. **Fallback automático a búsqueda textual (ILIKE).**
3. Si ILIKE tampoco encuentra → Mateo responde que no tiene esa información.

---

## 7. FALLBACK TEXTUAL

### Búsqueda ILIKE

```sql
SELECT * FROM knowledge
WHERE is_active = true
  AND (title ILIKE '%query%' OR content ILIKE '%query%')
ORDER BY created_at DESC LIMIT 5
```

### Cuándo se usa

- `OPENAI_API_KEY` no está configurada (no hay embeddings).
- OpenAI devuelve error (timeout, rate limit, etc.).
- La búsqueda semántica retorna 0 resultados.
- La consulta no tiene `query` (solo filtros por categoría/tipo).

**La búsqueda textual no se elimina — es el fallback permanente.**

---

## 8. ACTUALIZAR CONOCIMIENTO

### Endpoint

```
PUT /api/knowledge/<id>
```

### Autenticación

```
Header: Authorization: Bearer <ADMIN_API_KEY>
```

### Body — modificar contenido

```json
{
  "content": "Nuevo contenido actualizado del conocimiento."
}
```

### Qué ocurre con el embedding

Si el campo `content` cambia, el servicio `knowledgeService.update()` regenera automáticamente el embedding. Si solo se cambian `tags` o `category`, el embedding no se regenera.

### Ejemplo PowerShell

```powershell
$body = @{
  content = "Precio actualizado: la producción completa ahora cuesta $YYY."
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/knowledge/EL-UUID-DEL-CONOCIMIENTO" `
  -Method Put `
  -Headers @{ "Authorization" = "Bearer $env:ADMIN_API_KEY"; "Content-Type" = "application/json" } `
  -Body $body
```

---

## 9. DESACTIVAR Y ELIMINAR

### Desactivar (soft delete)

```http
PUT /api/knowledge/<id>
Content-Type: application/json
Authorization: Bearer <ADMIN_API_KEY>

{ "is_active": false }
```

El conocimiento sigue en la base de datos pero no aparece en búsquedas (filtro `WHERE is_active = true`).

### Reactivar

```http
PUT /api/knowledge/<id>
Content-Type: application/json
Authorization: Bearer <ADMIN_API_KEY>

{ "is_active": true }
```

### Eliminar permanentemente

```http
DELETE /api/knowledge/<id>
Authorization: Bearer <ADMIN_API_KEY>
```

⚠️ Esta operación es irreversible. El registro se elimina de la base de datos.

### Ejemplo PowerShell — desactivar

```powershell
$body = @{ is_active = $false } | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/knowledge/EL-UUID" `
  -Method Put `
  -Headers @{ "Authorization" = "Bearer $env:ADMIN_API_KEY"; "Content-Type" = "application/json" } `
  -Body $body
```

---

## 10. CONSULTAR Y BUSCAR CONOCIMIENTO

### Listar todos

```http
GET /api/knowledge
Authorization: Bearer <ADMIN_API_KEY>
```

Retorna lista paginada. Query params: `?limit=50&offset=0`.

### Buscar por texto

```http
GET /api/knowledge/search?query=precio&category=pricing&limit=5
Authorization: Bearer <ADMIN_API_KEY>
```

Primero intenta búsqueda semántica. Si falla/no hay resultados, usa ILIKE.

### Consultar por ID

```http
GET /api/knowledge/<id>
Authorization: Bearer <ADMIN_API_KEY>
```

### Buscar por categoría

```http
GET /api/knowledge/category/pricing
Authorization: Bearer <ADMIN_API_KEY>
```

### Buscar por tipo de contenido

```http
GET /api/knowledge/content-type/text
Authorization: Bearer <ADMIN_API_KEY>
```

### Ejemplo PowerShell — buscar

```powershell
$headers = @{ "Authorization" = "Bearer $env:ADMIN_API_KEY" }
Invoke-RestMethod -Uri "http://localhost:3000/api/knowledge/search?query=precio&category=pricing" -Headers $headers
```

---

## 11. ADMIN_API_KEY

### Qué protege

Todos los endpoints bajo `/api/knowledge` requieren autenticación mediante `ADMIN_API_KEY`.

### Cómo autenticarse

```http
Authorization: Bearer <ADMIN_API_KEY>
```

### Dónde configurarla

- **Local:** Variable `ADMIN_API_KEY` en archivo `.env`.
- **Render:** Variable de entorno `ADMIN_API_KEY` en el dashboard de Render.
- **Si no está configurada:** El middleware `adminAuth` permite acceso sin autenticación (solo en desarrollo local). En producción DEBE configurarse.

### Ejemplo PowerShell con variable de entorno

```powershell
$env:ADMIN_API_KEY = "mi-api-key-secreta"
$headers = @{ "Authorization" = "Bearer $env:ADMIN_API_KEY" }
```

---

## 12. PRUEBAS

### Prueba local: `node test-semantic-search.js`

Este script verifica:

1. ✅ Extensión `pgvector` habilitada.
2. ✅ Crear conocimiento con embedding (1536 dimensiones).
3. ✅ Actualizar conocimiento y regenerar embedding.
4. ✅ Búsqueda semántica con pregunta equivalente ("¿Pueden hacer una canción utilizando mi propia voz?").
5. ✅ Búsqueda textual ILIKE como fallback.
6. ✅ Eliminación de datos de prueba.

**Requisito:** `OPENAI_API_KEY` debe estar configurada en `.env` para ejecutar esta prueba.

### Prueba en producción (Render)

> ⚠️ Reemplazar `TU_ADMIN_API_KEY` con el valor real configurado en Render.  
> ⚠️ Los datos de prueba deben eliminarse después de verificar.

```powershell
# Configurar variable
$base = "https://biidmart-audio.onrender.com"
$auth = @{ "Authorization" = "Bearer TU_ADMIN_API_KEY"; "Content-Type" = "application/json" }

# 1. Crear conocimiento de prueba
$body = @{
  title = "TEST_SEMANTICO_RENDER"
  content = "Clonación de voz profesional con IA. Creamos canciones completas usando tu propia voz."
  category = "general"
  tags = @("test", "verificacion")
} | ConvertTo-Json

$created = Invoke-RestMethod -Uri "$base/api/knowledge" -Method Post -Headers $auth -Body $body
Write-Host "Creado: $($created.id)"

# 2. Buscar semánticamente
$searchResult = Invoke-RestMethod -Uri "$base/api/knowledge/search?query=pueden hacer una cancion con mi propia voz" -Headers $auth
Write-Host "Resultados: $($searchResult.total)"

# 3. Actualizar
$updateBody = @{ content = "ACTUALIZADO: Servicio de clonación de voz con IA de última generación." } | ConvertTo-Json
Invoke-RestMethod -Uri "$base/api/knowledge/$($created.id)" -Method Put -Headers $auth -Body $updateBody
Write-Host "Actualizado"

# 4. Buscar de nuevo (debe encontrar el contenido actualizado)
$searchResult2 = Invoke-RestMethod -Uri "$base/api/knowledge/search?query=clonacion de voz IA" -Headers $auth
Write-Host "Resultados post-update: $($searchResult2.total)"

# 5. Desactivar
$deactivateBody = @{ is_active = $false } | ConvertTo-Json
Invoke-RestMethod -Uri "$base/api/knowledge/$($created.id)" -Method Put -Headers $auth -Body $deactivateBody
Write-Host "Desactivado"

# 6. Eliminar
Invoke-RestMethod -Uri "$base/api/knowledge/$($created.id)" -Method Delete -Headers $auth
Write-Host "Eliminado"
```

---

## 13. REGISTROS EXISTENTES SIN EMBEDDING

### Situación actual

Los conocimientos creados antes de la implementación de embeddings (o creados cuando `OPENAI_API_KEY` no estaba configurada) tienen `embedding = NULL`. Estos registros:

- ✅ Aparecen en búsquedas textuales (ILIKE).
- ❌ NO aparecen en búsquedas semánticas (pgvector filtra `WHERE embedding IS NOT NULL`).
- ❌ No se les genera embedding automáticamente (solo se genera en `create` y `update`).

### Cómo regenerar el embedding de un registro existente

Simplemente actualizar el registro enviando su mismo `content`. El servicio `knowledgeService.update()` detecta que el contenido cambió (o lo recibe de nuevo) y regenera el embedding:

```powershell
$body = @{
  content = "El mismo contenido que ya tiene el registro."
} | ConvertTo-Json

Invoke-RestMethod -Uri "$base/api/knowledge/EL-UUID" `
  -Method Put `
  -Headers $auth `
  -Body $body
```

Para regenerar TODOS los registros sin embedding, se puede ejecutar un script que:
1. Liste todos los conocimientos con `GET /api/knowledge`
2. Para cada uno donde `embedding` sea `null`, haga `PUT` enviando su mismo `content`

---

## 14. SOLUCIÓN DE PROBLEMAS

### `401 Unauthorized` o `403 Forbidden`

- **Causa:** `ADMIN_API_KEY` incorrecta o no enviada.
- **Solución:** Verificar que el header `Authorization: Bearer <ADMIN_API_KEY>` sea correcto. Si `ADMIN_API_KEY` no está configurada en el servidor, cualquier request pasa (solo en desarrollo).

### Embedding no generado

- **Causa:** `OPENAI_API_KEY` no configurada, inválida, o sin saldo.
- **Síntoma:** El conocimiento se crea pero `embedding` queda `NULL`. Las búsquedas semánticas no lo encuentran.
- **Solución:** Configurar `OPENAI_API_KEY` en `.env` (local) o en Render Dashboard (producción).
- **Recuperación:** Actualizar el conocimiento enviando su `content` de nuevo (el servicio regenerará el embedding).

### Búsqueda semántica sin resultados (pero OpenAI funciona)

- **Causa:** El umbral de distancia (0.5) es muy estricto, o la pregunta es muy diferente del contenido.
- **Solución:** El sistema automáticamente hace fallback a ILIKE. Si ILIKE tampoco encuentra, el contenido probablemente no existe o no es relevante.
- **Ajuste:** El umbral se puede modificar en `knowledgeRepository.searchSemantic()` (parámetro `threshold`).

### Error de OpenAI

- **Síntoma:** Log muestra `[Knowledge] Semantic search failed: ... Falling back to text search.`
- **Comportamiento:** El sistema automáticamente usa ILIKE como fallback. Mateo sigue funcionando.
- **No se rompe nada.** La búsqueda textual sigue activa.

### pgvector no habilitado

- **Síntoma:** Error al crear conocimiento con embedding o al ejecutar búsqueda semántica.
- **Verificación:** `SELECT 1 FROM pg_extension WHERE extname = 'vector'`
- **Solución:** Ejecutar `CREATE EXTENSION IF NOT EXISTS vector;` en la base de datos. La migración 002 ya intenta crearla, pero requiere permisos de superusuario.

### Variables de entorno faltantes en Render

- Verificar en Render Dashboard → Environment Variables:
  - `ADMIN_API_KEY`
  - `OPENAI_API_KEY`
  - `DATABASE_URL`
  - `DEEPSEEK_API_KEY`
  - (el resto de variables de WhatsApp, Supabase, etc.)

---

## 15. MANTENIMIENTO DEL RAG

### Cuando cambia un precio

1. **NO** modificar el System Prompt.
2. Buscar el conocimiento de ese precio: `GET /api/knowledge/search?query=precio&category=pricing`
3. Actualizar: `PUT /api/knowledge/<id>` con el nuevo `content`.
4. El embedding se regenera automáticamente.

### Cuando cambia un enlace de pago

1. Buscar: `GET /api/knowledge/search?query=enlace de pago&category=payments`
2. Actualizar el `content` y `metadata.url` con el nuevo enlace.

### Cuando se agrega un nuevo servicio

1. Crear nuevo conocimiento: `POST /api/knowledge` con `category: "pricing"` o la que corresponda.
2. Usar `tags` relevantes.
3. El embedding se genera automáticamente.

### Cuando se elimina un servicio o información

1. Desactivar: `PUT /api/knowledge/<id>` con `{ "is_active": false }`.
2. (Opcional) Eliminar permanentemente: `DELETE /api/knowledge/<id>`.

### PRECAUCIÓN: El conocimiento va en knowledge, NO en el System Prompt

El System Prompt (`src/agent/prompts/system-prompt.ts`) establece REGLAS DE COMPORTAMIENTO (cómo atender, qué herramientas usar, tono). NO contiene datos comerciales (precios, enlaces, servicios, políticas).

**Si se pone información comercial en el System Prompt, cada cambio requiere modificar código, commit y deploy.** Con el RAG, solo se actualiza la base de datos vía API.

### Cambiar el proveedor o modelo de embeddings

1. Actualizar variables de entorno: `EMBEDDING_PROVIDER` y `EMBEDDING_MODEL`.
2. Verificar que `embedding.service.ts` soporte el nuevo proveedor (actualmente solo `openai`).
3. Si el nuevo modelo tiene una dimensión diferente a 1536, se requiere:
   - Migración para cambiar `vector(1536)` a la nueva dimensión.
   - Regenerar TODOS los embeddings existentes.

---

**Fin del manual.**