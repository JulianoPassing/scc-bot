const { Client, GatewayIntentBits } = require('discord.js');
const { loadEvents } = require('./loader');

module.exports = {
    name: 'tagseason',
    description: 'Módulo para gerenciar cargos baseado em reações',
    version: '1.0.0',
    
    async init(client) {
        console.log('🔖 Módulo tagseason carregado com sucesso!');
        await loadEvents(client);
    }
};
