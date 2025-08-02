import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadEvents(client) {
    console.log('🚀 Iniciando carregamento do módulo de liberação...');
    
    // Carregar eventos
    const eventsPath = path.join(__dirname, 'events');
    
    if (!fs.existsSync(eventsPath)) {
        console.log('📁 Pasta de eventos não encontrada, criando...');
        fs.mkdirSync(eventsPath, { recursive: true });
    } else {
        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
        console.log(`📂 Eventos encontrados: ${eventFiles.length}`);

        for (const file of eventFiles) {
            try {
                const filePath = path.join(__dirname, 'events', file);
                console.log(`📄 Carregando evento: ${file}`);
                const event = await import(filePath);
                
                if (event.default.once) {
                    client.once(event.default.name, (...args) => event.default.execute(...args));
                } else {
                    client.on(event.default.name, (...args) => event.default.execute(...args));
                }
                
                console.log(`✅ Evento carregado com sucesso: ${event.default.name}`);
            } catch (error) {
                console.error(`❌ Erro ao carregar evento ${file}:`, error);
            }
        }
    }
    
    // Carregar comandos
    const commandsPath = path.join(__dirname, 'commands');
    
    if (!fs.existsSync(commandsPath)) {
        console.log('📁 Pasta de comandos não encontrada, criando...');
        fs.mkdirSync(commandsPath, { recursive: true });
    } else {
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        console.log(`📂 Comandos encontrados: ${commandFiles.length}`);

        for (const file of commandFiles) {
            try {
                const filePath = path.join(__dirname, 'commands', file);
                console.log(`📄 Carregando comando: ${file}`);
                const command = await import(filePath);
                
                client.commands.set(command.default.name, command.default);
                
                console.log(`✅ Comando carregado com sucesso: ${command.default.name}`);
            } catch (error) {
                console.error(`❌ Erro ao carregar comando ${file}:`, error);
            }
        }
    }
    
    console.log('✅ Módulo de liberação carregado completamente!');
}

export default loadEvents; 