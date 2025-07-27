import { EmbedBuilder } from 'discord.js';
import { CATEGORY_CONFIG } from '../config.js';

export const data = {
  name: 'limpar-tickets',
  description: 'Remove tickets antigos e fechados das categorias.'
};

export async function execute(message, args, client) {
  const guild = message.guild;
  
  // Verificar se o usuário tem permissão de admin
  const hasAdminRole = message.member.roles.cache.some(role => 
    ['1226903187055972484', '1226907937117569128', '1230131375965737044', '1046404063522197521'].includes(role.id)
  );

  if (!hasAdminRole) {
    return message.reply('❌ Você não tem permissão para usar este comando. Apenas administradores podem limpar tickets.');
  }

  // Obter dias para considerar ticket como antigo (padrão: 7 dias)
  const dias = parseInt(args[0]) || 7;
  
  if (dias < 1 || dias > 30) {
    return message.reply('❌ Por favor, especifique um número de dias entre 1 e 30.');
  }

  const embed = new EmbedBuilder()
    .setColor('#FF6B6B')
    .setTitle('🧹 Limpeza de Tickets Antigos')
    .setDescription(`Procurando tickets com mais de ${dias} dias...`)
    .setTimestamp();

  const statusMsg = await message.reply({ embeds: [embed] });

  let ticketsRemovidos = 0;
  let categoriasProcessadas = 0;
  const dataLimite = new Date(Date.now() - (dias * 24 * 60 * 60 * 1000));

  for (const [categoria, config] of Object.entries(CATEGORY_CONFIG)) {
    try {
      const category = await guild.channels.fetch(config.id);
      if (!category || category.type !== 4) continue;

      const channelsInCategory = guild.channels.cache.filter(
        channel => channel.parentId === config.id && channel.name.includes('ticket')
      );

      let ticketsCategoria = 0;

      for (const channel of channelsInCategory.values()) {
        try {
          // Verificar se o canal foi criado antes da data limite
          if (channel.createdAt < dataLimite) {
            // Verificar se o canal está inativo (última mensagem antiga)
            const messages = await channel.messages.fetch({ limit: 1 });
            const lastMessage = messages.first();
            
            if (!lastMessage || lastMessage.createdAt < dataLimite) {
              await channel.delete('Limpeza automática de ticket antigo');
              ticketsRemovidos++;
              ticketsCategoria++;
            }
          }
        } catch (error) {
          console.error(`Erro ao processar canal ${channel.name}:`, error);
        }
      }

      if (ticketsCategoria > 0) {
        embed.addFields({
          name: `${config.emoji} ${config.name}`,
          value: `${ticketsCategoria} tickets removidos`,
          inline: true
        });
      }

      categoriasProcessadas++;

    } catch (error) {
      console.error(`Erro ao processar categoria ${categoria}:`, error);
    }
  }

  // Atualizar embed com resultados
  embed.setColor(ticketsRemovidos > 0 ? '#00FF00' : '#FFA500')
    .setDescription(`Limpeza concluída!\n\n**Resultados:**\n• Tickets removidos: **${ticketsRemovidos}**\n• Categorias processadas: **${categoriasProcessadas}**\n• Critério: tickets com mais de ${dias} dias`);

  if (ticketsRemovidos === 0) {
    embed.addFields({
      name: 'ℹ️ Informação',
      value: 'Nenhum ticket antigo foi encontrado para remoção.',
      inline: false
    });
  } else {
    embed.addFields({
      name: '✅ Sucesso',
      value: `A limpeza foi concluída com sucesso! ${ticketsRemovidos} tickets antigos foram removidos.`,
      inline: false
    });
  }

  await statusMsg.edit({ embeds: [embed] });
} 