/**
 * Módulo para apagar a mensagem de boas-vindas do agendamento em TODOS os canais/servidores
 * Comando: !apagar-msg-bot
 * Remove "Olá! Para agendar sua entrevista escreva `agendamento` aqui."
 * Processa bloco a bloco, limpando cache entre leituras.
 */

const BOT_ID = '1413346434102595646';

const MSG_MATCH = 'Para agendar sua entrevista escreva';

const ALLOWED_ROLES = ['1046404063689977985', '1046404063689977984'];

// Bloco de leitura (mensagens por fetch)
const BLOCK_SIZE = 100;

// Máximo de mensagens apagadas por vez (bulk delete aceita até 100, mas menor = mais estável)
const DELETE_BATCH = 50;

// Pausa entre blocos (evita rate limit e deixa cache "respirar")
const DELAY_BETWEEN_BLOCKS = 1500;

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

async function processChannel(channel, botId, onBlock, totalSoFar) {
  let deleted = 0;
  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

  try {
    let lastId = null;
    let blockNum = 0;

    while (true) {
      blockNum++;
      channel.messages.cache.clear();

      const messages = await withRetry(async () => {
        const options = { limit: BLOCK_SIZE, cache: false };
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

        for (let i = 0; i < recent.length; i += DELETE_BATCH) {
          const batch = recent.slice(i, i + DELETE_BATCH);
          const ok = await withRetry(() => channel.bulkDelete(batch));
          if (ok !== null) {
            deleted += batch.length;
            if (onBlock) onBlock(deleted, blockNum, channel.name, totalSoFar);
            await new Promise((r) => setTimeout(r, 800));
          } else {
            for (const msg of batch) {
              const ok2 = await withRetry(() => msg.delete().then(() => true));
              if (ok2) deleted++;
              await new Promise((r) => setTimeout(r, 300));
            }
            if (onBlock) onBlock(deleted, blockNum, channel.name, totalSoFar);
          }
        }

        for (const msg of old) {
          const ok = await withRetry(() => msg.delete().then(() => true));
          if (ok) deleted++;
          await new Promise((r) => setTimeout(r, 300));
        }
        if (old.length > 0 && onBlock) onBlock(deleted, blockNum, channel.name, totalSoFar);
      }

      lastId = messages.last()?.id;
      if (messages.size < BLOCK_SIZE) break;

      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_BLOCKS));
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
            `**🧹 ${channels.length} canais. Processando bloco a bloco...**`
          ).catch(() => {});

          let totalDeleted = 0;

          for (const channel of channels) {
            const deleted = await processChannel(channel, botId, (del, block, name, getTotal) => {
              statusMsg.edit(
                `**🧹 Bloco ${block} em #${name}**\n` +
                `Neste canal: ${del} | Total: ${getTotal() + del}`
              ).catch(() => {});
            }, () => totalDeleted);

            totalDeleted += deleted;

            if (deleted > 0) {
              await statusMsg.edit(
                `**🧹 Canal #${channel.name}: ${deleted} removida(s)**\n` +
                `Total até agora: ${totalDeleted}`
              ).catch(() => {});
            }

            await new Promise((r) => setTimeout(r, 500));
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
