import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import fs from 'fs';

export const data = {
  name: 'painel-seguranca',
  description: 'Cria o painel de tickets de segurança.'
};

export async function execute(message, args, client) {
  // Canal permitido (igual ao antigo)
  const allowedChannelId = '1277774688650526734';
  if (message.channel.id !== allowedChannelId) {
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Canal Inválido')
      .setDescription('Este comando só pode ser usado no canal correto para o painel de tickets!')
      .addFields({ name: 'Canal Permitido', value: `<#${allowedChannelId}>` })
      .setTimestamp();
    return await message.reply({ embeds: [errorEmbed], ephemeral: true });
  }

  const panelEmbed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('🛡️ Painel de Tickets de Segurança')
    .setDescription(
      '**Precisa reportar um problema, denúncia ou situação confidencial?**\n\n' +
      'Clique no botão abaixo para abrir um ticket privado com a equipe de segurança.\n\n' +
      '```\n✔️ Atendimento rápido e sigiloso\n🔒 Apenas a equipe de segurança terá acesso\n📄 Você receberá um registro completo da conversa\n```'
    )
    .addFields(
      { name: 'Como funciona?', value: '1️⃣ Clique em **"🛡️ Abrir Ticket"**\n2️⃣ Descreva o motivo\n3️⃣ Aguarde o atendimento da equipe', inline: false },
      { name: 'Atenção', value: '⚠️ **Abuso do sistema pode resultar em punição. Use apenas para assuntos sérios!**', inline: false }
    )
    .setFooter({ text: 'Sistema de Segurança • Confidencialidade garantida', iconURL: 'https://cdn-icons-png.flaticon.com/512/3064/3064197.png' })
    .setImage('https://i.imgur.com/ShgYL6s.png')
    .setTimestamp();

  const ticketButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('create_ticket_panel')
      .setLabel('🛡️ Abrir Ticket')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🛡️')
  );

  await message.channel.send({
    embeds: [panelEmbed],
    components: [ticketButton]
  });
  await message.reply('✅ Painel de segurança criado com sucesso!');
} 