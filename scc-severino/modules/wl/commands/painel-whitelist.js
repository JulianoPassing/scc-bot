import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const data = {
  name: 'painel-whitelist',
  description: 'Cria o painel de whitelist.'
};

export async function execute(message, args, client) {
  if (!message.member.permissions.has('Administrator')) return message.reply('❌ Você não tem permissão!');
  const embed = new EmbedBuilder()
    .setTitle('📝 Whitelist Street Car Club')
    .setDescription(
      '**Bem-vindo ao processo de whitelist!**\n\n' +
        'Ao clicar em **Iniciar Whitelist**, se ainda não tiver **idade verificada**, abre primeiro a **verificação etária** (18+). Ao **confirmar**, o **formulário da whitelist abre na sequência**, sem precisar clicar de novo.\n\n' +
        'Para fazer parte do nosso servidor de GTA RP, você precisa passar por um formulário de perguntas.\n\n' +
        '⚠️ **IMPORTANTE:**\n' +
        '• Questões 5 a 12 são obrigatórias\n' +
        '• É necessário acertar TODAS para ser aprovado\n' +
        '• Você tem 2 tentativas com cooldown de 24h\n\n' +
        'Clique no botão abaixo para começar.'
    )
    .setColor(0x00ff00)
    .setFooter({ text: 'Street Car Club • Sistema de Whitelist' });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('iniciar_wl')
      .setLabel('🎯 Iniciar Whitelist')
      .setStyle(ButtonStyle.Success)
  );
  await message.channel.send({ embeds: [embed], components: [row] });
  await message.reply('✅ Painel de whitelist criado!');
} 