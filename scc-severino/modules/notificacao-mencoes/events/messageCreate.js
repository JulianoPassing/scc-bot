import { EmbedBuilder } from 'discord.js';
import config from '../config.js';

export default {
    name: 'messageCreate',
    async execute(message) {
        console.log(`[DEBUG] Mensagem recebida: ${message.content} | Canal: ${message.channel.id} | Servidor: ${message.guild?.id}`);
        
        // Ignorar mensagens de bots
        if (message.author.bot) {
            console.log(`[DEBUG] Mensagem ignorada - é de bot`);
            return;
        }

        // Verificar se está no servidor e canal corretos
        if (message.guild?.id !== config.SERVER_ID) {
            console.log(`[DEBUG] Mensagem ignorada - servidor incorreto. Esperado: ${config.SERVER_ID}, Recebido: ${message.guild?.id}`);
            return;
        }
        if (message.channel.id !== config.CHANNEL_ID) {
            console.log(`[DEBUG] Mensagem ignorada - canal incorreto. Esperado: ${config.CHANNEL_ID}, Recebido: ${message.channel.id}`);
            return;
        }

        console.log(`[DEBUG] Mensagem no canal correto! Verificando menções...`);
        console.log(`[DEBUG] Menções encontradas: ${message.mentions.users.size}`);

        // Verificar se há menções de usuários
        if (message.mentions.users.size === 0) {
            console.log(`[DEBUG] Mensagem ignorada - sem menções`);
            return;
        }

        // Para cada usuário mencionado, enviar DM
        for (const [userId, user] of message.mentions.users) {
            console.log(`[DEBUG] Processando menção: ${user.tag} (${userId})`);
            
            // Não enviar DM para bots
            if (user.bot) {
                console.log(`[DEBUG] Menção ignorada - é bot`);
                continue;
            }

            // Não enviar DM para o próprio autor da mensagem
            if (userId === message.author.id) {
                console.log(`[DEBUG] Menção ignorada - é auto-menção`);
                continue;
            }

            console.log(`[DEBUG] Tentando enviar DM para ${user.tag}...`);

            try {
                // Criar embed bonito
                const embed = new EmbedBuilder()
                    .setColor(config.EMBED_COLOR)
                    .setTitle('🔔 Você foi mencionado!')
                    .setDescription(`Você foi marcado no canal <#${config.CHANNEL_ID}>, verifique o quanto antes!`)
                    .addFields(
                        {
                            name: '👤 Mencionado por',
                            value: `${message.author.tag} (${message.author})`,
                            inline: false
                        },
                        {
                            name: '💬 Mensagem',
                            value: message.content.length > 1024 
                                ? message.content.substring(0, 1021) + '...' 
                                : message.content,
                            inline: false
                        },
                        {
                            name: '🔗 Link da mensagem',
                            value: `[Clique aqui para ver](${message.url})`,
                            inline: false
                        }
                    )
                    .setTimestamp()
                    .setFooter({ 
                        text: `Servidor: ${message.guild.name}`,
                        iconURL: message.guild.iconURL()
                    });

                // Se a mensagem tiver anexos, adicionar informação
                if (message.attachments.size > 0) {
                    embed.addFields({
                        name: '📎 Anexos',
                        value: `Esta mensagem contém ${message.attachments.size} anexo(s)`,
                        inline: false
                    });
                }

                // Enviar DM para o usuário
                await user.send({ embeds: [embed] });

                console.log(`[Notificação de Menção] DM enviado para ${user.tag} (${userId})`);
            } catch (error) {
                // Se não conseguir enviar DM (DM fechada, por exemplo)
                if (error.code === 50007) {
                    console.log(`[Notificação de Menção] Não foi possível enviar DM para ${user.tag} - DMs fechadas`);
                } else {
                    console.error(`[Notificação de Menção] Erro ao enviar DM para ${user.tag}:`, error);
                }
            }
        }
    }
};

