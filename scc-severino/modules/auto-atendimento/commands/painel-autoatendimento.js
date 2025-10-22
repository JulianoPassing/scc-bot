import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const config = JSON.parse(readFileSync(join(__dirname, '../config.json'), 'utf8'));

export default {
  data: {
    name: 'painel-autoatendimento',
    description: 'Cria o painel de auto-atendimento',
  },

  async execute(message, args) {
    // Verifica se está no servidor e canal corretos
    if (message.guild.id !== config.serverId) {
      return message.reply('❌ Este comando só pode ser usado no servidor correto.');
    }

    if (message.channel.id !== config.panelChannelId) {
      return message.reply(`❌ Este comando só pode ser usado no canal <#${config.panelChannelId}>.`);
    }

    // Verifica permissões (administrador ou permissão de gerenciar canais)
    if (!message.member.permissions.has('ManageChannels')) {
      return message.reply('❌ Você não tem permissão para usar este comando.');
    }

    // Cria o embed do painel
    const embed = new EmbedBuilder()
      .setTitle('🤖 Sistema de Auto-Atendimento')
      .setDescription(
        '**Bem-vindo ao sistema de auto-atendimento!**\n\n' +
        'Selecione abaixo o tipo de problema que você está enfrentando:\n\n' +
        '🌫️ **Limbo** - Caso você tenha caído no limbo\n' +
        '🚗 **Guincho** - Caso seu veículo precise de guincho\n\n' +
        '**Nosso sistema automatizado irá te ajudar rapidamente!**'
      )
      .setColor('#00FF00')
      .setFooter({ text: 'Clique no botão correspondente ao seu problema' })
      .setTimestamp();

    // Cria os botões
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('autoatend_limbo')
          .setLabel('Limbo')
          .setEmoji('🌫️')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('autoatend_guincho')
          .setLabel('Guincho')
          .setEmoji('🚗')
          .setStyle(ButtonStyle.Success)
      );

    // Envia a mensagem do painel
    await message.channel.send({
      embeds: [embed],
      components: [row]
    });

    // Deleta a mensagem de comando se possível
    if (message.deletable) {
      await message.delete().catch(() => {});
    }
  }
}

