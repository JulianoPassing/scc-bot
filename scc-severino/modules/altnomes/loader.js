import { Events } from 'discord.js';
import config from './config.js';

export default {
    name: 'altnomes',
    
    async execute(client) {
        console.log('🔧 MÓDULO ALTNOMES CARREGADO!');
        console.log(`📍 Configurado para servidor: ${config.guildId}`);
        console.log(`📍 Configurado para canal: ${config.channelId}`);
        console.log(`📍 Emoji de confirmação: ${config.confirmEmoji}`);
        console.log('🔧 Event listener registrado para MessageReactionAdd');
        
        // Verificar se o client tem o evento registrado
        console.log('🔧 Verificando se o event listener foi registrado...');
        console.log('🔧 Client listeners:', client.listenerCount(Events.MessageReactionAdd));
        
        // Evento para detectar reações em mensagens
        client.on(Events.MessageReactionAdd, async (reaction, user) => {
            console.log('🎯 EVENTO MessageReactionAdd EXECUTADO PELO MÓDULO ALTNOMES!');
            console.log('🎯 Canal da reação:', reaction.message.channel.id);
            console.log('🎯 Emoji da reação:', reaction.emoji.name);
            console.log('🎯 Usuário que reagiu:', user.tag);
            console.log('🎯 Autor da mensagem:', reaction.message.author.tag);
            
            // Ignorar reações de bots
            if (user.bot) {
                console.log('🎯 Ignorando reação de bot');
                return;
            }
            
            // Verificar se a reação foi adicionada no canal correto
            console.log(`🔍 Reação detectada no canal: ${reaction.message.channel.id} (esperado: ${config.channelId})`);
            console.log(`🔍 Tipo do canal detectado: ${typeof reaction.message.channel.id}`);
            console.log(`🔍 Tipo do canal config: ${typeof config.channelId}`);
            console.log(`🔍 Comparação: ${reaction.message.channel.id} === ${config.channelId} = ${reaction.message.channel.id === config.channelId}`);
            
            if (String(reaction.message.channel.id) !== String(config.channelId)) {
                console.log('❌ Canal incorreto, ignorando...');
                return;
            }
            
            // Verificar se a reação é o emoji de confirmação
            const emojiName = reaction.emoji.name || reaction.emoji.identifier;
            console.log(`🔍 Emoji detectado: ${emojiName} (esperado: ${config.confirmEmoji})`);
            
            if (emojiName !== config.confirmEmoji) {
                return;
            }
            
            console.log(`🎯 Reação detectada no canal ${config.channelId} com emoji ${config.confirmEmoji}`);
            
            try {
                // Buscar a mensagem original
                const message = reaction.message;
                
                // Verificar se a mensagem contém nome e sobrenome
                const content = message.content.trim();
                const nameParts = content.split(' ');
                
                if (nameParts.length < 2) {
                    console.log('❌ Mensagem não contém nome completo');
                    return; // Não é um nome completo
                }
                
                // Capitalizar primeira letra de cada parte do nome
                const formattedName = nameParts
                    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
                    .join(' ');
                
                console.log(`📝 Tentando alterar nome para: ${formattedName}`);
                
                // Verificar se o bot tem permissão para alterar nicknames
                const botMember = message.guild.members.cache.get(client.user.id);
                if (!botMember.permissions.has('ManageNicknames')) {
                    console.log('❌ Bot não tem permissão para alterar nicknames');
                    await message.reply('❌ O bot não tem permissão para alterar nicknames!');
                    return;
                }
                
                // Alterar o nome do usuário
                let member = message.guild.members.cache.get(message.author.id);
                if (!member) {
                    console.log('❌ Membro não encontrado no cache, fazendo fetch...');
                    try {
                        member = await message.guild.members.fetch(message.author.id);
                        console.log('✅ Membro encontrado via fetch');
                    } catch (error) {
                        console.error('❌ Erro ao fazer fetch do membro:', error);
                        return;
                    }
                }
                
                if (member) {
                    console.log(`👤 Tentando alterar nome do usuário: ${member.user.tag}`);
                    await member.setNickname(formattedName);
                    console.log(`✅ Nome alterado com sucesso para: ${formattedName}`);
                } else {
                    console.log('❌ Membro não encontrado após fetch');
                }
                
            } catch (error) {
                console.error('❌ Erro ao alterar nome:', error);
            }
        });
        
        // Verificar novamente se o listener foi registrado
        console.log('🔧 Client listeners após registro:', client.listenerCount(Events.MessageReactionAdd));
    }
};
