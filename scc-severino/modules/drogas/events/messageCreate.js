import { EmbedBuilder } from 'discord.js';

export default {
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
        
        // Verificar se a mensagem tem embeds
        if (!message.embeds || message.embeds.length === 0) {
            console.log('❌ Mensagem não tem embeds, ignorando...');
            return;
        }
        
        console.log('📦 Embeds encontrados:', message.embeds.length);
        
        // Procurar por "SCC Gangs Logs" nos embeds
        let logEmbed = null;
        let embedContent = '';
        
        for (const embed of message.embeds) {
            console.log('🔍 Verificando embed:', {
                title: embed.title,
                description: embed.description,
                fieldsCount: embed.fields?.length || 0
            });
            
            // Verificar no título do embed
            if (embed.title && embed.title.includes('SCC Gangs Logs')) {
                logEmbed = embed;
                embedContent = embed.title + '\n' + (embed.description || '');
                console.log('✅ Encontrado no título do embed');
                break;
            }
            
            // Verificar na descrição do embed
            if (embed.description && embed.description.includes('SCC Gangs Logs')) {
                logEmbed = embed;
                embedContent = embed.description;
                console.log('✅ Encontrado na descrição do embed');
                break;
            }
            
            // Verificar nos campos do embed
            if (embed.fields) {
                for (const field of embed.fields) {
                    console.log('📋 Campo:', { name: field.name, value: field.value });
                    if (field.name && field.name.includes('SCC Gangs Logs')) {
                        logEmbed = embed;
                        embedContent = field.name + '\n' + (field.value || '');
                        console.log('✅ Encontrado no nome do campo');
                        break;
                    }
                    if (field.value && field.value.includes('SCC Gangs Logs')) {
                        logEmbed = embed;
                        embedContent = field.value;
                        console.log('✅ Encontrado no valor do campo');
                        break;
                    }
                }
            }
        }
        
        if (!logEmbed) {
            console.log('❌ Nenhum embed com "SCC Gangs Logs" encontrado');
            return;
        }
        
        console.log('✅ Log de drogas detectado no embed!');
        console.log('📝 Conteúdo do embed:', embedContent);
        
        // Extrair o ID do usuário mencionado do embed
        const userMentionMatch = embedContent.match(/<@(\d+)>/);
        if (!userMentionMatch) {
            console.log('❌ Nenhum usuário mencionado encontrado no embed');
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
