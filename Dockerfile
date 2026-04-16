# Dockerfile para NotebookLM MCP (v12.4.0 - Light Recovery)
FROM node:20-slim

# Instalar dependencias mínimas para Playwright/Chromium
RUN apt-get update && apt-get install -y \
    libnss3 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libxshmfence1 \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libxshmfence1 \
    lsb-release \
    wget \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*


# 1. Directorio de trabajo
WORKDIR /app

# 2. Copiar archivos de dependencia
COPY package*.json ./

# 3. Instalar dependencias (Sin ejecutar scripts para evitar que tsc falle sin el source)
RUN npm install --ignore-scripts && npm install -g tsx && npx patchright install chromium

# 4. Copiar todo el código fuente
COPY . .

# 5. Preparar directorios de persistencia
RUN mkdir -p /app/user_data && chmod -R 777 /app/user_data

# 6. Comando de inicio — Usando tsx sobre el código fuente directamente
# Esto evita fallos de compilación de tsc
CMD ["npx", "tsx", "src/index.ts"]
