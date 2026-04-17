# 🏛️ Arquitectura del Oráculo (NotebookLM MCP)

Este documento describe la infraestructura, el propósito y la evolución del componente de **Verdad Externa** dentro del ecosistema SICC v12.7.

---

## 1. ¿Qué tenemos?
Tenemos un servidor **MCP (Model Context Protocol)** basado en Node.js y Playwright, encapsulado en un contenedor Docker aislado (`notebooklm-mcp-v12`).

- **Motor de Automatización:** Playwright (Chromium) con técnicas de humanización (stealth) para interactuar con la interfaz de NotebookLM.
- **Persistencia:** Un volumen montado en `/app/user_data` que preserva la sesión de Google, evitando re-autenticaciones constantes.
- **Interfaz de Control:** Un conjunto de herramientas (tools) como `ask_question`, `list_notebooks` y `select_notebook`.

## 2. ¿Por qué lo tenemos?
Para resolver el problema de la **Alucinación Agéntica** en temas de ingeniería compleja.
- **Limitación del RAG Local:** Las normas internacionales (FRA 49 CFR, AREMA, Manuales Viales) son demasiado extensas y semánticamente densas para un RAG local basado en fragmentos cortos.
- **Soberanía de Conocimiento:** NotebookLM (Google) proporciona una síntesis experta con citas literales que el Agente local utiliza como "Verdad Absoluta" para validar sus propias propuestas.

## 3. ¿Para qué lo usamos?
Actúa como la **Fase 3 (Oracle-Check)** del Bucle de Decantación de SICC:
1.  El Agente genera una propuesta técnica (Señalización, Energía, etc.).
2.  El Oráculo recibe la propuesta y la audita contra las libretas de ingeniería cargadas en NotebookLM.
3.  El Oráculo devuelve un veredicto de conformidad. Si hay discrepancia, el Oráculo prevalece sobre la "intuición" de la IA generativa.

## 4. Comunicación con el Brain (Estado Actual vs. Ideal)

### 🔴 Estado Actual: Táctico (STDIO Bridge)
- **Método:** `docker exec -i notebooklm-mcp-v12 npx tsx src/index.ts`
- **Problema:** Cada consulta arranca un proceso nuevo de Node y una instancia de Chrome. Esto genera una latencia de 10-15s y riesgo de "Race Conditions" en la sesión de Google.

### 🟢 Estado Ideal: Estratégico (SSE / Port 3001)
- **Método:** Comunicación vía **SSE (Server-Sent Events)** a través del puerto expuesto **3001**.
- **Arquitectura Ideal:**
    - El Oráculo corre como un **Servicio de Red Persistente**.
    - El Agente (Brain) se conecta mediante un cliente HTTP persistente.
    - **Latencia Esperada:** < 2s.
    - **Beneficio:** Mantenimiento de una única instancia de Chrome abierta 24/7, permitiendo "Interrogaciones Iterativas" (preguntas de seguimiento) sin pérdida de contexto.

---

## 5. Estado Actual (v12.7) - OPERATIVO 🟢
- **Modo de Operación:** Servidor Dual (STDIO + SSE).
- **Puerto Activo:** `3001` (Mapeado en Docker).
- **Salud del Sistema:** Monitoreada por Healthcheck nativo en Docker.
- **Soberanía:** Repositorio propio en `dieleozagent-debug/notebook-mcp`.

## 6. Protocolo de Pruebas (Test Patterns)

### A. Verificación de Salud (Healthcheck)
Ejecutar desde el host:
```bash
curl http://localhost:3001/health
```
**Respuesta esperada:** `{"status":"healthy", "version":"1.2.1-SICC"}`

### B. Prueba de Oráculo (SSE)
Para probar la conexión del Brain:
1. Abrir el MCP Inspector apuntando a `http://localhost:3001/sse`.
2. Ejecutar la herramienta `ask_question`.

## 7. Seguridad y Persistencia
- **.gitignore Blindado:** Bloqueo absoluto de `.env` y `user_data/` para proteger la sesión de Google.
- **Persistencia de Sesión:** El volumen Docker asegura que el login interactivo solo se realice una vez.
- **Credenciales:** Manejadas por variables de entorno (GMAIL_ACCOUNT, GMAIL_APP_PASSWORD).

---
*Última actualización: 2026-04-17*
*Certificación: Institucionalización Forense Completada*
