/**
 * Módulo para apagar mensagens enviadas pelo bot Severino SCC
 * Comando: !apagar-msg-bot
 * Remove apenas as mensagens do bot (ex: "Olá! Para agendar sua entrevista escreva `agendamento` aqui.")
 */

const BOT_ID = '1413346434102595646';

// IDs dos cargos permitidos (mesmos do limparchat)
const ALLOWED_ROLES = ['1046404063689977985', '1046404063689977984'];

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
        '**⚠️ Apagar todas as mensagens do bot neste canal? Digite `CONFIRMAR` em 10 segundos.**'
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

          const statusMsg = await message.channel.send(
            '**🧹 Buscando mensagens do bot...**'
          );

          let deletedCount = 0;
          let lastId = null;
          const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

          while (true) {
            const options = { limit: 100 };
            if (lastId) options.before = lastId;

            const messages = await message.channel.messages.fetch(options);
            if (messages.size === 0) break;

            const botMessages = messages.filter(
              (m) => m.author.id === BOT_ID
            );

            if (botMessages.size === 0 && messages.size < 100) break;

            const recent = [];
            const old = [];

            for (const [, msg] of botMessages) {
              const age = Date.now() - msg.createdTimestamp;
              if (age < FOURTEEN_DAYS_MS) {
                recent.push(msg);
              } else {
                old.push(msg);
              }
            }

            if (recent.length > 0) {
              try {
                await message.channel.bulkDelete(recent);
                deletedCount += recent.length;
              } catch {
                for (const msg of recent) {
                  try {
                    await msg.delete();
                    deletedCount++;
                    await new Promise((r) => setTimeout(r, 300));
                  } catch {}
                }
              }
            }

            for (const msg of old) {
              try {
                await msg.delete();
                deletedCount++;
                await new Promise((r) => setTimeout(r, 400));
              } catch {}
            }

            lastId = messages.last()?.id;
            if (messages.size < 100) break;
          }

          await statusMsg.delete().catch(() => {});
          await message.channel.send(
            `**✅ Pronto! ${deletedCount} mensagem(ns) do bot removida(s).**`
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
