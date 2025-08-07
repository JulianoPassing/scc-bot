import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadEvents(client) {
    console.log('🚀 Iniciando carregamento do módulo de drogas...');
    
    // Configurações específicas do módulo
    const config = {
        guildId: '1326731475797934080',
        channelId: '1346116253252714597',
        requiredRoles: [
            "1326731475818909732","1326731475818909731","1326731475818909730",
            "1326731475818909729","1326731475818909728","1326731475818909727",
            "1326731475818909726","1326731475806191716","1326731475806191715",
            "1326731475806191714","1326731475806191713","1326731475806191712",
            "1326731475806191711","1326731475806191710","1326731475806191709",
            "1326731475806191708","1326731475806191707","1326731475797934089",
            "1326731475797934088","1326731475797934087","1326731475797934086",
            "1326731475797934085","1326731475797934084","1326731475797934083",
            "1326731475797934082","1326731475797934081","1332041004978536461",
            "1332041504545312841"
        ],
        setRoleId: '1326731475818909733'
    };
    
    console.log('📋 Configurações:', {
        guildId: config.guildId,
        channelId: config.channelId,
        requiredRolesCount: config.requiredRoles.length,
        setRoleId: config.setRoleId
    });
    
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
                    client.once(event.default.name, (...args) => event.default.execute(...args, config));
                } else {
                    client.on(event.default.name, (...args) => event.default.execute(...args, config));
                }
                
                console.log(`✅ Evento carregado com sucesso: ${event.default.name}`);
            } catch (error) {
                console.error(`❌ Erro ao carregar evento ${file}:`, error);
            }
        }
    }
    
    console.log('✅ Módulo de drogas carregado completamente!');
}

export default loadEvents;
