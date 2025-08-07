const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'messageCreate',
    async execute(message, config) {
        // Verificar se a mensagem é do canal correto
        if (message.channel.id !== config.channelId) return;
        
        // Verificar se a mensagem contém um log de drogas
        if (!message.content.includes('SCC Gangs Logs')) return;
        
        // Extrair o ID do usuário mencionado
        const userMentionMatch = message.content.match(/<@(\d+)>/);
        if (!userMentionMatch) return;
        
        const userId = userMentionMatch[1];
        
        try {
            // Buscar o membro no servidor
            const guild = message.guild;
            const member = await guild.members.fetch(userId);
            
            if (!member) {
                console.log(`Membro não encontrado: ${userId}`);
                return;
            }
            
            // Verificar se o usuário possui algum dos cargos necessários
            const hasRequiredRole = member.roles.cache.some(role => 
                config.requiredRoles.includes(role.id)
            );
            
            // Se não possui nenhum cargo necessário, enviar mensagem
            if (!hasRequiredRole) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('⚠️ Usuário sem SET')
                    .setDescription(`<@${userId}> não possui nenhum dos cargos necessários!`)
                    .addFields(
                        { name: 'Cargo SET', value: `<@&${config.setRoleId}>`, inline: true },
                        { name: 'Usuário', value: `<@${userId}>`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'SCC Bot - Sistema de Verificação de Cargos' });
                
                await message.reply({ embeds: [embed] });
            }
            
        } catch (error) {
            console.error('Erro ao processar log de drogas:', error);
        }
    }
};
