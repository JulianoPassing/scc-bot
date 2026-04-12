import { PermissionFlagsBits, PermissionsBitField, OverwriteType } from 'discord.js';
import { Routes } from 'discord-api-types/v10';
import {
  GUILD_ID,
  ROLE_MORADOR_ID,
  ROLE_IDADE_VERIFICADA_ID,
  TESTE_MORADOR_IDADE_CANAL_ID
} from '../config.js';
import { putRoleChannelOverwrite } from '../utils/putRoleOverwrite.js';

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

function listarOverwritesCargo(channel) {
  const linhas = [];
  for (const [, ow] of channel.permissionOverwrites.cache) {
    if (ow.type === OverwriteType.Role) {
      linhas.push(`• cargo \`${ow.id}\` — allow \`${ow.allow.bitfield}\` deny \`${ow.deny.bitfield}\``);
    }
  }
  return linhas.length ? linhas.join('\n') : '_Nenhuma linha de **cargo** neste canal (só @everyone/membro)._';
}

async function getRawRoleOverwriteFromApi(client, channelId, roleId) {
  const rawChannel = await client.rest.get(Routes.channel(channelId));
  const roleLine = rawChannel?.permission_overwrites?.find(
    (ow) => String(ow.id) === String(roleId) && Number(ow.type) === Number(OverwriteType.Role)
  );
  if (!roleLine) return null;
  return {
    allow: String(roleLine.allow ?? '0'),
    deny: String(roleLine.deny ?? '0')
  };
}

