import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { CATEGORY_CONFIG } from '../config.js';

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
      `${CATEGORY_CONFIG.suporte.emoji} **${CATEGORY_CONFIG.suporte.nome}**\n${CATEGORY_CONFIG.suporte.desc}\n` +
      `${CATEGORY_CONFIG.bugs.emoji} **${CATEGORY_CONFIG.bugs.nome}**\n${CATEGORY_CONFIG.bugs.desc}\n` +
      `${CATEGORY_CONFIG.denuncias.emoji} **${CATEGORY_CONFIG.denuncias.nome}**\n${CATEGORY_CONFIG.denuncias.desc}\n` +
      `${CATEGORY_CONFIG.doacoes.emoji} **${CATEGORY_CONFIG.doacoes.nome}**\n${CATEGORY_CONFIG.doacoes.desc}\n` +
      `${CATEGORY_CONFIG.boost.emoji} **${CATEGORY_CONFIG.boost.nome}**\n${CATEGORY_CONFIG.boost.desc}\n` +
      `${CATEGORY_CONFIG.casas.emoji} **${CATEGORY_CONFIG.casas.nome}**\n${CATEGORY_CONFIG.casas.desc}\n`
    )
    .setImage('https://i.imgur.com/ShgYL6s.png')
    .setFooter({ text: 'StreetCarClub • Atendimento de Qualidade | ™ Street CarClub © All rights reserved', iconURL: null })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_suporte')
      .setLabel('Suporte')
      .setStyle(ButtonStyle.Primary)
      .setEmoji(CATEGORY_CONFIG.suporte.emoji),
    new ButtonBuilder()
      .setCustomId('ticket_bugs')
      .setLabel('Reportar Bugs')
      .setStyle(ButtonStyle.Success)
      .setEmoji(CATEGORY_CONFIG.bugs.emoji),
    new ButtonBuilder()
      .setCustomId('ticket_denuncias')
      .setLabel('Denúncias')
      .setStyle(ButtonStyle.Danger)
      .setEmoji(CATEGORY_CONFIG.denuncias.emoji)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_doacoes')
      .setLabel('Doações')
      .setStyle(ButtonStyle.Primary)
      .setEmoji(CATEGORY_CONFIG.doacoes.emoji),
    new ButtonBuilder()
      .setCustomId('ticket_boost')
      .setLabel('Boost')
      .setStyle(ButtonStyle.Primary)
      .setEmoji(CATEGORY_CONFIG.boost.emoji),
    new ButtonBuilder()
      .setCustomId('ticket_casas')
      .setLabel('Casas')
      .setStyle(ButtonStyle.Primary)
      .setEmoji(CATEGORY_CONFIG.casas.emoji)
  );

  await message.channel.send({ embeds: [embed], components: [row1, row2] });
  await message.reply('✅ Painel de tickets criado!');
} 