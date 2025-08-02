import { Client, GatewayIntentBits } from 'discord.js';
import loadEvents from './loader.js';

export default {
    name: 'liberacao',
    description: 'Módulo de liberação de usuários',
    async execute(client) {
        try {
            await loadEvents(client);
            console.log('✅ Módulo de liberação carregado com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao carregar módulo de liberação:', error);
        }
    }
}; 