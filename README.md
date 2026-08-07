# BiidMart Audio

Plataforma privada para automatizar la atención comercial de una empresa de producción musical mediante Inteligencia Artificial.

## Descripción

BiidMart Audio es una herramienta interna diseñada exclusivamente para reducir el tiempo invertido en responder cientos de mensajes repetitivos en WhatsApp. Los clientes llegan principalmente desde campañas de Meta Ads y realizan preguntas recurrentes sobre funcionamiento, precios, inclusiones, tiempos de entrega, formas de pago y ejemplos de trabajos anteriores.

Una Inteligencia Artificial atiende automáticamente aproximadamente el 95% de las conversaciones. El asesor humano únicamente interviene cuando el cliente está listo para comprar o cuando la IA no puede responder correctamente.

## Objetivo

- **Ahorrar tiempo** en atención comercial repetitiva.
- **Generar confianza** en clientes potenciales.
- **Aumentar conversiones** de ventas.
- **Dar atención profesional** automatizada.
- **Mantener una experiencia humana** en cada interacción.

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Backend | Node.js + Express.js + TypeScript |
| Base de datos | PostgreSQL (+ pgvector en el futuro) |
| IA | DeepSeek API |
| Canal principal | WhatsApp Cloud API |
| Frontend (futuro) | Next.js + React + TailwindCSS |
| Hosting Backend | Render |
| Hosting Frontend | Vercel |

## Arquitectura

El Backend es el centro absoluto del proyecto. Toda la inteligencia del sistema vive en él y toda integración futura deberá conectarse al Backend.

```
Landing Page → WhatsApp → Backend → PostgreSQL → DeepSeek
```

### Patrón de diseño: MVC

```
Request → Routes → Controllers → Services → Repositories → Database
                                      ↓
                                   Models
```

- **Controllers**: Reciben y responden peticiones HTTP. Sin lógica de negocio.
- **Services**: Contienen toda la lógica de negocio.
- **Repositories**: Acceso a datos y consultas a la base de datos.
- **Models**: Definiciones de entidades y esquemas.
- **Routes**: Definición de endpoints y vinculación con controllers.
- **Middlewares**: Capa transversal (seguridad, logging, manejo de errores).
- **Config**: Variables de entorno y configuración general.
- **Utils**: Funciones auxiliares y herramientas compartidas.
- **Types**: Interfaces y tipos TypeScript.

## Estructura de Carpetas

```
BiidMart-Audio/
├── docs/
│   └── master-contex.md          # Documento maestro del proyecto
├── src/
│   ├── config/
│   │   └── env.ts                # Configuración de variables de entorno
│   ├── controllers/
│   │   └── health.controller.ts  # Controladores de health check y root
│   ├── services/                 # Lógica de negocio (próximas fases)
│   ├── repositories/             # Acceso a datos (próximas fases)
│   ├── models/                   # Entidades y esquemas (próximas fases)
│   ├── routes/
│   │   └── index.ts              # Definición de rutas
│   ├── middlewares/
│   │   ├── error-handler.ts      # Manejo global de errores
│   │   └── not-found.ts          # Middleware 404
│   ├── utils/
│   │   └── logger.ts             # Logger profesional con Winston
│   ├── types/
│   │   ├── env.interface.ts      # Interfaz de variables de entorno
│   │   └── health.interface.ts   # Interfaces de respuestas
│   ├── app.ts                    # Configuración de Express
│   └── server.ts                 # Punto de entrada del servidor
├── dist/                         # Código compilado (TypeScript → JavaScript)
├── .env                          # Variables de entorno (no se versiona)
├── .env.example                  # Template de variables de entorno
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Requisitos

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0

## Instalación

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd BiidMart-Audio

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con los valores correspondientes

# 4. Compilar el proyecto
npm run build

# 5. Ejecutar en producción
npm start
```

## Variables de Entorno

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `NODE_ENV` | Entorno de ejecución | `development` |
| `PORT` | Puerto del servidor | `3000` |
| `CORS_ORIGIN` | Origen permitido para CORS | `*` |
| `LOG_LEVEL` | Nivel de logging (Winston) | `info` |

## Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Levanta el servidor en modo desarrollo con hot-reload |
| `npm run build` | Compila TypeScript a JavaScript en `dist/` |
| `npm start` | Ejecuta la versión compilada en producción |
| `npm run type-check` | Verifica tipos de TypeScript sin compilar |

## Cómo Ejecutar el Proyecto

### Desarrollo

```bash
npm run dev
```

El servidor se levantará en `http://localhost:3000` y se reiniciará automáticamente al detectar cambios en el código fuente.

### Producción

```bash
npm run build
npm start
```

### Verificar endpoints

```bash
# Endpoint raíz
curl http://localhost:3000/
# Respuesta: { "message": "BiidMart Audio API" }

# Health check
curl http://localhost:3000/health
# Respuesta: { "status": "ok" }
```

## Estado Actual del Proyecto

### ✅ FASE 1 - COMPLETADA

**Backend Base** completamente funcional:

- [x] Estructura MVC profesional
- [x] TypeScript configurado con strict mode
- [x] Express.js con middlewares esenciales
- [x] CORS configurado
- [x] Helmet para seguridad HTTP
- [x] Morgan para logging de peticiones
- [x] Logger profesional con Winston
- [x] Manejo global de errores
- [x] Middleware 404
- [x] Variables de entorno tipadas
- [x] Scripts de desarrollo, build y producción
- [x] Endpoints `GET /` y `GET /health` funcionales

### ⏳ FASE 2 - Pendiente

Integración de PostgreSQL.

---

**Nota:** Este proyecto sigue una filosofía de desarrollo modular. No se avanza a la siguiente fase hasta que la fase actual esté completamente terminada y verificada.