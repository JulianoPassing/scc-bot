const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'messageCreate',
    async execute(message, config) {
        console.log('🔍 Módulo drogas: Mensagem recebida');
        console.log('📝 Conteúdo:', message.content);
        console.log('📺 Canal:', message.channel.id);
        console.log('🎯 Canal esperado:', config.channelId);
        
        // Verificar se a mensagem é do canal correto
        if (message.channel.id !== config.channelId) {
            console.log('❌ Canal incorreto, ignorando...');
            return;
        }
        
        console.log('✅ Canal correto detectado!');
        
        // Verificar se a mensagem contém um log de drogas
        if (!message.content.includes('SCC Gangs Logs')) {
            console.log('❌ Não é um log de drogas, ignorando...');
            return;
        }
        
        console.log('✅ Log de drogas detectado!');
        
        // Extrair o ID do usuário mencionado
        const userMentionMatch = message.content.match(/<@(\d+)>/);
        if (!userMentionMatch) {
            console.log('❌ Nenhum usuário mencionado encontrado');
            return;
        }
        
        const userId = userMentionMatch[1];
        console.log('👤 Usuário encontrado:', userId);
        
        try {
            // Buscar o membro no servidor
            const guild = message.guild;
            const member = await guild.members.fetch(userId);
            
            if (!member) {
                console.log(`❌ Membro não encontrado: ${userId}`);
                return;
            }
            
            console.log('✅ Membro encontrado:', member.user.tag);
            console.log('🎭 Cargos do usuário:', member.roles.cache.map(r => r.id).join(', '));
            
            // Verificar se o usuário possui algum dos cargos necessários
            const hasRequiredRole = member.roles.cache.some(role => 
                config.requiredRoles.includes(role.id)
            );
            
            console.log('🔍 Possui cargo necessário?', hasRequiredRole);
            
            // Se não possui nenhum cargo necessário, enviar mensagem
            if (!hasRequiredRole) {
                console.log('⚠️ Usuário sem cargo necessário, enviando alerta...');
                
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
                console.log('✅ Alerta enviado com sucesso!');
            } else {
                console.log('✅ Usuário possui cargo necessário, ignorando...');
            }
            
        } catch (error) {
            console.error('❌ Erro ao processar log de drogas:', error);
        }
    }
};
