import { PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import {
  GUILD_ID,
  ROLE_MORADOR_ID,
  ROLE_IDADE_VERIFICADA_ID,
  TESTE_MORADOR_IDADE_CANAL_ID
} from '../config.js';

const REASON =
  'Teste: Morador → Idade verificada no canal ' + TESTE_MORADOR_IDADE_CANAL_ID;

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

/**
 * Teste pontual: no canal fixo em config, copia allow/deny do **Morador** para **Idade verificada**
 * (no próprio canal; se o Morador só tiver linha na categoria, usa a mesma lógica do clonar global).
 */
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

    const channel = await message.guild.channels.fetch(TESTE_MORADOR_IDADE_CANAL_ID).catch(() => null);
    if (!channel?.permissionOverwrites) {
      return message.reply(`❌ Canal \`${TESTE_MORADOR_IDADE_CANAL_ID}\` não encontrado.`);
    }

    const resolved = resolveMoradorOverwrite(channel, message.guild);
    if (!resolved) {
      return message.reply(
        `❌ Não há overwrite do **Morador** nem neste canal nem na categoria pai.\n` +
          `Canal: ${channel} (\`${channel.id}\`)`
      );
    }

    const { ov, origem } = resolved;
    const allow = new PermissionsBitField(ov.allow);
    const deny = new PermissionsBitField(ov.deny);

    try {
      await channel.permissionOverwrites.edit(
        ROLE_IDADE_VERIFICADA_ID,
        { allow, deny },
        REASON
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

      const linhas = [
        ok ? '✅ **Teste aplicado**' : '⚠️ **Edit enviado** (confirme no Discord se bateu)',
        '',
        `Canal: ${channel} (\`${channel.id}\`)`,
        `Overwrite do Morador usado: **${origem}**`,
        '',
        `Allow (bits): \`${allow.bitfield.toString()}\``,
        `Deny (bits): \`${deny.bitfield.toString()}\``,
        '',
        ok
          ? 'O **Idade verificada** neste canal ficou com o **mesmo** allow/deny do Morador (na origem acima).'
          : 'Se a UI não bater, suba o cargo do bot ou confira **Gerenciar canais**.'
      ];

      return message.reply(linhas.join('\n'));
    } catch (e) {
      return message.reply(`❌ Erro: ${e?.message || e}`);
    }
  }
};
