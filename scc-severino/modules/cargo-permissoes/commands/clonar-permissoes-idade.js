import { PermissionFlagsBits } from 'discord.js';
import {
  GUILD_ID,
  ROLE_MORADOR_ID,
  ROLE_IDADE_VERIFICADA_ID,
  DELAY_MS
} from '../config.js';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Percorre **todos** os canais do servidor (categorias, texto, voz, anúncio, fórum, palco, etc.).
 * Onde o Morador (`1317086939555434557`) tem overwrite explícito, aplica no Idade verificada
 * (`1492688339558600806`) o **mesmo** `allow` e `deny` (bit a bit).
 * Não chama delete em overwrites; onde o Morador não tem linha, o Idade **não é mexido**.
 */
export default {
  name: 'clonar-permissoes-idade',
  description:
    'Copia overwrites do Morador para Idade verificada em todas as categorias e canais (só onde o Morador tem linha).',
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

    const list = [...message.guild.channels.cache.values()].sort(
      (a, b) => (a.rawPosition ?? 0) - (b.rawPosition ?? 0)
    );

    let aplicados = 0;
    let ignorados = 0;
    const falhas = [];

    const statusMsg = await message.reply(
      dryRun
        ? '🔍 **Simulação** — percorrendo **todas as categorias e canais**; contando onde o Morador tem overwrite…'
        : '⏳ Copiando **allow/deny idênticos** (Morador → Idade verificada) em **cada categoria e canal** onde o Morador tem linha…'
    );

    for (const channel of list) {
      if (!channel.permissionOverwrites) {
        ignorados++;
        continue;
      }

      const ovMorador = channel.permissionOverwrites.cache.get(ROLE_MORADOR_ID);
      if (!ovMorador) {
        ignorados++;
        continue;
      }

      const label = `${channel.name} (\`${channel.id}\`)`;

      if (dryRun) {
        aplicados++;
        continue;
      }

      try {
        await channel.permissionOverwrites.edit(
          ROLE_IDADE_VERIFICADA_ID,
          {
            allow: ovMorador.allow,
            deny: ovMorador.deny
          },
          'Clonar overwrites Morador → Idade verificada (!clonar-permissoes-idade)'
        );
        aplicados++;
        if (aplicados % 5 === 0) {
          await statusMsg
            .edit(`⏳ Já copiados **${aplicados}** overwrites (categorias + canais)…`)
            .catch(() => {});
        }
      } catch (e) {
        falhas.push({ label, erro: e?.message || String(e) });
      }

      await sleep(DELAY_MS);
    }

    const linhas = [
      dryRun
        ? `🔍 **Simulação** — locais (categoria ou canal) onde o Morador tem overwrite: **${aplicados}**.`
        : `✅ **Concluído.** Em **${aplicados}** local(is), o Idade verificada ficou com **allow/deny iguais** aos do Morador.`,
      `ℹ️ **${ignorados}** locais sem linha do Morador — **não alterados** (nada removido do Idade; só herança/@everyone).`
    ];

    if (falhas.length) {
      linhas.push(`❌ Falhas (**${falhas.length}**):`);
      falhas.slice(0, 15).forEach((f) => linhas.push(`• ${f.label}: ${f.erro}`));
      if (falhas.length > 15) linhas.push(`… e mais ${falhas.length - 15}.`);
    }

    if (dryRun) {
      linhas.push(
        '',
        'Para aplicar de verdade, rode: `!clonar-permissoes-idade` (sem `dry`).'
      );
    }

    await statusMsg.edit(linhas.join('\n')).catch(() => {
      return message.channel.send(linhas.join('\n')).catch(() => {});
    });
  }
};
