import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const data = {
  name: 'painel-ticket',
  description: 'Cria o painel de tickets padrão.'
};

export async function execute(message, args, client) {
  const embed = new EmbedBuilder()
    .setColor('#0099FF')
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
      '🏠 **Casas**\nQuestões relacionadas a casas e propriedades\n'
    )
    .setImage('https://i.imgur.com/ShgYL6s.png')
    .setFooter({ text: 'StreetCarClub • Atendimento de Qualidade | ™ Street CarClub © All rights reserved', iconURL: null })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_suporte')
      .setLabel('Suporte')
      .setStyle(ButtonStyle.Primary)
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
      .setStyle(ButtonStyle.Primary)
      .setEmoji('💎'),
    new ButtonBuilder()
      .setCustomId('ticket_boost')
      .setLabel('Boost')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🚀'),
    new ButtonBuilder()
      .setCustomId('ticket_casas')
      .setLabel('Casas')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🏠')
  );

  await message.channel.send({ embeds: [embed], components: [row1, row2] });
  await message.reply('✅ Painel de tickets criado!');
} 