import { Events } from 'discord.js';
import config from '../config.js';

export default {
    name: 'teste-altnomes',
    description: 'Comando para testar o módulo altnomes',
    
    async execute(message, args, client) {
        // Verificar se o comando foi executado no canal correto
        if (message.channel.id !== config.channelId) {
            return message.reply('❌ Este comando só funciona no canal de alteração de nomes!');
        }
        
        // Verificar se o usuário tem permissão para alterar nicknames
        if (!message.member.permissions.has('ManageNicknames')) {
            return message.reply('❌ Você não tem permissão para alterar nicknames!');
        }
        
        // Verificar se o bot tem permissão para alterar nicknames
        if (!message.guild.members.me.permissions.has('ManageNicknames')) {
            return message.reply('❌ O bot não tem permissão para alterar nicknames!');
        }
        
        // Testar alteração de nome
        try {
            const testName = 'Teste AltNomes';
            await message.member.setNickname(testName);
            await message.reply(`✅ Teste realizado! Nome alterado para: **${testName}**`);
            
            // Restaurar nome original após 3 segundos
            setTimeout(async () => {
                try {
                    await message.member.setNickname(null); // Remove o nickname
                    await message.reply('🔄 Nome restaurado ao original!');
                } catch (error) {
                    console.error('Erro ao restaurar nome:', error);
                }
            }, 3000);
            
        } catch (error) {
            console.error('Erro no teste:', error);
            await message.reply(`❌ Erro no teste: ${error.message}`);
        }
    }
};
