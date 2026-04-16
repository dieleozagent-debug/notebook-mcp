const { chromium } = require('playwright');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function interactiveLogin() {
  const userDataPath = path.join(__dirname, '../user_data');
  console.log('🚀 Iniciando Navegador para Autenticación Interactiva...');
  console.log(`📂 Almacén de sesión: ${userDataPath}`);

  const browserContext = await chromium.launchPersistentContext(userDataPath, {
    headless: true, // Debe ser headless en Docker sin X11
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browserContext.newPage();

  try {
    console.log('🌐 Navegando a Google Login...');
    await page.goto('https://accounts.google.com/ServiceLogin?continue=https://notebooklm.google.com/', { waitUntil: 'networkidle' });

    // 1. Ingresar Email
    console.log(`📧 Ingresando cuenta: ${process.env.GMAIL_ACCOUNT || 'dieleozagent@gmail.com'}`);
    await page.fill('input[type="email"]', process.env.GMAIL_ACCOUNT || 'dieleozagent@gmail.com');
    await page.click('#identifierNext');
    await page.waitForTimeout(3000);

    // 2. Ingresar Password (Manual por seguridad)
    const password = await question('🔑 Introduce tu PASSWORD MAESTRA (no se mostrará): ');
    await page.fill('input[type="password"]', password);
    await page.click('#passwordNext');
    await page.waitForTimeout(5000);

    // 3. Captura de pantalla de estado (para debug ciego)
    await page.screenshot({ path: path.join(userDataPath, 'login_step.png') });
    console.log('📸 Captura de estado guardada en user_data/login_step.png');

    // 4. ¿2FA?
    const currentUrl = page.url();
    if (currentUrl.includes('challenge')) {
      console.log('⚠️ [2FA] ¡Google requiere verificación!');
      console.log('📱 Revisa tu móvil o SMS.');
      const code = await question('🔢 Introduce el CÓDIGO de verificación/SMS: ');
      await page.fill('input[type="tel"], input[aria-label*="código"]', code);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(8000);
    }

    // 5. Verificar finalización
    await page.goto('https://notebooklm.google.com/', { waitUntil: 'networkidle' });
    if (page.url().includes('notebooklm.google.com')) {
      console.log('✅ [SICC OK] ¡Login Exitoso! Sesión guardada.');
    } else {
      console.log('❌ [SICC FAIL] No se pudo verificar el acceso a NotebookLM.');
      await page.screenshot({ path: path.join(userDataPath, 'login_error.png') });
    }

  } catch (err) {
    console.error('❌ Error durante el login:', err.message);
    await page.screenshot({ path: path.join(userDataPath, 'crash_error.png') });
  } finally {
    await browserContext.close();
    rl.close();
    process.exit(0);
  }
}

interactiveLogin();
