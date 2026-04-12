import { PermissionFlagsBits, PermissionsBitField, OverwriteType } from 'discord.js';
import {
  GUILD_ID,
  ROLE_MORADOR_ID,
  ROLE_IDADE_VERIFICADA_ID,
  TESTE_MORADOR_IDADE_CANAL_ID
} from '../config.js';

const REASON =
  'Teste: Morador → Idade verificada no canal ' + TESTE_MORADOR_IDADE_CANAL_ID;

const ALL_PERM_BITS = Object.values(PermissionFlagsBits).filter(
  (v) => typeof v === 'bigint' || typeof v === 'number'
);

function resolveMoradorOverwrite(channel, guild) {
  const direct = channel.permissionOverwrites?.cache?.get(ROLE_MORADOR_ID);
  if (direct) return { ov: direct, origem: 'neste canal' };

  const parentId = channel.parentId;
  if (!parentId) return null;
  const parent = channel.parent ?? guild.channels.cache.get(parentId);
  if (!parent?.permissionOverwrites) return null;
  const naCategoria = parent.permissionOverwrites.cache.get(ROLE_MORADOR_ID);
  if (!naCategoria) return null;
  return { ov: naCategoria, origem: 'categoria pai' };
}

function allowDenyFromOverwrite(ov) {
  const allow =
    ov.allow instanceof PermissionsBitField
      ? ov.allow
      : new PermissionsBitField(ov.allow?.bitfield ?? ov.allow ?? 0n);
  const deny =
    ov.deny instanceof PermissionsBitField
      ? ov.deny
      : new PermissionsBitField(ov.deny?.bitfield ?? ov.deny ?? 0n);
  return { allow, deny };
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

export default {
  name: 'teste-morador-para-idade',
  description: 'Teste: Morador → Idade verificada só no canal configurado.',
  async execute(message) {
    if (!message.guild) {
      return message.reply('❌ Use no servidor.');
    }
    if (message.guild.id !== GUILD_ID) {
      return message.reply('❌ Só no servidor configurado.');
    }
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Só administradores.');
    }

    const botMember =
      message.guild.members.me ??
      (await message.guild.members.fetch(message.client.user.id).catch(() => null));
    if (!botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('❌ O bot precisa de **Gerenciar canais**.');
    }

    const idadeRole = message.guild.roles.cache.get(ROLE_IDADE_VERIFICADA_ID);
    if (!idadeRole) {
      return message.reply(`❌ Cargo Idade verificada não encontrado (\`${ROLE_IDADE_VERIFICADA_ID}\`).`);
    }
    if (botMember.roles.highest.position <= idadeRole.position) {
      return message.reply(
        '❌ O **cargo do bot** precisa estar **acima** do **Idade verificada** na lista de cargos.'
      );
    }

    const moradorRole = message.guild.roles.cache.get(ROLE_MORADOR_ID);
    if (!moradorRole) {
      return message.reply(`❌ Cargo Morador não encontrado (\`${ROLE_MORADOR_ID}\`).`);
    }

    await message.guild.roles.fetch(ROLE_MORADOR_ID).catch(() => {});
    await message.guild.roles.fetch(ROLE_IDADE_VERIFICADA_ID).catch(() => {});

    let channel = await message.guild.channels.fetch(TESTE_MORADOR_IDADE_CANAL_ID).catch(() => null);
    if (!channel?.permissionOverwrites) {
      return message.reply(`❌ Canal \`${TESTE_MORADOR_IDADE_CANAL_ID}\` não encontrado.`);
    }

    if (channel.parentId) {
      await message.guild.channels.fetch(channel.parentId).catch(() => {});
      channel = (await message.guild.channels.fetch(TESTE_MORADOR_IDADE_CANAL_ID).catch(() => null)) ?? channel;
    }

    let resolved = resolveMoradorOverwrite(channel, message.guild);
    let metodo = 'overwrite';

    if (!resolved) {
      const m = channel.permissionsFor(moradorRole);
      const iAntes = channel.permissionsFor(idadeRole);
      if (!m || !iAntes) {
        const idsCanal = [...channel.permissionOverwrites.cache.keys()].slice(0, 12);
        return message.reply(
          `❌ Sem linha do Morador na API neste canal/categoria e \`permissionsFor\` falhou.\n` +
            `IDs de overwrite **neste** canal (amostra): ${idsCanal.map((id) => `\`${id}\``).join(', ') || 'nenhum'}`
        );
      }

      if (m.has(PermissionFlagsBits.Administrator)) {
        return message.reply(
          '❌ O Morador resolve com **Administrator** aqui — não dá para igualar só com overwrite de canal.'
        );
      }

      if (m.bitfield === iAntes.bitfield) {
        return message.reply(
          'ℹ️ **Já está igual** (permissão efetiva): Morador e Idade verificada têm o mesmo efeito neste canal, sem precisar de linha extra.\n' +
            `Se a UI parecer diferente, pode ser só exibição; confira se ambos veem o canal da mesma forma.`
        );
      }

      try {
        if (channel.permissionOverwrites.cache.has(ROLE_IDADE_VERIFICADA_ID)) {
          await channel.permissionOverwrites.delete(ROLE_IDADE_VERIFICADA_ID, REASON);
          if (typeof channel.fetch === 'function') {
            channel = (await channel.fetch().catch(() => null)) ?? channel;
          }
        }

        const i0 = channel.permissionsFor(idadeRole);
        if (!i0) {
          return message.reply('❌ Baseline do Idade após limpar overwrite inválido.');
        }

        const built = buildOverwriteToMatchEffective(m, i0);
        if (built.allow.bitfield === 0n && built.deny.bitfield === 0n) {
          return message.reply(
            'ℹ️ Depois de limpar overwrite do Idade, o efeito já bate com o Morador — **nada a gravar**.'
          );
        }

        await channel.permissionOverwrites.edit(
          ROLE_IDADE_VERIFICADA_ID,
          { allow: built.allow, deny: built.deny },
          { type: OverwriteType.Role, reason: REASON }
        );
        metodo = 'permissão efetiva (Morador sem linha explícita na API)';
        resolved = null;
      } catch (e) {
        return message.reply(`❌ Erro no modo efetivo: ${e?.message || e}`);
      }
    }

    if (resolved) {
      const { ov, origem } = resolved;
      const { allow, deny } = allowDenyFromOverwrite(ov);

      try {
        await channel.permissionOverwrites.edit(
          ROLE_IDADE_VERIFICADA_ID,
          { allow, deny },
          { type: OverwriteType.Role, reason: REASON }
        );

        let ver = channel.permissionOverwrites.cache.get(ROLE_IDADE_VERIFICADA_ID);
        let ok =
          ver && ver.allow.bitfield === allow.bitfield && ver.deny.bitfield === deny.bitfield;
        if (!ok && typeof channel.fetch === 'function') {
          await channel.fetch().catch(() => {});
          ver = channel.permissionOverwrites.cache.get(ROLE_IDADE_VERIFICADA_ID);
          ok =
            ver && ver.allow.bitfield === allow.bitfield && ver.deny.bitfield === deny.bitfield;
        }

        const mF = channel.permissionsFor(moradorRole);
        const iF = channel.permissionsFor(idadeRole);
        const efeitoIgual = mF && iF && mF.bitfield === iF.bitfield;

        const linhas = [
          ok ? '✅ **Overwrite copiado**' : '⚠️ Edit enviado — confira no Discord',
          '',
          `**Modo:** linha do Morador na API (**${origem}**)`,
          `Canal: ${channel} (\`${channel.id}\`)`,
          '',
          `Allow: \`${allow.bitfield.toString()}\` · Deny: \`${deny.bitfield.toString()}\``,
          '',
          efeitoIgual
            ? '✅ `permissionsFor` Morador **=** Idade neste canal.'
            : '⚠️ `permissionsFor` ainda pode diferir (permissões **gerais** dos cargos no servidor).',
          '',
          ok
            ? 'Idade verificada recebeu o **mesmo** allow/deny do Morador (origem acima).'
            : 'Se não aparecer na UI: suba o **cargo do bot** acima do Idade e tente de novo.'
        ];

        return message.reply(linhas.join('\n'));
      } catch (e) {
        return message.reply(`❌ Erro ao aplicar overwrite: ${e?.message || e}`);
      }
    }

    const mF = channel.permissionsFor(moradorRole);
    const iF = channel.permissionsFor(idadeRole);
    const efeitoIgual = mF && iF && mF.bitfield === iF.bitfield;

    const linhas = [
      '✅ **Ajuste por permissão efetiva**',
      '',
      `**Modo:** ${metodo}`,
      `Canal: ${channel} (\`${channel.id}\`)`,
      '',
      efeitoIgual
        ? '✅ `permissionsFor` Morador **=** Idade neste canal.'
        : '⚠️ Ainda há diferença de efeito — veja permissões **gerais** dos dois cargos (fora do canal).',
      '',
      'Abra **Configurações do canal → Permissões → Idade verificada** e confira se bate com o Morador.'
    ];

    return message.reply(linhas.join('\n'));
  }
};
