import {
  PermissionFlagsBits,
  ChannelType
} from 'discord.js';
import { Routes } from 'discord-api-types/v10';
import {
  GUILD_ID,
  ROLE_MORADOR_ID,
  ROLE_IDADE_VERIFICADA_ID,
  DELAY_MS,
  PROGRESS_EDIT_EVERY
} from '../config.js';
import { putRoleChannelOverwrite } from '../utils/putRoleOverwrite.js';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const REASON =
  'Espelhar permissões: Morador (1317086939555434557) → Idade verificada (1492688339558600806)';

function sortCategoriesFirst(channels) {
  const cats = channels.filter((c) => c.type === ChannelType.GuildCategory);
  const rest = channels.filter((c) => c.type !== ChannelType.GuildCategory);
  const byPos = (a, b) => (a.rawPosition ?? 0) - (b.rawPosition ?? 0);
  cats.sort(byPos);
  rest.sort(byPos);
  return [...cats, ...rest];
}

function allowDenyFromOverwrite(ov) {
  return { allow: ov.allow, deny: ov.deny };
}

function fmtCanal(channel) {
  const nome = String(channel?.name ?? '?').replace(/`/g, "'").slice(0, 90);
  const id = channel?.id ?? '?';
  return `\`${nome}\` · \`${id}\``;
}

async function deleteRoleOverwriteStrict(client, channelId, roleId, reason) {
  await client.rest.delete(Routes.channelPermission(channelId, roleId), { reason });
}

export default {
  name: 'clonar-permissoes-idade',
  description:
    'Espelha 100% os overwrites diretos do Morador para Idade verificada em canais/categorias.',
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

    await message.guild.roles.fetch(ROLE_MORADOR_ID).catch(() => {});
    await message.guild.roles.fetch(ROLE_IDADE_VERIFICADA_ID).catch(() => {});

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

    let copiados = 0;
    let removidosSemMorador = 0;
    let semAcao = 0;
    const falhas = [];

    const statusMsg = await message.reply(
      dryRun
        ? '🔍 **Simulação** — iniciando contagem de canais…'
        : '⏳ **Aplicando** — iniciando espelho estrito (linha por linha)…'
    );

    async function editarProgresso(done, channel) {
      const cabeca = dryRun ? '🔍 **Simulação em andamento**' : '⏳ **Aplicando permissões**';
      const bloco = [
        cabeca,
        '',
        `**${done}** de **${totalLista}** ${totalLista === 1 ? 'canal' : 'canais'}`,
        `📍 ${fmtCanal(channel)}`,
        '',
        `— copiados **${copiados}** · removidos (sem Morador) **${removidosSemMorador}** · sem ação **${semAcao}**`,
        '',
        progressEvery > 1
          ? `_Atualizando esta mensagem a cada **${progressEvery}** canais (use sem \`5\`/\`cada5\` para cada canal)._`
          : '_Atualizando a cada canal._'
      ].join('\n');
      await statusMsg.edit({ content: bloco }).catch(() => {});
    }

    for (let idx = 0; idx < list.length; idx++) {
      let channel = list[idx];
      const done = idx + 1;

      try {
      if (!channel.permissionOverwrites) {
        semAcao++;
        continue;
      }

      const label = `${channel.name} (\`${channel.id}\`)`;

      if (typeof channel.fetch === 'function') {
        channel = (await channel.fetch().catch(() => null)) ?? channel;
      }

      const ovMorador = channel.permissionOverwrites.cache.get(ROLE_MORADOR_ID);
      const ovIdade = channel.permissionOverwrites.cache.get(ROLE_IDADE_VERIFICADA_ID);
      if (ovMorador) {
        const { allow, deny } = allowDenyFromOverwrite(ovMorador);
        const idadeJaIgual =
          ovIdade &&
          ovIdade.allow.bitfield === allow.bitfield &&
          ovIdade.deny.bitfield === deny.bitfield;

        if (idadeJaIgual) {
          semAcao++;
          continue;
        }

        if (dryRun) {
          copiados++;
          continue;
        }

        try {
          await putRoleChannelOverwrite(
            client,
            channel.id,
            ROLE_IDADE_VERIFICADA_ID,
            allow,
            deny,
            REASON
          );
          if (typeof channel.fetch === 'function') {
            await channel.fetch().catch(() => {});
          }
          copiados++;
        } catch (e) {
          falhas.push({ label, erro: e?.message || String(e) });
        }

        await sleep(DELAY_MS);
        continue;
      }

      if (!ovIdade) {
        semAcao++;
        continue;
      }

      if (dryRun) {
        removidosSemMorador++;
        continue;
      }

      try {
        await deleteRoleOverwriteStrict(client, channel.id, ROLE_IDADE_VERIFICADA_ID, REASON);
        if (typeof channel.fetch === 'function') {
          await channel.fetch().catch(() => {});
        }
        removidosSemMorador++;
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

    const linhas = [
      dryRun
        ? [
            '🔍 **Simulação**',
            `• **${copiados}** locais: copiar overwrite do Morador para Idade no mesmo canal/categoria.`,
            `• **${removidosSemMorador}** locais: remover overwrite do Idade porque Morador não tem linha aqui.`,
            `• **${semAcao}** locais: sem mudança.`
          ].join('\n')
        : [
            '✅ **Concluído**',
            `• **${copiados}** — overwrite do Morador espelhado no Idade no mesmo canal/categoria.`,
            `• **${removidosSemMorador}** — overwrite do Idade removido onde Morador não tem linha.`,
            `• **${semAcao}** — já ok.`,
          ].join('\n'),
      '',
      '_Modo estrito: este comando só espelha/remover linhas de overwrite de canal/categoria._',
      '_Permissões gerais do cargo (fora dos canais) não são alteradas._'
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
