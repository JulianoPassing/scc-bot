import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { config } from '../config.js';
import { addRegistrado } from '../utils/storage.js';

const isValidDiscordId = (id) => /^\d{15,20}$/.test(id);

export const data = {
  name: 'avisar',
  description: 'Registra um Discord ID para aviso quando o player logar',
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
      '❌ Informe um Discord ID válido.\nExemplo: `!avisar 1170648802219274412`'
    );
  }

  const result = addRegistrado(rawId, message.author.id);
  if (!result.ok) {
    return message.reply(`⚠️ O ID \`${rawId}\` já está registrado para aviso de login.`);
  }

  const embed = new EmbedBuilder()
    .setColor('#EAF207')
    .setTitle('🔔 Aviso de login registrado')
    .setDescription(`Quando <@${rawId}> (\`${rawId}\`) logar no servidor, o staff será avisado.`)
    .addFields(
      { name: 'Discord ID', value: `\`${rawId}\``, inline: true },
      { name: 'Registrado por', value: `<@${message.author.id}>`, inline: true }
    )
    .setFooter({ text: 'SCC • Aviso de Login' })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}
