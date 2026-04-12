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

const REASON =
  'Espelhar permissões de canal/categoria: Morador (1317086939555434557) → Idade verificada (1492688339558600806)';

/**
 * Percorre **todas** as categorias e canais do guild.
 * - Onde o Morador tem overwrite: Idade recebe o **mesmo** allow/deny.
 * - Onde o Morador **não** tem overwrite mas o Idade tem: remove a linha do Idade
 *   (fica igual ao Morador: só herança / @everyone / permissões globais do cargo).
 * Assim o **padrão** do Morador nos canais fica espelhado no Idade em todo o servidor.
 */
export default {
  name: 'clonar-permissoes-idade',
  description:
    'Espelha o padrão de overwrites do Morador no Idade verificada (todas as categorias e canais).',
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

    let copiados = 0;
    let removidos = 0;
    let semAcao = 0;
    const falhas = [];

    const statusMsg = await message.reply(
      dryRun
        ? '🔍 **Simulação** — verificando **todas as categorias e canais** frente ao padrão do Morador…'
        : '⏳ Ajustando Idade verificada para **coincidir com o Morador** em cada categoria e canal…'
    );

    let totalMutacoes = 0;

    for (const channel of list) {
      if (!channel.permissionOverwrites) {
        semAcao++;
        continue;
      }

      const ovMorador = channel.permissionOverwrites.cache.get(ROLE_MORADOR_ID);
      const ovIdade = channel.permissionOverwrites.cache.get(ROLE_IDADE_VERIFICADA_ID);
      const label = `${channel.name} (\`${channel.id}\`)`;

      if (ovMorador) {
        if (dryRun) {
          copiados++;
          continue;
        }
        try {
          await channel.permissionOverwrites.edit(
            ROLE_IDADE_VERIFICADA_ID,
            {
              allow: ovMorador.allow,
              deny: ovMorador.deny
            },
            REASON
          );
          copiados++;
          totalMutacoes++;
          if (totalMutacoes % 5 === 0) {
            await statusMsg
              .edit(
                `⏳ **${copiados}** cópias · **${removidos}** linhas do Idade removidas (Morador sem linha)…`
              )
              .catch(() => {});
          }
        } catch (e) {
          falhas.push({ label, erro: e?.message || String(e) });
        }
        await sleep(DELAY_MS);
        continue;
      }

      if (ovIdade) {
        if (dryRun) {
          removidos++;
          continue;
        }
        try {
          await channel.permissionOverwrites.delete(ROLE_IDADE_VERIFICADA_ID, REASON);
          removidos++;
          totalMutacoes++;
          if (totalMutacoes % 5 === 0) {
            await statusMsg
              .edit(
                `⏳ **${copiados}** cópias · **${removidos}** linhas do Idade removidas (Morador sem linha)…`
              )
              .catch(() => {});
          }
        } catch (e) {
          falhas.push({ label, erro: e?.message || String(e) });
        }
        await sleep(DELAY_MS);
        continue;
      }

      semAcao++;
    }

    const linhas = [
      dryRun
        ? [
            '🔍 **Simulação concluída** (padrão Morador → Idade nos canais):',
            `• Locais onde **copiaria** allow/deny do Morador: **${copiados}**`,
            `• Locais onde **removeria** overwrite extra do Idade (Morador sem linha): **${removidos}**`,
            `• Locais já alinhados (nenhum dos dois com linha): **${semAcao}**`
          ].join('\n')
        : [
            '✅ **Concluído.** Idade verificada espelha o **mesmo esquema de overwrites** do Morador:',
            `• **${copiados}** local(is): allow/deny **idênticos** aos do Morador`,
            `• **${removidos}** local(is): overwrite do Idade **removido** (como no Morador: só herança)`,
            `• **${semAcao}** local(is): já iguais (sem linha em ambos)`
          ].join('\n'),
      '',
      '_Permissões **globais** do cargo (tela Cargos do servidor) não são alteradas por este comando._'
    ];

    if (falhas.length) {
      linhas.push(`❌ Falhas (**${falhas.length}**):`);
      falhas.slice(0, 15).forEach((f) => linhas.push(`• ${f.label}: ${f.erro}`));
      if (falhas.length > 15) linhas.push(`… e mais ${falhas.length - 15}.`);
    }

    if (dryRun) {
      linhas.push('', 'Para aplicar: `!clonar-permissoes-idade` (sem `dry`).');
    }

    await statusMsg.edit(linhas.join('\n')).catch(() => {
      return message.channel.send(linhas.join('\n')).catch(() => {});
    });
  }
};
