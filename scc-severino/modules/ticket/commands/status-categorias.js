import { EmbedBuilder } from 'discord.js';
import { CATEGORY_CONFIG } from '../config.js';
import { isCategoryFull } from '../utils/ticketUtils.js';

export const data = {
  name: 'status-categorias',
  description: 'Verifica o status das categorias de ticket.'
};

export async function execute(message, args, client) {
  const guild = message.guild;
  
  // Verificar se o usuário tem permissão de staff
  const hasStaffRole = message.member.roles.cache.some(role => 
    Object.values(CATEGORY_CONFIG).some(config => 
      config.staffRoles.includes(role.id)
    )
  );

  if (!hasStaffRole) {
    return message.reply('❌ Você não tem permissão para usar este comando.');
  }

  const embed = new EmbedBuilder()
    .setColor('#0099FF')
    .setTitle('📊 Status das Categorias de Ticket')
    .setDescription('Informações sobre o uso das categorias de ticket')
    .setTimestamp();

  let totalTickets = 0;
  let categoriasCheias = 0;

  for (const [categoria, config] of Object.entries(CATEGORY_CONFIG)) {
    try {
      const category = await guild.channels.fetch(config.id);
      if (!category || category.type !== 4) {
        embed.addFields({
          name: `${config.emoji} ${config.name}`,
          value: '❌ Categoria não encontrada',
          inline: true
        });
        continue;
      }

      const channelsInCategory = guild.channels.cache.filter(
        channel => channel.parentId === config.id
      );

      const isFull = await isCategoryFull(config.id, guild);
      const status = isFull ? '🔴 CHEIA' : '🟢 Disponível';
      const progress = `${channelsInCategory.size}/50`;

      if (isFull) categoriasCheias++;
      totalTickets += channelsInCategory.size;

      embed.addFields({
        name: `${config.emoji} ${config.name}`,
        value: `${status}\n${progress} tickets\n${config.description}`,
        inline: true
      });

    } catch (error) {
      console.error(`Erro ao verificar categoria ${categoria}:`, error);
      embed.addFields({
        name: `${config.emoji} ${config.name}`,
        value: '❌ Erro ao verificar',
        inline: true
      });
    }
  }

  // Adicionar resumo geral
  embed.addFields({
    name: '📈 Resumo Geral',
    value: `Total de tickets: **${totalTickets}**\nCategorias cheias: **${categoriasCheias}**\nCategorias disponíveis: **${Object.keys(CATEGORY_CONFIG).length - categoriasCheias}**`,
    inline: false
  });

  // Adicionar recomendações se houver categorias cheias
  if (categoriasCheias > 0) {
    embed.addFields({
      name: '⚠️ Recomendações',
      value: '• Considere fechar tickets antigos\n• Crie uma nova categoria se necessário\n• Os novos tickets serão criados no topo do servidor',
      inline: false
    });
  }

  await message.reply({ embeds: [embed] });
} 