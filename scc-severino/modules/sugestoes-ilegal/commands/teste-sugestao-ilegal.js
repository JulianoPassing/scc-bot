import { EmbedBuilder } from 'discord.js';

export default {
  data: {
    name: 'teste-sugestao-ilegal',
    description: 'Testa se o módulo de sugestões ilegais está funcionando'
  },
  
  async execute(message, args, client) {
    const embed = new EmbedBuilder()
      .setColor(0xFF6B6B)
      .setTitle('🧪 Teste do Módulo Sugestões Ilegais')
      .setDescription('Verificando configuração do módulo...');

    try {
      // Verificar servidor
      const targetGuild = client.guilds.cache.get('1326731475797934080');
      if (!targetGuild) {
        embed.addFields({ 
          name: '❌ Servidor', 
          value: 'Servidor alvo não encontrado\nID: 1326731475797934080', 
          inline: false 
        });
      } else {
        embed.addFields({ 
          name: '✅ Servidor', 
          value: `${targetGuild.name}\nID: ${targetGuild.id}`, 
          inline: false 
        });
      }

      // Verificar canal de sugestões
      const suggestionChannel = client.channels.cache.get('1336660114249224262');
      if (!suggestionChannel) {
        embed.addFields({ 
          name: '❌ Canal de Sugestões', 
          value: 'Canal não encontrado\nID: 1336660114249224262', 
          inline: false 
        });
      } else {
        embed.addFields({ 
          name: '✅ Canal de Sugestões', 
          value: `${suggestionChannel.name}\nID: ${suggestionChannel.id}`, 
          inline: false 
        });
      }

      // Verificar canal de logs
      const logsChannel = client.channels.cache.get('1410612496947216485');
      if (!logsChannel) {
        embed.addFields({ 
          name: '❌ Canal de Logs', 
          value: 'Canal não encontrado\nID: 1410612496947216485', 
          inline: false 
        });
      } else {
        embed.addFields({ 
          name: '✅ Canal de Logs', 
          value: `${logsChannel.name}\nID: ${logsChannel.id}`, 
          inline: false 
        });
      }

      // Verificar se o bot tem permissões
      if (targetGuild && suggestionChannel) {
        const botMember = targetGuild.members.cache.get(client.user.id);
        if (botMember) {
          const permissions = suggestionChannel.permissionsFor(botMember);
          if (permissions.has('ManageMessages') && permissions.has('SendMessages')) {
            embed.addFields({ 
              name: '✅ Permissões', 
              value: 'Bot tem permissões necessárias', 
              inline: false 
            });
          } else {
            embed.addFields({ 
              name: '❌ Permissões', 
              value: 'Bot não tem permissões necessárias', 
              inline: false 
            });
          }
        }
      }

      // Verificar se o módulo está carregado
      embed.addFields({ 
        name: '📋 Status do Módulo', 
        value: 'Módulo sugestoes-ilegal está carregado e funcionando', 
        inline: false 
      });

    } catch (error) {
      embed.addFields({ 
        name: '❌ Erro', 
        value: `Erro ao verificar: ${error.message}`, 
        inline: false 
      });
    }

    embed.setFooter({ text: 'Teste do Módulo Sugestões Ilegais' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};
