import { AuthManager } from '../src/auth/auth-manager.js';
import { NotebookLibrary } from '../src/library/notebook-library.js';
import { CONFIG } from '../src/config.js';

async function test() {
    console.log('Iniciando prueba de AuthManager...');
    const authManager = new AuthManager({
        showBrowser: false, 
        timeoutMs: 60000,
        stealth: true
    });
    
    try {
        console.log('Inicializando AuthManager...');
        await authManager.initialize();
        console.log('Verificando acceso a NotebookLM...');
        const isAuth = await authManager.checkAuth();
        console.log('Autenticado:', isAuth);
        
        if (!isAuth && CONFIG.autoLoginEnabled) {
            console.log('Intentando login automatico con', CONFIG.loginEmail, '...');
            await authManager.login(CONFIG.loginEmail, CONFIG.loginPassword);
            console.log('Prueba de login finalizada.');
            const nowAuth = await authManager.checkAuth();
            console.log('Autenticado despues de login:', nowAuth);
        }
    } catch (e) {
        console.error('Error prueba:', e.message);
    } finally {
        await authManager.close();
        process.exit(0);
    }
}
test();
