# Dockerfile para NotebookLM MCP (v12.9 - Chrome Auth Fix)
FROM node:20-slim

# Instalar Google Chrome (no Chromium) — Google bloquea Chromium headless como bot.
# Chrome real tiene mayor confianza con Google Sign-In.
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxshmfence1 \
    lsb-release \
    wget \
    xdg-utils \
    && wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
    && apt-get install -y ./google-chrome-stable_current_amd64.deb \
    && rm google-chrome-stable_current_amd64.deb \
    && rm -rf /var/lib/apt/lists/*

# 1. Directorio de trabajo
WORKDIR /app

# 2. Copiar archivos de dependencia
COPY package*.json ./

# 3. Instalar dependencias Node (patchright parcheará Chrome para evadir detección de bots)
RUN npm install && \
    npm install -g tsx && \
    npx patchright install chrome

# 4. Copiar todo el código fuente
COPY . .

# 5. Preparar directorios de persistencia y permisos
RUN mkdir -p /app/user_data && chmod -R 777 /app/user_data

# 6. Exposición de Puertos para SAPI/SSE
EXPOSE 3001

# 7. Healthcheck para monitoreo del Oráculo
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

# 8. Comando de inicio — Usando tsx sobre el código fuente directamente
CMD ["npx", "tsx", "src/index.ts"]
