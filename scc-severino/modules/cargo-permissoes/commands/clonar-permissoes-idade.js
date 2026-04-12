import {
  PermissionFlagsBits,
  PermissionsBitField,
  ChannelType
} from 'discord.js';
import {
  GUILD_ID,
  ROLE_MORADOR_ID,
  ROLE_IDADE_VERIFICADA_ID,
  DELAY_MS
} from '../config.js';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const REASON =
  'Espelhar permissões: Morador (1317086939555434557) → Idade verificada (1492688339558600806)';

/** Todos os bits de permissão conhecidos (para comparar efeito canal a canal). */
const ALL_PERM_BITS = Object.values(PermissionFlagsBits).filter(
  (v) => typeof v === 'bigint' || typeof v === 'number'
);

function sortCategoriesFirst(channels) {
  const cats = channels.filter((c) => c.type === ChannelType.GuildCategory);
  const rest = channels.filter((c) => c.type !== ChannelType.GuildCategory);
  const byPos = (a, b) => (a.rawPosition ?? 0) - (b.rawPosition ?? 0);
  cats.sort(byPos);
  rest.sort(byPos);
  return [...cats, ...rest];
}

/**
 * Com o Morador **sem** linha neste canal, ajusta o Idade para `permissionsFor` ficar igual ao do Morador
 * (resolve o caso em que o Morador herdou da categoria e o cliente mostra ✅/❌ no filho).
 */
function buildOverwriteToMatchEffective(mTarget, iBaseline) {
  const allow = new PermissionsBitField();
  const deny = new PermissionsBitField();
  for (const bit of ALL_PERM_BITS) {
    const want = mTarget.has(bit);
    const have = iBaseline.has(bit);
    if (want === have) continue;
    if (want) allow.add(bit);
    else deny.add(bit);
  }
  return { allow, deny };
}

