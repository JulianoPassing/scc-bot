import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const data = {
  name: 'painel-ticket',
  description: 'Cria o painel de tickets padrão.'
};

export async function execute(message, args, client) {
  const panelEmbed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('🎫 Painel de Tickets')
    .setDescription(
      '**Precisa de suporte ou quer falar com a staff?**\n\n' +
      'Clique no botão abaixo para abrir um ticket privado com a equipe de atendimento.\n\n' +
      '```\n✔️ Atendimento rápido\n🔒 Privacidade garantida\n📄 Você receberá um registro da conversa\n```'
    )
    .addFields(
      { name: 'Como funciona?', value: '1️⃣ Clique em **"🎫 Abrir Ticket"**\n2️⃣ Descreva o motivo\n3️⃣ Aguarde o atendimento da equipe', inline: false },
      { name: 'Atenção', value: '⚠️ **Abuso do sistema pode resultar em punição. Use apenas para assuntos sérios!**', inline: false }
    )
    .setFooter({ text: 'Sistema de Tickets', iconURL: 'https://cdn-icons-png.flaticon.com/512/3064/3064197.png' })
    .setTimestamp();

  const ticketButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('create_ticket_panel')
      .setLabel('🎫 Abrir Ticket')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎫')
  );

  await message.channel.send({
    embeds: [panelEmbed],
    components: [ticketButton]
  });
  await message.reply('✅ Painel de tickets criado com sucesso!');
} 