export default {
  name: 'teste-morador-para-idade',
  description: 'Teste: Morador → Idade verificada (REST + canal opcional).',
  async execute(message, args) {
    if (!message.guild) {
      return message.reply('❌ Use no servidor.');
    }
    if (message.guild.id !== GUILD_ID) {
      return message.reply('❌ Só no servidor configurado.');
    }
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Só administradores.');
    }

    const canalIdArg = args.find((a) => /^\d{17,20}$/.test(String(a)));
    const canalAlvoId = canalIdArg ?? TESTE_MORADOR_IDADE_CANAL_ID;

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

    let channel = await message.guild.channels.fetch(canalAlvoId).catch(() => null);
    if (!channel?.permissionOverwrites) {
      return message.reply(
        `❌ Canal \`${canalAlvoId}\` não encontrado.\n` +
          `**Dica:** clique com o botão direito no canal → **Copiar ID** e use: \`!teste-morador-para-idade <id>\`\n` +
          `(Padrão no config: \`${TESTE_MORADOR_IDADE_CANAL_ID}\`)`
      );
    }

    if (channel.parentId) {
      await message.guild.channels.fetch(channel.parentId).catch(() => {});
      channel = (await message.guild.channels.fetch(canalAlvoId).catch(() => null)) ?? channel;
    }

    const REASON =
      'Teste REST: Morador → Idade verificada | canal ' + channel.id;

    const aplicar = async (allow, deny, modo) => {
      const targetAllow = allow.bitfield.toString();
      const targetDeny = deny.bitfield.toString();

      const rawAntesIdade = await getRawRoleOverwriteFromApi(
        message.client,
        channel.id,
        ROLE_IDADE_VERIFICADA_ID
      ).catch(() => null);

      await putRoleChannelOverwrite(
        message.client,
        channel.id,
        ROLE_IDADE_VERIFICADA_ID,
        allow,
        deny,
        REASON
      );
      if (typeof channel.fetch === 'function') {
        channel = (await channel.fetch().catch(() => null)) ?? channel;
      }

      const rawDepoisIdade = await getRawRoleOverwriteFromApi(
        message.client,
        channel.id,
        ROLE_IDADE_VERIFICADA_ID
      ).catch(() => null);
      const rawDepoisMorador = await getRawRoleOverwriteFromApi(
        message.client,
        channel.id,
        ROLE_MORADOR_ID
      ).catch(() => null);

      const ver = channel.permissionOverwrites.cache.get(ROLE_IDADE_VERIFICADA_ID);
      const okCache =
        ver &&
        ver.allow.bitfield.toString() === targetAllow &&
        ver.deny.bitfield.toString() === targetDeny;
      const okApi =
        rawDepoisIdade &&
        rawDepoisIdade.allow === targetAllow &&
        rawDepoisIdade.deny === targetDeny;
      const mF = channel.permissionsFor(moradorRole);
      const iF = channel.permissionsFor(idadeRole);
      const efeitoIgual = mF && iF && mF.bitfield === iF.bitfield;

      return message.reply(
        [
          okApi
            ? '✅ **Permissão gravada via API (REST) e confirmada no canal**'
            : '⚠️ **REST executado**, mas a leitura da API não confirmou os mesmos bits.',
          '',
          `**Canal:** ${channel.name} · \`${channel.id}\``,
          canalIdArg ? '' : `_Usando ID padrão do config. Se não for este canal, passe o ID após o comando._`,
          `**Modo:** ${modo}`,
          '',
          `Morador (origem): \`${moradorRole.name}\` · \`${ROLE_MORADOR_ID}\``,
          `Idade (destino): \`${idadeRole.name}\` · \`${ROLE_IDADE_VERIFICADA_ID}\``,
          `Alvo gravado: allow \`${targetAllow}\` · deny \`${targetDeny}\``,
          '',
          `API antes (Idade): allow \`${rawAntesIdade?.allow ?? 'sem linha'}\` · deny \`${rawAntesIdade?.deny ?? 'sem linha'}\``,
          `API depois (Idade): allow \`${rawDepoisIdade?.allow ?? 'sem linha'}\` · deny \`${rawDepoisIdade?.deny ?? 'sem linha'}\``,
          `API depois (Morador): allow \`${rawDepoisMorador?.allow ?? 'sem linha'}\` · deny \`${rawDepoisMorador?.deny ?? 'sem linha'}\``,
          `Confirmação cache discord.js: ${okCache ? 'ok' : 'diferente'}`,
          '',
          efeitoIgual
            ? '✅ `permissionsFor` Morador = Idade neste canal.'
            : '⚠️ Efeito pode diferir se os **cargos** tiverem permissões gerais diferentes no servidor.',
          '',
          okApi
            ? 'Se a UI ainda mostrar diferente, revise se você abriu o mesmo cargo/mesmo canal.'
            : 'Se a API continuar sem confirmar, envie essa resposta completa para eu ajustar o fluxo.'
        ]
          .filter(Boolean)
          .join('\n')
      );
    };

    let resolved = resolveMoradorOverwrite(channel, message.guild);

    if (!resolved) {
      const m = channel.permissionsFor(moradorRole);
      const iAntes = channel.permissionsFor(idadeRole);

      if (!m || !iAntes) {
        return message.reply(
          `❌ Sem overwrite do Morador (\`${ROLE_MORADOR_ID}\`) neste canal nem na categoria.\n\n` +
            `**Overwrites de cargo neste canal:**\n${listarOverwritesCargo(channel)}\n\n` +
            `Confira se o ID do **Morador** no servidor é mesmo \`${ROLE_MORADOR_ID}\` (Modo desenvolvedor).`
        );
      }

      if (m.has(PermissionFlagsBits.Administrator)) {
        return message.reply(
          '❌ Morador com **Administrator** aqui — não dá para igualar só com overwrite de canal.'
        );
      }

      if (m.bitfield === iAntes.bitfield) {
        return message.reply(
          `ℹ️ **Efeito já igual** (sem linha explícita necessária).\n` +
            `Canal: \`${channel.id}\`\n\n` +
            `**Overwrites de cargo neste canal:**\n${listarOverwritesCargo(channel)}`
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
          return message.reply('❌ Baseline Idade inválido após limpar overwrite.');
        }

        const built = buildOverwriteToMatchEffective(m, i0);
        if (built.allow.bitfield === 0n && built.deny.bitfield === 0n) {
          return message.reply('ℹ️ Nada a gravar após recalcular.');
        }

        return await aplicar(built.allow, built.deny, 'permissão efetiva (sem linha do Morador na API)');
      } catch (e) {
        return message.reply(`❌ ${e?.message || e}`);
      }
    }

    const { ov, origem } = resolved;
    const { allow, deny } = allowDenyFromOverwrite(ov);

    try {
      return await aplicar(allow, deny, `cópia do Morador (**${origem}**) via REST`);
    } catch (e) {
      return message.reply(
        `❌ Erro REST: ${e?.message || e}\n\n**Overwrites de cargo neste canal:**\n${listarOverwritesCargo(channel)}`
      );
    }
  }
};