export default {
  name: 'clonar-permissoes-idade',
  description:
    'Iguala permissões do Idade verificada às do Morador em todo o servidor (explícitas + efeito efetivo por canal).',
  async execute(message, args, client) {
    if (!message.guild) {
      return message.reply('❌ Use este comando dentro do servidor.');
    }
    if (message.guild.id !== GUILD_ID) {
      return message.reply('❌ Este comando só pode ser usado no servidor configurado (Street Car Club).');
    }
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Apenas administradores podem executar este comando.');
    }

    const botMember =
      message.guild.members.me ??
      (await message.guild.members.fetch(message.client.user.id).catch(() => null));
    if (!botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('❌ O bot precisa da permissão **Gerenciar canais** para alterar overwrites.');
    }

    const moradorRole = message.guild.roles.cache.get(ROLE_MORADOR_ID);
    const idadeRole = message.guild.roles.cache.get(ROLE_IDADE_VERIFICADA_ID);
    if (!moradorRole) {
      return message.reply(`❌ Cargo Morador não encontrado (\`${ROLE_MORADOR_ID}\`).`);
    }
    if (!idadeRole) {
      return message.reply(`❌ Cargo Idade verificada não encontrado (\`${ROLE_IDADE_VERIFICADA_ID}\`).`);
    }

    const dryRun = args[0]?.toLowerCase() === 'dry' || args[0]?.toLowerCase() === 'simular';

    await message.guild.channels.fetch().catch(() => {});

    const list = sortCategoriesFirst([...message.guild.channels.cache.values()]);

    let copiadosExplicito = 0;
    let sincronizadosEfeito = 0;
    let removidosRedundantes = 0;
    let semAcao = 0;
    const falhas = [];

    const statusMsg = await message.reply(
      dryRun
        ? '🔍 **Simulação** — categorias primeiro, depois canais; cópia explícita + alinhamento por permissão efetiva…'
        : '⏳ Igualando Idade ao Morador (**overwrite idêntico** ou **mesmo efeito** ver/ler/escrever)…'
    );

    let totalMutacoes = 0;

    async function tickProgress() {
      totalMutacoes++;
      if (totalMutacoes % 5 === 0) {
        await statusMsg
          .edit(
            `⏳ **${copiadosExplicito}** cópias explícitas · **${sincronizadosEfeito}** ajustes por efeito · **${removidosRedundantes}** limpezas…`
          )
          .catch(() => {});
      }
    }

    for (const channel of list) {
      if (!channel.permissionOverwrites) {
        semAcao++;
        continue;
      }

      const label = `${channel.name} (\`${channel.id}\`)`;

      // discord.js 14: não há permissionOverwrites.fetch(); cache vem do guild.channels.fetch() acima.
      const ovMorador = channel.permissionOverwrites.cache.get(ROLE_MORADOR_ID);

      if (ovMorador) {
        if (dryRun) {
          copiadosExplicito++;
          continue;
        }
        try {
          await channel.permissionOverwrites.edit(
            ROLE_IDADE_VERIFICADA_ID,
            {
              allow: new PermissionsBitField(ovMorador.allow),
              deny: new PermissionsBitField(ovMorador.deny)
            },
            REASON
          );
          copiadosExplicito++;
          await tickProgress();
        } catch (e) {
          falhas.push({ label, erro: e?.message || String(e) });
        }
        await sleep(DELAY_MS);
        continue;
      }

      const m = channel.permissionsFor(moradorRole);
      const iCur = channel.permissionsFor(idadeRole);
      if (!m || !iCur) {
        falhas.push({ label, erro: 'permissionsFor retornou vazio' });
        continue;
      }

      if (m.has(PermissionFlagsBits.Administrator)) {
        falhas.push({
          label,
          erro: 'Morador resolve com Administrator aqui — não dá para espelhar só por overwrite; alinhe cargos no servidor.'
        });
        continue;
      }

      const ovIdade = channel.permissionOverwrites.cache.get(ROLE_IDADE_VERIFICADA_ID);

      if (m.bitfield === iCur.bitfield) {
        if (ovIdade) {
          if (dryRun) {
            removidosRedundantes++;
            continue;
          }
          try {
            await channel.permissionOverwrites.delete(ROLE_IDADE_VERIFICADA_ID, REASON);
            removidosRedundantes++;
            await tickProgress();
            await sleep(DELAY_MS);
          } catch (e) {
            falhas.push({ label, erro: e?.message || String(e) });
          }
        } else {
          semAcao++;
        }
        continue;
      }

      if (dryRun) {
        sincronizadosEfeito++;
        continue;
      }

      try {
        if (ovIdade) {
          await channel.permissionOverwrites.delete(ROLE_IDADE_VERIFICADA_ID, REASON);
          if (typeof channel.fetch === 'function') {
            await channel.fetch().catch(() => {});
          }
        }

        const i0 = channel.permissionsFor(idadeRole);
        if (!i0) {
          falhas.push({ label, erro: 'baseline Idade após delete inválido' });
          await sleep(DELAY_MS);
          continue;
        }

        const { allow, deny } = buildOverwriteToMatchEffective(m, i0);

        if (allow.bitfield === 0n && deny.bitfield === 0n) {
          sincronizadosEfeito++;
          await tickProgress();
          await sleep(DELAY_MS);
          continue;
        }

        await channel.permissionOverwrites.edit(
          ROLE_IDADE_VERIFICADA_ID,
          { allow, deny },
          REASON
        );

        const check = channel.permissionsFor(idadeRole);
        if (check && check.bitfield !== m.bitfield) {
          falhas.push({
            label,
            erro:
              'Após aplicar overwrite, efeito ainda difere do Morador (conflito de hierarquia ou permissões globais dos cargos).'
          });
        }

        sincronizadosEfeito++;
        await tickProgress();
      } catch (e) {
        falhas.push({ label, erro: e?.message || String(e) });
      }

      await sleep(DELAY_MS);
    }

    const linhas = [
      dryRun
        ? [
            '🔍 **Simulação**',
            `• **${copiadosExplicito}** locais: copiaria overwrite explícito do Morador (✅/❌/herdar iguais).`,
            `• **${sincronizadosEfeito}** locais: alinharia **permissão efetiva** (Morador sem linha neste canal — ex.: herdou da categoria).`,
            `• **${removidosRedundantes}** locais: removeria linha extra do Idade (efeito já batia).`,
            `• **${semAcao}** locais: sem mudança.`
          ].join('\n')
        : [
            '✅ **Concluído**',
            `• **${copiadosExplicito}** — overwrite do Idade = **mesmo allow/deny** do Morador naquele canal/categoria.`,
            `• **${sincronizadosEfeito}** — permissões **efetivas** do Idade ajustadas para bater com o Morador (ver, gerenciar, enviar mensagens, voz, etc.).`,
            `• **${removidosRedundantes}** — linha do Idade removida por ser redundante.`,
            `• **${semAcao}** — já estavam iguais.`
          ].join('\n'),
      '',
      '_**Permissões gerais do cargo** (edição do cargo em si, fora dos canais) não são alteradas — se os cargos forem diferentes no servidor, alguns canais podem continuar divergindo._'
    ];

    if (falhas.length) {
      linhas.push(`❌ Avisos/falhas (**${falhas.length}**):`);
      falhas.slice(0, 12).forEach((f) => linhas.push(`• ${f.label}: ${f.erro}`));
      if (falhas.length > 12) linhas.push(`… e mais ${falhas.length - 12}.`);
    }

    if (dryRun) {
      linhas.push('', 'Para aplicar: `!clonar-permissoes-idade` (sem `dry`).');
    }

    await statusMsg.edit(linhas.join('\n')).catch(() => {
      return message.channel.send(linhas.join('\n')).catch(() => {});
    });
  }
};
