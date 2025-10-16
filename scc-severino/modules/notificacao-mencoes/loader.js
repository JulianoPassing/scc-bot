import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default async (client) => {
    console.log('[Notificação de Menções] Carregando módulo...');

    // Carregar eventos
    const eventsPath = path.join(__dirname, 'events');
    if (fs.existsSync(eventsPath)) {
        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

        for (const file of eventFiles) {
            const eventPath = path.join(eventsPath, file);
            const event = await import(pathToFileURL(eventPath).href);
            const eventModule = event.default || event;
            client.on(eventModule.name, (...args) => eventModule.execute(...args));
            console.log(`[Notificação de Menções] Evento carregado: ${eventModule.name}`);
        }
    }

    console.log('[Notificação de Menções] Módulo carregado com sucesso!');
};

