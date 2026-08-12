import { EmbedBuilder } from 'discord.js';
import { config } from '../config.js';
import { isRegistrado } from '../utils/storage.js';
import { parseLoginEmbed } from '../utils/parseLoginEmbed.js';

export const name = 'messageCreate';

export async function execute(message) {
  try {
    if (message.guild?.id !== config.loginGuildId) return;
    if (message.channel.id !== config.loginChannelId) return;

    const webhookId = message.webhookId ? String(message.webhookId) : null;
    const authorId = message.author?.id ? String(message.author.id) : null;
    const webhookOk = webhookId === config.loginWebhookId || authorId === config.loginWebhookId;
    if (!webhookOk) return;

    const embeds = message.embeds || [];
    if (!embeds.length) return;

    for (const embed of embeds) {
      const parsed = parseLoginEmbed(embed);
      if (!parsed?.discordId) continue;
      if (!isRegistrado(parsed.discordId)) continue;

      const alertChannel =
        message.client.channels.cache.get(config.commandsChannelId) ??
        (await message.client.channels.fetch(config.commandsChannelId).catch(() => null));

      if (!alertChannel) {
        console.error('[aviso-login] Canal de comandos não encontrado:', config.commandsChannelId);
        return;
      }

      const alertEmbed = new EmbedBuilder()
        .setColor('#2ECC71')
        .setTitle('🟢 Player logou')
        .setDescription(
          `O usuário <@${parsed.discordId}> (\`${parsed.discordId}\`) acabou de logar.`
        )
        .addFields(
          ...(parsed.playerName
            ? [{ name: 'Player', value: parsed.playerName, inline: true }]
            : []),
          ...(parsed.coordenadas
            ? [{ name: 'Coordenadas', value: `\`${parsed.coordenadas}\``, inline: true }]
            : []),
          {
            name: 'Log',
            value: `[Ir para a mensagem](${message.url})`,
            inline: false,
          }
        )
        .setFooter({ text: 'SCC • Aviso de Login' })
        .setTimestamp();

      await alertChannel.send({
        content: `<@&${config.staffRoleId}>`,
        embeds: [alertEmbed],
        allowedMentions: { roles: [config.staffRoleId] },
      });

      console.log(`[aviso-login] Aviso enviado para Discord ID ${parsed.discordId}`);
      return;
    }
  } catch (error) {
    console.error('[aviso-login] Erro ao processar log de login:', error);
  }
}
