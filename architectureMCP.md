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

## 4. Comunicación con el Brain (Arquitectura SAPI v12.7)

El Oráculo de NotebookLM ha evolucionado de un script táctico a un **Servicio de Red Persistente (SAPI)**.

- **Modo de Operación:** Servidor Dual (STDIO para CLI + SSE para el Brain).
- **Puerto Activo:** `3001` (Mapeado y monitoreado en Docker).
- **Latencia:** < 1s (Chrome se mantiene vivo 24/7 en segundo plano).
- **Beneficio:** Permite "Interrogaciones Iterativas" (preguntas de seguimiento forense) sin pérdida de contexto ni reconexiones pesadas a Google.

---

## 5. Soberanía del Código 🟢
- **Repositorio Oficial:** [dieleozagent-debug/notebook-mcp](https://github.com/dieleozagent-debug/notebook-mcp)
- **Salud del Sistema:** Monitoreada autónomamente por Healthcheck nativo en Docker.

## 6. Protocolo de Pruebas (Test Patterns)

### A. Verificación de Salud (Healthcheck)
Ejecutar desde el host:
```bash
wget --quiet --tries=1 --spider http://localhost:3001/health
```
**Respuesta esperada:** `{"status":"healthy", "version":"1.2.1-SICC"}`

### B. Prueba de Conectividad en Red Interna (Brain -> Oráculo)
Para probar que el Agente puede consumir la SAPI de forma autónoma sin usar `docker exec`, se debe ejecutar un script de test desde el contenedor del Agente apuntando al nombre del servicio:
```bash
docker exec dieleozagent-debug-dieleozagent-1 node scripts/test-oracle-sapi.js
```
**Resultado esperado:**
```text
📡 Conectando al Oráculo SAPI en http://notebooklm-mcp-v12:3001/sse...
✅ Oráculo SAPI: Saludable y Respondiendo.
🚀 [PRUEBA SUPERADA] El puerto 3001 está activo y el Brain tiene acceso total.
```

## 7. Seguridad y Persistencia
- **.gitignore Blindado:** Bloqueo absoluto de `.env` y `user_data/` para proteger la sesión de Google.
- **Persistencia de Sesión:** El volumen Docker asegura que el login interactivo solo se realice una vez.
- **Credenciales:** Manejadas por variables de entorno (GMAIL_ACCOUNT, GMAIL_APP_PASSWORD).

---
*Última actualización: 2026-04-17*
*Certificación: Institucionalización Forense Completada*
