import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { config } from '../config.js';
import { listRegistrados } from '../utils/storage.js';

export const data = {
  name: 'avisar-lista',
  description: 'Lista os Discord IDs registrados para aviso de login',
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

  const lista = listRegistrados();

  if (lista.length === 0) {
    return message.reply('📭 Nenhum Discord ID registrado para aviso de login.');
  }

  const lines = lista.map((item, index) => {
    const when = item.addedAt
      ? `<t:${Math.floor(new Date(item.addedAt).getTime() / 1000)}:R>`
      : '—';
    return `**${index + 1}.** <@${item.discordId}> (\`${item.discordId}\`)\n└ Registrado por <@${item.addedBy}> • ${when}`;
  });

  // Discord embed description max ~4096 chars
  const chunks = [];
  let current = '';
  for (const line of lines) {
    if ((current + line + '\n\n').length > 3900) {
      chunks.push(current);
      current = '';
    }
    current += `${line}\n\n`;
  }
  if (current) chunks.push(current);

  for (let i = 0; i < chunks.length; i++) {
    const embed = new EmbedBuilder()
      .setColor('#EAF207')
      .setTitle(
        chunks.length > 1
          ? `📋 IDs registrados (${i + 1}/${chunks.length})`
          : `📋 IDs registrados (${lista.length})`
      )
      .setDescription(chunks[i])
      .setFooter({ text: 'SCC • Aviso de Login' })
      .setTimestamp();

    if (i === 0) await message.reply({ embeds: [embed] });
    else await message.channel.send({ embeds: [embed] });
  }
}
