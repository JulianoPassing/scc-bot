const { Client, GatewayIntentBits } = require('discord.js');
const path = require('path');

module.exports = {
    name: 'drogas',
    description: 'Módulo para monitorar logs de drogas e verificar cargos dos usuários',
    version: '1.0.0',
    author: 'SCC Bot',
    
    // Configurações específicas do módulo
    config: {
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
    },

    // Carregar eventos
    loadEvents: function(client) {
        const eventsPath = path.join(__dirname, 'events');
        const fs = require('fs');
        
        console.log('📁 Carregando eventos do módulo drogas...');
        console.log('📂 Caminho dos eventos:', eventsPath);
        
        if (fs.existsSync(eventsPath)) {
            const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
            console.log('📄 Arquivos de eventos encontrados:', eventFiles);
            
            for (const file of eventFiles) {
                console.log(`🔄 Carregando evento: ${file}`);
                const event = require(path.join(eventsPath, file));
                if (event.once) {
                    client.once(event.name, (...args) => event.execute(...args, this.config));
                    console.log(`✅ Evento ${event.name} registrado como once`);
                } else {
                    client.on(event.name, (...args) => event.execute(...args, this.config));
                    console.log(`✅ Evento ${event.name} registrado como listener`);
                }
            }
        } else {
            console.log('❌ Pasta de eventos não encontrada!');
        }
    },

    // Inicializar módulo
    init: function(client) {
        console.log('🚀 Iniciando módulo drogas...');
        this.loadEvents(client);
        console.log('✅ Módulo drogas carregado com sucesso!');
        console.log('📋 Configurações:', {
            guildId: this.config.guildId,
            channelId: this.config.channelId,
            requiredRolesCount: this.config.requiredRoles.length,
            setRoleId: this.config.setRoleId
        });
    }
};
