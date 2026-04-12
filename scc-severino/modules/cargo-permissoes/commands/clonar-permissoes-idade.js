import {
  PermissionFlagsBits,
  PermissionsBitField,
  ChannelType
} from 'discord.js';
import {
  GUILD_ID,
  ROLE_MORADOR_ID,
  ROLE_IDADE_VERIFICADA_ID,
  DELAY_MS,
  PROGRESS_EDIT_EVERY
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
 * Overwrite do Morador que vale para este canal: linha **neste** canal ou, se não houver,
 * a linha na **categoria pai** (é o que a UI do Discord costuma mostrar como ✅/❌ no filho).
 */
function resolveMoradorOverwrite(channel, guild) {
  const direct = channel.permissionOverwrites?.cache?.get(ROLE_MORADOR_ID);
  if (direct) return { ov: direct, origem: 'canal' };

  const parentId = channel.parentId;
  if (!parentId) return null;
  const parent = channel.parent ?? guild.channels.cache.get(parentId);
  if (!parent?.permissionOverwrites) return null;
  const naCategoria = parent.permissionOverwrites.cache.get(ROLE_MORADOR_ID);
  if (!naCategoria) return null;
  return { ov: naCategoria, origem: 'categoria' };
}

function allowDenyFromOverwrite(ov) {
  const allowBf =
    ov.allow instanceof PermissionsBitField
      ? ov.allow
      : new PermissionsBitField(ov.allow?.bitfield ?? ov.allow ?? 0n);
  const denyBf =
    ov.deny instanceof PermissionsBitField
      ? ov.deny
      : new PermissionsBitField(ov.deny?.bitfield ?? ov.deny ?? 0n);
  return { allow: allowBf, deny: denyBf };
}

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

function fmtCanal(channel) {
  const nome = String(channel?.name ?? '?').replace(/`/g, "'").slice(0, 90);
  const id = channel?.id ?? '?';
  return `\`${nome}\` · \`${id}\``;
}

export default {
  name: 'clonar-permissoes-idade',
  description:
    'Iguala permissões do Idade verificada às do Morador em todo o servidor (explícitas + categoria + efeito).',
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

    if (botMember.roles.highest.position <= idadeRole.position) {
      return message.reply(
        '❌ O **cargo do bot** precisa estar **acima** do cargo **Idade verificada** na hierarquia do servidor. ' +
          'Sem isso o Discord bloqueia aplicar overwrites nesse cargo. Suba o cargo do bot nas configurações do servidor.'
      );
    }

    const dryRun = args.some((a) => ['dry', 'simular'].includes(String(a).toLowerCase()));
    const progressEvery = args.some((a) => ['5', 'cada5'].includes(String(a).toLowerCase()))
      ? 5
      : PROGRESS_EDIT_EVERY;

    await message.guild.channels.fetch().catch(() => {});

    const list = sortCategoriesFirst([...message.guild.channels.cache.values()]);
    const totalLista = list.length;

    let copiadosExplicito = 0;
    let copiadosDaCategoria = 0;
    let sincronizadosEfeito = 0;
    let removidosRedundantes = 0;
    let semAcao = 0;
    const falhas = [];

    const statusMsg = await message.reply(
      dryRun
        ? '🔍 **Simulação** — iniciando contagem de canais…'
        : '⏳ **Aplicando** — iniciando (canal + herança da categoria)…'
    );

    async function editarProgresso(done, channel) {
      const cabeca = dryRun ? '🔍 **Simulação em andamento**' : '⏳ **Aplicando permissões**';
      const bloco = [
        cabeca,
        '',
        `**${done}** de **${totalLista}** ${totalLista === 1 ? 'canal' : 'canais'}`,
        `📍 ${fmtCanal(channel)}`,
        '',
        `— direto **${copiadosExplicito}** · categoria **${copiadosDaCategoria}** · efeito **${sincronizadosEfeito}** · limpezas **${removidosRedundantes}** · sem ação **${semAcao}**`,
        '',
        progressEvery > 1
          ? `_Atualizando esta mensagem a cada **${progressEvery}** canais (use sem \`5\`/\`cada5\` para cada canal)._`
          : '_Atualizando a cada canal._'
      ].join('\n');
      await statusMsg.edit({ content: bloco }).catch(() => {});
    }

    for (let idx = 0; idx < list.length; idx++) {
      const channel = list[idx];
      const done = idx + 1;

      try {
      if (!channel.permissionOverwrites) {
        semAcao++;
        continue;
      }

      const label = `${channel.name} (\`${channel.id}\`)`;
      const resolved = resolveMoradorOverwrite(channel, message.guild);

      if (resolved) {
        const { ov, origem } = resolved;
        const { allow, deny } = allowDenyFromOverwrite(ov);

        if (dryRun) {
          if (origem === 'canal') copiadosExplicito++;
          else copiadosDaCategoria++;
          continue;
        }

        try {
          await channel.permissionOverwrites.edit(
            ROLE_IDADE_VERIFICADA_ID,
            { allow, deny },
            REASON
          );

          let verificado =
            channel.permissionOverwrites.cache.get(ROLE_IDADE_VERIFICADA_ID);
          let aOk = verificado && verificado.allow.bitfield === allow.bitfield;
          let dOk = verificado && verificado.deny.bitfield === deny.bitfield;
          if (!verificado || !aOk || !dOk) {
            if (typeof channel.fetch === 'function') {
              await channel.fetch().catch(() => {});
            }
            verificado = channel.permissionOverwrites.cache.get(ROLE_IDADE_VERIFICADA_ID);
            aOk = verificado && verificado.allow.bitfield === allow.bitfield;
            dOk = verificado && verificado.deny.bitfield === deny.bitfield;
          }
          if (!verificado || !aOk || !dOk) {
            falhas.push({
              label,
              erro:
                'Não foi possível confirmar allow/deny após o edit (suba o **cargo do bot** acima do **Idade verificada** ou confira **Gerenciar canais**).'
            });
          } else {
            if (origem === 'canal') copiadosExplicito++;
            else copiadosDaCategoria++;
          }
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

        const built = buildOverwriteToMatchEffective(m, i0);

        if (built.allow.bitfield === 0n && built.deny.bitfield === 0n) {
          sincronizadosEfeito++;
          await sleep(DELAY_MS);
          continue;
        }

        await channel.permissionOverwrites.edit(
          ROLE_IDADE_VERIFICADA_ID,
          { allow: built.allow, deny: built.deny },
          REASON
        );

        const check = channel.permissionsFor(idadeRole);
        if (check && check.bitfield !== m.bitfield) {
          falhas.push({
            label,
            erro:
              'Após aplicar overwrite, efeito ainda difere do Morador (permissões globais dos cargos ou hierarquia).'
          });
        }

        sincronizadosEfeito++;
      } catch (e) {
        falhas.push({ label, erro: e?.message || String(e) });
      }

      await sleep(DELAY_MS);
      } finally {
        if (done % progressEvery === 0 || done === totalLista) {
          await editarProgresso(done, channel);
        }
      }
    }

    const totalCopias = copiadosExplicito + copiadosDaCategoria;

    const linhas = [
      dryRun
        ? [
            '🔍 **Simulação**',
            `• **${copiadosExplicito}** locais: Morador tem linha **neste** canal → copiar allow/deny no Idade aqui.`,
            `• **${copiadosDaCategoria}** locais: Morador só na **categoria** → copiar o **mesmo** allow/deny no Idade **neste canal** (igual à UI que você vê).`,
            `• **${sincronizadosEfeito}** locais: alinhamento por **permissão efetiva** (sem linha do Morador em canal nem categoria).`,
            `• **${removidosRedundantes}** locais: remover linha extra do Idade.`,
            `• **${semAcao}** locais: sem mudança.`
          ].join('\n')
        : [
            '✅ **Concluído**',
            `• **${copiadosExplicito}** — cópia da linha do Morador **no próprio** canal/categoria.`,
            `• **${copiadosDaCategoria}** — cópia da linha do Morador da **categoria** aplicada no **canal filho** (Idade com mesmos ✅/❌).`,
            `• **${sincronizadosEfeito}** — ajuste por efeito (ver/ler/escrever, etc.).`,
            `• **${removidosRedundantes}** — linhas redundantes do Idade removidas.`,
            `• **${semAcao}** — já ok.`,
            '',
            `**Total de locais com overwrite do Idade definido/replicado:** ${totalCopias + sincronizadosEfeito} (cópias ${totalCopias} + efeito ${sincronizadosEfeito}).`
          ].join('\n'),
      '',
      '_**Permissões gerais do cargo** (fora dos canais) não são alteradas._'
    ];

    if (falhas.length) {
      linhas.push(`❌ Avisos/falhas (**${falhas.length}**):`);
      falhas.slice(0, 15).forEach((f) => linhas.push(`• ${f.label}: ${f.erro}`));
      if (falhas.length > 15) linhas.push(`… e mais ${falhas.length - 15}.`);
    }

    if (dryRun) {
      linhas.push(
        '',
        'Para aplicar: `!clonar-permissoes-idade` (sem `dry`).',
        'Progresso na mensagem **a cada 5 canais** (menos edições): acrescente `5` ou `cada5` (ex.: `!clonar-permissoes-idade dry 5`).'
      );
    }

    await statusMsg.edit(linhas.join('\n')).catch(() => {
      return message.channel.send(linhas.join('\n')).catch(() => {});
    });
  }
};
