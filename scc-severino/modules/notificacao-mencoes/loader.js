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
    console.log(`[Notificação de Menções] Procurando eventos em: ${eventsPath}`);
    
    if (fs.existsSync(eventsPath)) {
        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
        console.log(`[Notificação de Menções] Arquivos de evento encontrados: ${eventFiles.join(', ')}`);

        for (const file of eventFiles) {
            const eventPath = path.join(eventsPath, file);
            console.log(`[Notificação de Menções] Carregando evento: ${file}`);
            
            try {
                const event = await import(pathToFileURL(eventPath).href);
                const eventModule = event.default || event;
                console.log(`[Notificação de Menções] Evento importado:`, eventModule);
                
                client.on(eventModule.name, (...args) => {
                    console.log(`[Notificação de Menções] Evento ${eventModule.name} disparado!`);
                    return eventModule.execute(...args);
                });
                console.log(`[Notificação de Menções] Evento registrado: ${eventModule.name}`);
            } catch (error) {
                console.error(`[Notificação de Menções] Erro ao carregar evento ${file}:`, error);
            }
        }
    } else {
        console.log(`[Notificação de Menções] Diretório de eventos não encontrado: ${eventsPath}`);
    }

    console.log('[Notificação de Menções] Módulo carregado com sucesso!');
};

