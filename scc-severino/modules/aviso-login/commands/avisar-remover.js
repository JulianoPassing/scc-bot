import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { config } from '../config.js';
import { removeRegistrado } from '../utils/storage.js';

const isValidDiscordId = (id) => /^\d{15,20}$/.test(id);

export const data = {
  name: 'avisar-remover',
  description: 'Remove um Discord ID da lista de aviso de login',
};

export async function execute(message) {
  if (message.guild?.id !== config.staffGuildId) return;
  if (message.channel.id !== config.commandsChannelId) {
    return message.reply('❌ Use este comando apenas no canal de comandos de aviso de login.');
  }

  const member = message.member;
  if (!member?.roles.cache.has(config.staffRoleId) && !member?.permissions.has(PermissionFlagsBits.Administrator)) {
    return message.reply('❌ Você precisa do cargo de staff para usar este comando.');
  }

  const args = message.content.slice(1).trim().split(/ +/).slice(1);
  const rawId = (args[0] || '').replace(/[<@!>]/g, '').trim();

  if (!rawId || !isValidDiscordId(rawId)) {
    return message.reply(
      '❌ Informe o Discord ID para remover.\nExemplo: `!avisar-remover 1170648802219274412`'
    );
  }

  const result = removeRegistrado(rawId);
  if (!result.ok) {
    return message.reply(`⚠️ O ID \`${rawId}\` não está na lista de avisos.`);
  }

  const embed = new EmbedBuilder()
    .setColor('#E74C3C')
    .setTitle('🗑️ Aviso de login removido')
    .setDescription(`O ID <@${rawId}> (\`${rawId}\`) foi removido da lista.`)
    .addFields({ name: 'Removido por', value: `<@${message.author.id}>`, inline: true })
    .setFooter({ text: 'SCC • Aviso de Login' })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}
