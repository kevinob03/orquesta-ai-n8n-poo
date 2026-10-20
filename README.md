# orquestAI — MVP de facturas

Aplicación React/Vite para consultar y registrar facturas reales en Supabase. El navegador usa solamente la clave pública de Supabase; nunca una `service_role` ni un secreto de n8n.

## Instalación y ejecución

1. Requiere Node.js (se comprobó `v24.19.0` en este entorno).
2. Ejecuta `npm ci` y copia `.env.example` a `.env`.
3. En Supabase SQL Editor, ejecuta en orden todos los archivos de `supabase/migrations`, desde `20261020_000001_facturas.sql` hasta `20261020_000005_harden_data_api_and_indexes.sql`. Añaden empresas, membresías, RLS por empresa sin recursión, creación atómica, permisos explícitos de Data API e índices para las claves foráneas.
4. Obtén `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` desde Project Settings → API y colócalas en `.env`.
5. En Authentication → Security and Protection activa **Leaked Password Protection** (el advisor de seguridad lo marca como pendiente).
6. Ejecuta `npm run dev`. Para comprobación de producción: `npm run build`.

## Acceso de demo

La aplicación usa Supabase Auth con correo y contraseña. Crea una cuenta desde la pantalla inicial, confirma el correo si el proyecto lo requiere, inicia sesión y crea la primera empresa. Todas las consultas e inserciones de proveedores y facturas se filtran por esa empresa mediante RLS. No se exponen datos a `anon` ni se usa una clave privilegiada en React.

## Modelo y contrato

`proveedores` y `facturas` tienen UUID, timestamps, FK, índices, checks de moneda/montos/total y RLS. `src/domain/Factura.js` encapsula la validación determinista: `total = subtotal + impuesto`; el LLM no calcula ni autoriza escrituras.

El contrato entre workflows es siempre `{ "ok": boolean, "data": unknown | null, "error": string | null }`. Una operación de escritura sólo puede recibir una salida `ok: true` de `WF_Factura_Validar` y debe revalidarse en PostgreSQL (checks incluidos).

## n8n local y chat seguro

Se comprobó n8n `2.39.8` en este equipo. Con el servidor de n8n detenido, valida e importa los cinco JSON de `/n8n` desde la terminal:

```powershell
npm run n8n:validate
npm run n8n:import
npm run n8n:start
```

El último comando deja el editor en `http://localhost:5678`. La importación es idempotente por nombre: si un workflow ya existe, no crea otra copia. También se pueden importar manualmente mediante **Workflows → Import from File**:

El paquete alternativo completo con DeepSeek y sus seis sub-workflows está en `artifacts/flujo-n8n.json`. Se importa desde una terminal, con n8n detenido, mediante `n8n import:workflow --input="artifacts/flujo-n8n.json"`. Antes de activarlo, sustituye `https://TU-PROYECTO.supabase.co` por la URL pública real del proyecto y asigna las credenciales desde n8n.

- `WF_Agente_Orquestador.json` expone `POST /webhook/orquestai-chat` y responde el contrato.
- `WF_Factura_Validar.json` contiene la validación determinista.
- `WF_Factura_Guardar.json`, `WF_Factura_Consultar.json` y `WF_Proveedor_Buscar.json` son sub-workflows encapsulados y fallan de forma explícita hasta recibir sus credenciales/conexiones.

Los JSON se validaron e importaron con n8n `2.39.8`, pero se mantienen inactivos porque no se inventan credenciales ni proveedor LLM. Después de abrir el editor, el operador debe:

1. Configurar un proveedor LLM compatible en el nodo AI Agent (no incluido por no asumir proveedor), seleccionar su credencial y conectar las herramientas/sub-workflows por sus IDs reales.
2. Configurar una credencial de PostgreSQL/Supabase con mínimo privilegio en n8n, sustituir los nodos de “pendiente” por consultas parametrizadas y conectar `Validar → Guardar`; nunca aceptar que el LLM construya SQL ni datos de escritura.
3. Para que Supabase Cloud llame a n8n local, publicar el webhook en una URL HTTPS accesible y bajo control del operador (o ejecutar una alternativa local). Sin esa URL, Supabase Cloud no puede alcanzar `localhost`.
4. Desplegar la función: `supabase functions deploy chat-n8n`; guardar la URL resultante como `VITE_CHAT_FUNCTION_URL`; y guardar **sólo en el entorno de la función**: `supabase secrets set N8N_WEBHOOK_URL=https://.../webhook/orquestai-chat`.

La Edge Function reenvía el mensaje y no revela `N8N_WEBHOOK_URL` al navegador. El frontend muestra claramente el estado de integración pendiente si no existe `VITE_CHAT_FUNCTION_URL`.

## Verificaciones

Ejecuta `npm test` para verificar las reglas deterministas de factura, `npm run n8n:validate` para revisar los JSON y `npm run build` para generar la aplicación. Los workflows se mantienen inactivos hasta configurar el proveedor LLM, la conexión de base de datos y una URL HTTPS para el webhook.

## Prueba manual mínima

Con Auth y políticas de pertenencia implementadas, crea un proveedor desde SQL autenticado, abre la aplicación, registra una factura con `subtotal + impuesto = total`, confirma que aparece en la tabla e intenta un total distinto para comprobar que React lo rechaza. Prueba el webhook con un `POST` a la URL de la Edge Function sólo después de completar la conectividad HTTPS.
