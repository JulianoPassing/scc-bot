/**
 * Módulo para apagar a mensagem de boas-vindas do agendamento em TODOS os canais/servidores
 * Comando: !apagar-msg-bot
 * Remove a mensagem "Olá! Para agendar sua entrevista escreva `agendamento` aqui." em todo o Discord
 */

const BOT_ID = '1413346434102595646';

// Mensagem exata que será apagada (do agendamentos-seg)
const MSG_BOAS_VINDAS = 'Olá! Para agendar sua entrevista escreva `agendamento` aqui.';

// IDs dos cargos permitidos (mesmos do limparchat)
const ALLOWED_ROLES = ['1046404063689977985', '1046404063689977984'];

function isTargetMessage(msg) {
  return (
    msg.author?.id === BOT_ID &&
    msg.content?.trim() === MSG_BOAS_VINDAS
  );
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

          const statusMsg = await message.channel.send(
            '**🧹 Varrendo todos os servidores e canais...**'
          );

          let totalDeleted = 0;
          const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

          for (const [, guild] of client.guilds.cache) {
            for (const [, channel] of guild.channels.cache) {
              if (!channel.isTextBased() || channel.isDMBased()) continue;

              try {
                let lastId = null;

                while (true) {
                  const options = { limit: 100 };
                  if (lastId) options.before = lastId;

                  const messages = await channel.messages.fetch(options);
                  if (messages.size === 0) break;

                  const toDelete = messages.filter(isTargetMessage);

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
                      try {
                        await channel.bulkDelete(recent);
                        totalDeleted += recent.length;
                      } catch {
                        for (const msg of recent) {
                          try {
                            await msg.delete();
                            totalDeleted++;
                            await new Promise((r) => setTimeout(r, 350));
                          } catch {}
                        }
                      }
                    }

                    for (const msg of old) {
                      try {
                        await msg.delete();
                        totalDeleted++;
                        await new Promise((r) => setTimeout(r, 400));
                      } catch {}
                    }
                  }

                  lastId = messages.last()?.id;
                  if (messages.size < 100) break;

                  await new Promise((r) => setTimeout(r, 500));
                }
              } catch {
                // Sem permissão no canal — ignora
              }

              await new Promise((r) => setTimeout(r, 200));
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
