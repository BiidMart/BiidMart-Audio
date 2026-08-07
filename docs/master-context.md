# MASTER CONTEXT
# Proyecto:BiidMart-Audio
# Versión: 1.0

# DESCRIPCIÓN GENERAL

Este proyecto consiste en desarrollar una plataforma privada para automatizar la atención comercial de mi empresa de producción musical mediante Inteligencia Artificial.

No es un chatbot tradicional.

No es un SaaS.

No es un CRM.

No es una plataforma para vender a otras empresas.

Es una herramienta interna diseñada exclusivamente para mi negocio.

Su objetivo principal es reducir el tiempo que invierto respondiendo cientos de mensajes repetitivos en WhatsApp.

Actualmente los clientes llegan principalmente desde campañas de Meta Ads.

Muchos preguntan exactamente las mismas cosas:

- ¿Cómo funciona?
- ¿Cuánto cuesta?
- ¿Qué incluye?
- ¿Cuánto demora?
- ¿Cómo pago?
- ¿Puedo escuchar ejemplos?
- ¿Qué necesito enviar?

La mayoría nunca compra.

Por esa razón quiero que una Inteligencia Artificial atienda automáticamente aproximadamente el 95% de las conversaciones.

El asesor humano únicamente debe intervenir cuando el cliente ya esté listo para comprar o cuando la IA no pueda responder correctamente.

El objetivo principal de todo el proyecto es:

- Ahorrar tiempo.
- Generar confianza.
- Aumentar conversiones.
- Dar una atención profesional.
- Mantener una experiencia humana.

Nunca construir funcionalidades que no aporten directamente a esos objetivos.

--------------------------------------------------

# FILOSOFÍA DEL PROYECTO

Cada decisión técnica debe responder esta pregunta:

¿Esta funcionalidad ayuda a vender más y ahorrar tiempo?

Si la respuesta es NO...

No debe implementarse.

No desarrollar funcionalidades por adelantado.

No agregar complejidad innecesaria.

Siempre desarrollar el sistema por módulos completamente terminados.

No avanzar al siguiente módulo hasta terminar el anterior.

--------------------------------------------------

# ARQUITECTURA GENERAL

Landing Page (más adelante)

↓

WhatsApp

↓

Backend

↓

PostgreSQL

↓

DeepSeek

Toda la inteligencia del sistema vive en el Backend.

La Landing únicamente tendrá la función de generar confianza y dirigir personas hacia WhatsApp.

El Backend será el centro absoluto de todo el proyecto.

Toda integración futura deberá conectarse al Backend.

--------------------------------------------------

# STACK TECNOLÓGICO

Backend

- Node.js
- Express.js
- TypeScript

Frontend (más adelante)

- Next.js
- React
- TailwindCSS

Base de datos

- PostgreSQL

Base semántica (más adelante)

- pgvector

IA

- DeepSeek API

Canal principal

- WhatsApp Cloud API

Hosting Backend

- Render

Hosting Frontend

- Vercel

--------------------------------------------------

# PRINCIPIOS

El código debe ser:

Modular.

Escalable.

Limpio.

Fácil de mantener.

Profesional.

Preparado para crecer.

No usar patrones innecesarios.

No crear microservicios.

No usar Docker.

No usar Kubernetes.

No crear autenticación.

No crear panel administrativo.

No crear frontend.

No crear APIs innecesarias.

No crear funcionalidades futuras.

Solo desarrollar exactamente lo solicitado en cada fase.

--------------------------------------------------

# ARQUITECTURA

Utilizar MVC.

Separar correctamente:

Controllers

Services

Repositories

Routes

Middlewares

Config

Utils

Types

Nunca colocar lógica de negocio en Controllers.

Toda la lógica debe vivir en Services.

--------------------------------------------------

# FASE ACTUAL

FASE 1

Construcción del Backend Base.

Objetivos de esta fase:

Crear la estructura completa del backend.

Configurar TypeScript.

Configurar Express.

Configurar variables de entorno.

Configurar CORS.

Configurar Helmet.

Configurar Morgan.

Crear Logger.

Crear Health Check.

Crear manejo global de errores.

Crear middleware 404.

Crear estructura MVC.

Crear scripts de desarrollo.

NO conectar PostgreSQL.

NO conectar DeepSeek.

NO conectar WhatsApp.

NO crear ninguna funcionalidad del negocio.

NO crear endpoints adicionales.

--------------------------------------------------

# ENDPOINTS

Únicamente crear:

GET /

Respuesta

{
  "message":"Voice Sales AI API"
}

GET /health

Respuesta

{
  "status":"ok"
}

No crear ningún endpoint adicional.

--------------------------------------------------

# OBJETIVO FINAL DE ESTA FASE

Al terminar esta fase el proyecto debe:

Compilar sin errores.

Levantar correctamente.

Responder correctamente los endpoints.

Quedar completamente preparado para comenzar la integración de PostgreSQL en la siguiente fase.

Al finalizar, verificar que todo funciona antes de dar la fase por terminada.

No continuar automáticamente con la siguiente fase.