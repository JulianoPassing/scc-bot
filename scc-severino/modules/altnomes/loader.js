const { Events } = require('discord.js');
const config = require('./config');

module.exports = {
    name: 'altnomes',
    
    async execute(client) {
        // Evento para detectar reações em mensagens
        client.on(Events.MessageReactionAdd, async (reaction, user) => {
            // Ignorar reações de bots
            if (user.bot) return;
            
            // Verificar se a reação foi adicionada no canal correto
            if (reaction.message.channel.id !== config.channelId) return;
            
            // Verificar se a reação é o emoji de confirmação
            if (reaction.emoji.name !== config.confirmEmoji) return;
            
            try {
                // Buscar a mensagem original
                const message = reaction.message;
                
                // Verificar se a mensagem contém nome e sobrenome
                const content = message.content.trim();
                const nameParts = content.split(' ');
                
                if (nameParts.length < 2) {
                    return; // Não é um nome completo
                }
                
                // Capitalizar primeira letra de cada parte do nome
                const formattedName = nameParts
                    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
                    .join(' ');
                
                // Alterar o nome do usuário
                const member = message.guild.members.cache.get(message.author.id);
                if (member) {
                    await member.setNickname(formattedName);
                    
                    // Enviar confirmação
                    await message.reply(`✅ Nome alterado para: **${formattedName}**`);
                }
                
            } catch (error) {
                console.error('Erro ao alterar nome:', error);
            }
        });
    }
};
