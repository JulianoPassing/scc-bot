import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const data = {
  name: 'painel-ticket',
  description: 'Cria o painel de tickets padrão.'
};

export async function execute(message, args, client) {
  const embed = new EmbedBuilder()
            .setColor('#EAF207')
    .setTitle('📑 Central de Atendimento - StreetCarClub')
    .setDescription(
      'Bem-vindo à nossa Central de Atendimento!\n\n' +
      'Abra um ticket para receber suporte personalizado da nossa equipe. Selecione a categoria que melhor se encaixa na sua necessidade no menu abaixo.\n\n' +
      '❗ **Importante:** Evite marcar a equipe. Você será atendido o mais breve possível.\n\n' +
      '📁 **Suporte**\nSuporte técnico e ajuda geral\n' +
      '🦠 **Reportar Bugs**\nReportar erros e problemas técnicos\n' +
      '⚠️ **Denúncias**\nReportar infrações e problemas de conduta\n' +
      '💎 **Doações**\nAssuntos relacionados a doações\n' +
      '🚀 **Boost**\nSuporte para membros boosters\n' +
      '🏠 **Casas**\nQuestões relacionadas a casas e propriedades\n' +
      '🔍 **Revisão**\nSolicitar revisão de advertências e banimentos\n'
    )
    .setImage('https://i.imgur.com/aawPk38.png')
    .setFooter({ text: 'StreetCarClub • Atendimento de Qualidade | ™ Street CarClub © All rights reserved', iconURL: null })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_suporte')
      .setLabel('Suporte')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📁'),
    new ButtonBuilder()
      .setCustomId('ticket_bugs')
      .setLabel('Reportar Bugs')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🦠'),
    new ButtonBuilder()
      .setCustomId('ticket_denuncias')
      .setLabel('Denúncias')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('⚠️')
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_doacoes')
      .setLabel('Doações')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('💎'),
    new ButtonBuilder()
      .setCustomId('ticket_boost')
      .setLabel('Boost')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🚀'),
    new ButtonBuilder()
      .setCustomId('ticket_casas')
      .setLabel('Casas')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🏠')
  );
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_revisao')
      .setLabel('Revisão')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔍')
  );

  await message.channel.send({ embeds: [embed], components: [row1, row2, row3] });
  await message.reply('✅ Painel de tickets criado!');
} 