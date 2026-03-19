/**
 * Módulo para apagar a mensagem de boas-vindas do agendamento em TODOS os canais/servidores
 * Comando: !apagar-msg-bot
 * Remove "Olá! Para agendar sua entrevista escreva `agendamento` aqui." em todo o Discord
 */

const BOT_ID = '1413346434102595646';

// Match flexível: mensagem do bot que contém esse texto
const MSG_MATCH = 'Para agendar sua entrevista escreva';

// IDs dos cargos permitidos (mesmos do limparchat)
const ALLOWED_ROLES = ['1046404063689977985', '1046404063689977984'];

// Canais processados em paralelo
const CONCURRENCY = 12;

// Retry em caso de rate limit (429)
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

function isTargetMessage(msg, botId) {
  return (
    msg.author?.id === botId &&
    msg.content?.includes(MSG_MATCH)
  );
}

async function withRetry(fn, skipOnPermission = true) {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return await fn();
    } catch (err) {
      if (skipOnPermission && (err.code === 50013 || err.code === 50001 || err.httpStatus === 403)) {
        return null;
      }
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
    let lastId = null;

    while (true) {
      const messages = await withRetry(async () => {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;
        return channel.messages.fetch(options);
      });

      if (!messages || messages.size === 0) break;

      const toDelete = messages.filter((m) => isTargetMessage(m, botId));

      if (toDelete.size > 0) {
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
          const bulkOk = await withRetry(() => channel.bulkDelete(recent));
          if (bulkOk !== null) {
            deleted += recent.length;
          } else {
            for (const msg of recent) {
              const ok = await withRetry(() => msg.delete().then(() => true));
              if (ok) deleted++;
              await new Promise((r) => setTimeout(r, 200));
            }
          }
        }

        for (const msg of old) {
          const ok = await withRetry(() => msg.delete().then(() => true));
          if (ok) deleted++;
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      lastId = messages.last()?.id;
      if (messages.size < 100) break;

      await new Promise((r) => setTimeout(r, 150));
    }
  } catch {
    // Sem permissão ou outro erro — ignora
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
            '**🧹 Buscando canais e threads em todos os servidores...**'
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
            `**🧹 Varrendo ${channels.length} canais/threads...**`
          ).catch(() => {});

          let totalDeleted = 0;

          for (let i = 0; i < channels.length; i += CONCURRENCY) {
            const batch = channels.slice(i, i + CONCURRENCY);
            const results = await Promise.all(
              batch.map((ch) => processChannel(ch, botId))
            );
            totalDeleted += results.reduce((a, b) => a + b, 0);

            if (i > 0 && i % (CONCURRENCY * 3) === 0) {
              await statusMsg.edit(
                `**🧹 Varrendo... ${totalDeleted} removida(s) até agora.**`
              ).catch(() => {});
            }
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
