# Demo RUNT — Consulta en lenguaje natural

Demo interna: preguntas en español sobre el registro de vehículos del RUNT,
traducidas a SQL Oracle de solo lectura y contrastadas contra cifras que el
equipo ya conoce.

## Cómo funciona

```
pregunta ──LLM──▶ QuerySpec ──validación contra catálogo──▶ compilador ──▶ SQL + binds ──▶ Oracle
              ▲        │
              │        └──redacción determinística──▶ frase en español
              └──────────────── filtros editados en el panel ────────────┘
```

El modelo **nunca escribe SQL**: emite un QuerySpec con dimensiones de negocio
(`color`, `servicio`, `estado`, `modelo`, `fecha_registro`). El compilador lo
convierte en SQL con bind variables. Por eso la pregunta y los filtros son dos
vistas del mismo objeto, y por eso el constructor funciona sin el modelo.

## Alcance de datos

Tres tablas de `RUNTPROD`: `RA_AUTOMOTOR` (hechos), `PA_COLOR` y `PA_TIPOSERVI`
(parámetros).

**Responde:** cantidad de vehículos por color, tipo de servicio, estado, modelo,
año de fabricación, cilindraje y rangos de fecha de registro o cancelación, en
cualquier combinación. Búsqueda por placa.

**No responde:** marca, clase de vehículo (carro vs. moto), licencias de
conducción, revisiones técnico-mecánicas ni exámenes médicos. Esas preguntas
devuelven una aclaración explícita en vez de un número inventado.

## Arranque

Backend (puerto 3610). `config/default.json` y `.env` no están versionados —
se crean desde sus plantillas y se llenan con los datos reales:

```bash
cd backend
cp config/template.json config/default.json
cp .env.sample .env
npm install
node -r dotenv/config app.js
```

Frontend (puerto 3500):

```bash
cd frontend && npm install && npm run dev
```

## Configuración

| Qué | Dónde |
|---|---|
| Conexión a Oracle | `backend/config/default.json` → `modules.database.providers.oracle.settings` |
| Credenciales del modelo | `backend/.env` (`LLM_ENDPOINT`, `LLM_APIKEY`, `LLM_APIVERSION`, `LLM_DEPLOYMENT`) |
| Esquema y dimensiones | `backend/src/constants/runt-catalog.json` |
| URL del backend | `frontend/.env.development` → `VITE_API_URL` |

`runt-catalog.json` es el único archivo que conoce el esquema: alimenta el
prompt, el compilador y los selects de la interfaz. Si cambian nombres de
columnas o valores de dominio, se cambia ahí y nada más.

## Oracle local para desarrollo

```bash
docker compose -f backend/dev/docker-compose.yml up -d
docker exec -i runt-demo-oracle sqlplus -s RUNTPROD/runtdemo@//localhost:1521/FREEPDB1 < backend/dev/seed.sql
```

Recrea las tres tablas con el DDL real y carga 60.000 vehículos de prueba.
Solo desarrollo; no forma parte del despliegue.

## Endpoints

| Método | Ruta | Para qué |
|---|---|---|
| GET | `/catalog/schema` | Dimensiones, valores de dominio y preguntas de ejemplo |
| POST | `/query/ask` | `{ question, spec?, dry_run? }` — interpreta, compila y ejecuta |
| POST | `/query/execute` | `{ spec, dry_run? }` — ejecuta un spec editado a mano, sin modelo |
| POST | `/query/restate` | `{ spec }` — reescribe el spec como frase en español |

## Pantallas

| Ruta | Qué muestra |
|---|---|
| `/` | Buscador vacío, preguntas de prueba, resumen del esquema |
| `/buscador` | Buscador + panel de filtros interpretados + respuesta + SQL + tabla |
| `/asistente` | Hilo conversacional + panel de filtros + validación manual |
| `/constructor` | Filtros → pregunta redactada → SQL + resultado, sin usar el modelo |

## Antes de la presentación

1. Verificar salida hacia el endpoint del modelo desde la máquina del cliente.
   Si está bloqueada, el constructor (`/constructor`) sigue funcionando: arma
   la consulta sin inferencia.
2. Medir: `SELECT COUNT(*) FROM RUNTPROD.RA_AUTOMOTOR` y plan de ejecución de la
   consulta por color. `AUTOMOTOR_COLOR_IDCOLOR` **no tiene índice** en
   producción, así que una pregunta solo por color recorre la tabla completa.
   El compilador agrega `/*+ PARALLEL */` cuando ningún filtro usa índice.
3. Precalentar las preguntas de la demo para conocer los tiempos reales.
4. Avisar al cliente que licencias, tecnomecánicas y exámenes médicos no están
   en el alcance de estas tres tablas.
