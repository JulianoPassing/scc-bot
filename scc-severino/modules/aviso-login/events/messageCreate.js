import { EmbedBuilder } from 'discord.js';
import { config } from '../config.js';
import { isRegistrado } from '../utils/storage.js';
import { parseLoginEmbed } from '../utils/parseLoginEmbed.js';

export const name = 'messageCreate';

const truncate = (text, max = 900) => {
  const value = String(text ?? '');
  if (value.length <= max) return value || '(vazio)';
  return `${value.slice(0, max)}…`;
};

const summarizeEmbed = (embed, index) => {
  const fields = (embed.fields || [])
    .map((f) => `• ${f.name}: ${truncate(f.value, 120)}`)
    .join('\n');

  const parsed = parseLoginEmbed(embed);

  return {
    index,
    title: embed.title || '(sem title)',
    description: truncate(embed.description, 700),
    fields: fields || '(sem fields)',
    parsed,
  };
};

export async function execute(message) {
  try {
    if (message.guild?.id !== config.loginGuildId) return;
    if (message.channel.id !== config.loginChannelId) return;

    const webhookId = message.webhookId ? String(message.webhookId) : null;
    const authorId = message.author?.id ? String(message.author.id) : null;
    const webhookOk = webhookId === config.loginWebhookId || authorId === config.loginWebhookId;
    const embeds = message.embeds || [];

    if (config.debug) {
      const embedSummaries = embeds.map((embed, i) => summarizeEmbed(embed, i));

      console.log('========== [aviso-login DEBUG] ==========');
      console.log('guildId:', message.guild?.id);
      console.log('channelId:', message.channel.id);
      console.log('messageId:', message.id);
      console.log('author.id:', authorId);
      console.log('author.tag:', message.author?.tag);
      console.log('author.bot:', message.author?.bot);
      console.log('webhookId:', webhookId);
      console.log('webhook esperado:', config.loginWebhookId);
      console.log('webhookOk:', webhookOk);
      console.log('content:', truncate(message.content, 200));
      console.log('embeds.length:', embeds.length);
      for (const summary of embedSummaries) {
        console.log(`--- embed[${summary.index}] ---`);
        console.log('title:', summary.title);
        console.log('description:', summary.description);
        console.log('fields:\n' + summary.fields);
        console.log('parsed:', summary.parsed);
        if (summary.parsed?.discordId) {
          console.log('isRegistrado:', isRegistrado(summary.parsed.discordId));
        }
      }
      console.log('=========================================');

      const alertChannel =
        message.client.channels.cache.get(config.commandsChannelId) ??
        (await message.client.channels.fetch(config.commandsChannelId).catch(() => null));

      if (alertChannel) {
        const first = embedSummaries[0];
        const debugEmbed = new EmbedBuilder()
          .setColor('#3498DB')
          .setTitle('🧪 DEBUG aviso-login')
          .setDescription('Mensagem lida no canal de login.')
          .addFields(
            {
              name: 'Autor',
              value: `\`${authorId || 'null'}\` (${message.author?.tag || 'N/A'})`,
              inline: true,
            },
            {
              name: 'webhookId',
              value: `\`${webhookId || 'null'}\``,
              inline: true,
            },
            {
              name: 'Webhook OK?',
              value: webhookOk ? '✅ sim' : '❌ não',
              inline: true,
            },
            {
              name: 'Embeds',
              value: String(embeds.length),
              inline: true,
            },
            {
              name: 'Parse Discord ID',
              value: first?.parsed?.discordId
                ? `\`${first.parsed.discordId}\` ${isRegistrado(first.parsed.discordId) ? '(registrado)' : '(NÃO registrado)'}`
                : '`não extraído`',
              inline: false,
            },
            {
              name: 'Description (recorte)',
              value: `\`\`\`\n${truncate(first?.description || '(sem embed)', 900)}\n\`\`\``,
              inline: false,
            },
            {
              name: 'Fields (recorte)',
              value: `\`\`\`\n${truncate(first?.fields || '(sem fields)', 900)}\n\`\`\``,
              inline: false,
            }
          )
          .setFooter({ text: `msg ${message.id} • DEBUG temporário` })
          .setTimestamp();

        await alertChannel.send({ embeds: [debugEmbed] }).catch((err) => {
          console.error('[aviso-login] Falha ao enviar debug no canal de comandos:', err.message);
        });
      }
    }

    // Fora do debug, ignora webhook errado. No debug, ainda tenta avisar se bater.
    if (!webhookOk) return;
    if (!embeds.length) return;

    for (const embed of embeds) {
      const parsed = parseLoginEmbed(embed);
      if (!parsed?.discordId) continue;
      if (!isRegistrado(parsed.discordId)) {
        if (config.debug) {
          console.log(`[aviso-login] ID ${parsed.discordId} lido, mas NÃO está registrado.`);
        }
        continue;
      }

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
