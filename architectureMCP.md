# 🏛️ Arquitectura del Oráculo (NotebookLM MCP) — v12.9

Este documento describe la infraestructura, el propósito y la evolución del componente de **Verdad Externa** dentro del ecosistema SICC.

---

## 1. ¿Qué tenemos?

Un servidor **MCP (Model Context Protocol)** Node.js + Playwright encapsulado en un contenedor Docker aislado (`notebooklm-mcp-v12`).

- **Motor de Automatización:** Patchright (fork de Playwright) con **Google Chrome real** (no Chromium) para evadir el bloqueo de Google a browsers automatizados.
- **Persistencia de Sesión:** Volumen `./user_data/chrome_profile` montado en **dos rutas** simultáneamente:
  - `/app/user_data/chrome_profile` (ruta de trabajo)
  - `/root/.local/share/notebooklm-mcp/chrome_profile` (ruta que usa `env-paths` internamente)
- **Interfaz de Control:** Tools MCP: `ask_question`, `list_notebooks`, `select_notebook`, `get_health`, etc.

## 2. ¿Por qué lo tenemos?

Para resolver la **Alucinación Agéntica** en temas de ingeniería compleja.

- Las normas internacionales (FRA 49 CFR, AREMA, Manuales Viales) son demasiado extensas para un RAG local.
- NotebookLM proporciona síntesis con citas literales del contrato LFC2 y normas internacionales.
- El Oráculo actúa como **Verdad Absoluta** que el Agente no puede contradecir.

## 3. ¿Para qué lo usamos?

Actúa como la **Fase 3 (Oracle-Check)** del Bucle de Decantación de SICC:

1. El Agente genera una propuesta técnica.
2. El Oráculo la audita contra las 108 fuentes del notebook "Contrato Ardanuy LFC".
3. Si hay discrepancia, el Oráculo prevalece sobre la IA generativa.

---

## 4. Arquitectura SSE v12.9 (Patrón Per-Connection)

### Cambio crítico aplicado el 2026-04-17

**Problema original:** El `Server` del MCP SDK solo soporta un transporte activo. El código anterior conectaba STDIO al arrancar y luego intentaba conectar SSE cuando llegaba un cliente → error `"Already connected to a transport"` → crash-loop del contenedor.

**Fix implementado:** Se elimina la auto-conexión STDIO. Cada solicitud `/sse` crea un **nuevo `Server` instance** con su propio transporte, aislado por `sessionId`. Esto permite múltiples conexiones concurrentes sin crashes.

```
Cliente (agente SICC)          Oracle (notebooklm-mcp-v12)
       |                                  |
       |── GET /sse ──────────────────────>|
       |                    createConfiguredServer()
       |                    new SSEServerTransport(sessionId)
       |<── endpoint event (sessionId) ───|
       |                                  |
       |── POST /messages?sessionId=X ───>|
       |                    handlePostMessage → ask_question
       |<── SSE result event ─────────────|
```

**Archivos modificados:**
- `src/index.ts`: `setupHandlers()` → `setupHandlersOn(server: Server)` + `createConfiguredServer()`. Handler SSE usa `Map<sessionId, transport>` para routing.
- `src/session/shared-context-manager.ts`: `channel: "chrome"`, args `--no-sandbox --disable-setuid-sandbox --disable-gpu`.
- `src/auth/auth-manager.ts`: mismo fix de channel y args.
- `Dockerfile`: instala **Google Chrome** (no Chromium) vía `.deb` oficial + `npx patchright install chrome`.

### Agente (notebooklm_mcp.js) — fixes aplicados

- `withTimeout()` en `initMCP()` (20s) y `callTool()` (3min con opción nativa MCP SDK).
- `mcpClient.close()` + reset a `null` en catch para reconexión limpia.
- Timeout de `exec()` en `index.js`: `660000ms` (11 min hard-cap).

---

## 5. Autenticación Google — Setup de Una Sola Vez

Google bloquea logins automáticos desde IPs de datacenter incluso con Chrome real. La solución es un **login manual único** que guarda la sesión en el volumen persistente.

### Procedimiento (solo necesario una vez o cuando expire la sesión):

**Terminal 1:**
```bash
docker exec notebooklm-mcp-v12 bash -c "
  Xvfb :99 -screen 0 1280x720x24 &>/dev/null &
  sleep 4 && DISPLAY=:99 node /app/user_data/auth2.cjs
"
```

Esperar el mensaje `LISTO_PARA_CODIGO` en el log.

**Terminal 2** (inmediatamente al recibir el SMS):
```bash
docker exec notebooklm-mcp-v12 sh -c "echo 'CODIGO_SMS' > /app/user_data/sms_code.txt"
```

Cuando aparezca `AUTH_COMPLETE`, la sesión queda guardada en `./user_data/chrome_profile/` y persiste entre reinicios del contenedor.

### Notas importantes:
- La cuenta usa **2-Step Verification por SMS** al número terminado en 76.
- Las cookies persisten vía volumen Docker — no se necesita re-autenticar salvo que Google invalide la sesión (típicamente 3-6 meses).
- El script `auth2.cjs` está en `/app/user_data/auth2.cjs` dentro del contenedor.

---

## 6. Volúmenes Docker

| Volumen host | Ruta en contenedor | Propósito |
|---|---|---|
| `./user_data` | `/app/user_data` | Datos generales, logs, scripts de auth |
| `./user_data/chrome_profile` | `/root/.local/share/notebooklm-mcp/chrome_profile` | **Sesión Google persistente** (ruta usada por env-paths) |
| `./scripts` | `/app/scripts` | Scripts auxiliares |

---

## 7. Protocolo de Pruebas

### A. Healthcheck
```bash
curl http://localhost:3001/health
# Esperado: {"status":"healthy","version":"1.2.1-SICC"}
```

### B. Test end-to-end desde el agente
```bash
docker exec dieleozagent-debug-dieleozagent-1 node -e "
const { validarExternaNotebook } = require('./src/sapi/notebooklm_mcp');
validarExternaNotebook('telecomunicaciones fibra optica LFC2').then(r => console.log(r?.substring(0,300)));
"
```
**Resultado esperado:** JSON con `"success": true` y `"answer"` con contenido del contrato LFC2.

---

## 8. Seguridad

- `.gitignore` bloquea `user_data/` y `.env` — las cookies de Google nunca van a git.
- Credenciales solo en variables de entorno del `docker-compose.yaml`.
- `docker.sock` montado solo para comandos de administración del agente.

---

## 9. Soberanía del Código

- **Repositorio:** [dieleozagent-debug/notebook-mcp](https://github.com/dieleozagent-debug/notebook-mcp)
- **Estado:** ✅ Operativo — Oracle responde `ask_question` con datos reales del contrato LFC2 (108 fuentes, "Contrato Ardanuy LFC").

---

*Última actualización: 2026-04-17 — v12.9 certificado y operativo*
