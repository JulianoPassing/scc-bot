import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';

export default {
  data: {
    name: 'painel-avaliacao',
    description: 'Cria um painel de avaliações para o servidor',
    defaultMemberPermissions: PermissionFlagsBits.ManageMessages
  },
  
  async execute(message, args, client) {
    try {
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('⭐ Sistema de Avaliações')
        .setDescription('Avalie sua experiência no servidor **Street Car Club**!\n\nClique em uma das estrelas abaixo para avaliar de 1 a 5 estrelas.')
        .addFields(
          { name: '📊 Como funciona?', value: '• Você pode avaliar uma vez por dia\n• Sua avaliação ajuda a melhorar o servidor\n• Comentários são opcionais mas muito bem-vindos!', inline: false },
          { name: '🎯 Objetivo', value: 'Manter a qualidade do servidor e melhorar a experiência de todos os membros.', inline: false }
        )
        .setFooter({ text: 'Street Car Club • Sistema de Avaliações' })
        .setTimestamp();

      const buttons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('rate_1')
            .setLabel('1 ⭐')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('rate_2')
            .setLabel('2 ⭐')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('rate_3')
            .setLabel('3 ⭐')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('rate_4')
            .setLabel('4 ⭐')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('rate_5')
            .setLabel('5 ⭐')
            .setStyle(ButtonStyle.Secondary)
        );

      await message.channel.send({
        embeds: [embed],
        components: [buttons]
      });

      // Deletar o comando original
      if (message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
        await message.delete().catch(() => {});
      }

    } catch (error) {
      console.error('[AVALIACOES][PAINEL] Erro:', error);
      await message.reply('❌ Ocorreu um erro ao criar o painel de avaliações.');
    }
  }
}; 