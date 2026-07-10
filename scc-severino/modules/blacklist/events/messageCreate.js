import { config } from '../config.js';

const replyBlacklist = (message) =>
  message.reply({
    content: config.blacklistMessage,
    allowedMentions: { repliedUser: false }
  });

export const name = 'messageCreate';
export const execute = async function(message) {
  // Ignorar bots (evita loop na própria resposta)
  if (message.author.bot) return;

  try {
    // Servidor principal: player envia somente "."
    if (
      message.guild?.id === config.mainGuildId &&
      message.channel.id === config.dotCheckChannelId &&
      message.content.trim() === '.'
    ) {
      const member = message.member
        ?? await message.guild.members.fetch(message.author.id).catch(() => null);

      if (member?.roles.cache.has(config.blacklistRoleId)) {
        await replyBlacklist(message);
      }
      return;
    }

    // Servidor ilegal: menções no canal monitorado
    if (message.guild?.id !== config.ilegalGuildId) return;
    if (message.channel.id !== config.monitorChannelId) return;
    if (message.mentions.users.size === 0) return;

    const mainGuild = message.client.guilds.cache.get(config.mainGuildId);
    if (!mainGuild) {
      console.error('Servidor principal não encontrado');
      return;
    }

    for (const [userId] of message.mentions.users) {
      const member = await mainGuild.members.fetch(userId).catch(() => null);

      if (member && member.roles.cache.has(config.blacklistRoleId)) {
        await replyBlacklist(message);
        break;
      }
    }
  } catch (error) {
    console.error('Erro ao verificar blacklist:', error);
  }
};
