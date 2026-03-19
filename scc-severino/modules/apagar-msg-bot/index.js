/**
 * Módulo para apagar a mensagem de boas-vindas do agendamento em TODOS os canais/servidores
 * Comando: !apagar-msg-bot
 * Remove "Olá! Para agendar sua entrevista escreva `agendamento` aqui."
 * Só lê as 100 mensagens mais recentes por canal (a msg está sempre no topo).
 */

const BOT_ID = '1413346434102595646';

const MSG_MATCH = 'Para agendar sua entrevista escreva';

const ALLOWED_ROLES = ['1046404063689977985', '1046404063689977984'];

// Canais em paralelo
const CONCURRENCY = 20;

// Só as 100 msgs mais recentes (a msg de boas-vindas está sempre no topo)
const MSGS_PER_CHANNEL = 100;

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

function isTargetMessage(msg, botId) {
  return (
    msg.author?.id === botId &&
    msg.content?.includes(MSG_MATCH)
  );
}

async function withRetry(fn) {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err.code === 50013 || err.code === 50001 || err.httpStatus === 403) return null;
      const isRateLimit = err.httpStatus === 429 || err.code === 'RateLimitError';
      if (isRateLimit && i < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY * (i + 1)));
        continue;
      }
      throw err;
    }
  }
}

async function processChannel(channel, botId) {
  let deleted = 0;
  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

  try {
    channel.messages.cache.clear();

    const messages = await withRetry(async () =>
      channel.messages.fetch({ limit: MSGS_PER_CHANNEL, cache: false })
    );

    if (!messages || messages.size === 0) return 0;

    const toDelete = messages.filter((m) => isTargetMessage(m, botId));
    if (toDelete.size === 0) return 0;

    const recent = [];
    const old = [];

    for (const [, msg] of toDelete) {
      const age = Date.now() - msg.createdTimestamp;
      if (age < FOURTEEN_DAYS_MS) {
        recent.push(msg);
      } else {
        old.push(msg);
      }
    }

    if (recent.length > 0) {
      try {
        await withRetry(() => channel.bulkDelete(recent));
        deleted += recent.length;
      } catch {
        for (const msg of recent) {
          const ok = await withRetry(() => msg.delete().then(() => true));
          if (ok) deleted++;
          await new Promise((r) => setTimeout(r, 150));
        }
      }
    }

    for (const msg of old) {
      const ok = await withRetry(() => msg.delete().then(() => true));
      if (ok) deleted++;
      await new Promise((r) => setTimeout(r, 150));
    }
  } catch {
    // Sem permissão — ignora
  }

  return deleted;
}

const setupApagarMsgBotModule = function (client) {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.toLowerCase().trim() !== '!apagar-msg-bot') return;

    const hasPermission = message.member.roles.cache.some((role) =>
      ALLOWED_ROLES.includes(role.id)
    );

    if (!hasPermission) {
      await message.reply('**❌ Você não tem permissão para usar este comando.**');
      return;
    }

    try {
      const confirmMessage = await message.reply(
        '**⚠️ Apagar essa mensagem de boas-vindas em TODOS os canais e servidores? Digite `CONFIRMAR` em 10 segundos.**'
      );

      const filter = (response) =>
        response.author.id === message.author.id &&
        response.content.toUpperCase() === 'CONFIRMAR';

      const collector = message.channel.createMessageCollector({
        filter,
        time: 10000,
        max: 1,
      });

      collector.on('collect', async (response) => {
        try {
          await confirmMessage.delete().catch(() => {});
          await response.delete().catch(() => {});

          const botId = client.user?.id || BOT_ID;
          const statusMsg = await message.channel.send(
            '**🧹 Buscando canais...**'
          );

          const channels = [];

          for (const [, guild] of client.guilds.cache) {
            try {
              await guild.channels.fetch();
              const activeThreads = await guild.channels.fetchActiveThreads().catch(() => null);

              for (const [, ch] of guild.channels.cache) {
                if (ch.isTextBased() && !ch.isDMBased() && !ch.isThread()) {
                  channels.push(ch);
                }
              }

              if (activeThreads?.threads) {
                for (const [, thread] of activeThreads.threads) {
                  if (thread.isTextBased()) channels.push(thread);
                }
              }
            } catch {}
          }

          await statusMsg.edit(
            `**🧹 ${channels.length} canais. Só as ${MSGS_PER_CHANNEL} msgs mais recentes por canal.**`
          ).catch(() => {});

          let totalDeleted = 0;

          for (let i = 0; i < channels.length; i += CONCURRENCY) {
            const batch = channels.slice(i, i + CONCURRENCY);
            const results = await Promise.all(
              batch.map((ch) => processChannel(ch, botId))
            );
            const batchDeleted = results.reduce((a, b) => a + b, 0);
            totalDeleted += batchDeleted;

            const lote = Math.floor(i / CONCURRENCY) + 1;
            const totalLotes = Math.ceil(channels.length / CONCURRENCY);
            await statusMsg.edit(
              `**🧹 Lote ${lote}/${totalLotes}**\n` +
              `Total: ${totalDeleted} removida(s)`
            ).catch(() => {});

            await new Promise((r) => setTimeout(r, 100));
          }

          await statusMsg.delete().catch(() => {});
          await message.channel.send(
            `**✅ Concluído! ${totalDeleted} mensagem(ns) removida(s) em todos os servidores.**`
          );
        } catch (error) {
          console.error('Erro ao apagar mensagens do bot:', error);
          await message.channel.send(
            '**❌ Ocorreu um erro ao apagar as mensagens.**'
          );
        }
      });

      collector.on('end', async (collected) => {
        if (collected.size === 0) {
          await confirmMessage.edit(
            '**⏰ Tempo esgotado. Operação cancelada.**'
          ).catch(() => {});
        }
      });
    } catch (error) {
      console.error('Erro no comando apagar-msg-bot:', error);
      await message.reply('**❌ Ocorreu um erro ao processar o comando.**');
    }
  });
};

export default setupApagarMsgBotModule;
