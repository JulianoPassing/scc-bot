import { PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import { GUILD_ID, TEST_CANAL_ORIGEM_ID, DELAY_MS } from '../config.js';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const REASON = `Teste: clonar permissões do canal ${TEST_CANAL_ORIGEM_ID}`;

/**
 * Copia **todos** os overwrites do canal de teste (origem) para outro canal (destino).
 * Depois remove do destino linhas que não existem na origem — o destino fica igual à origem em permissões.
 */
export default {
  name: 'clonar-canal-teste',
  description: 'Teste: clona overwrites do canal fixo em config para um canal destino.',
  async execute(message, args) {
    if (!message.guild) {
      return message.reply('❌ Use no servidor.');
    }
    if (message.guild.id !== GUILD_ID) {
      return message.reply('❌ Só no servidor Street Car Club configurado.');
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

    const destinoId = args.find((a) => /^\d{17,20}$/.test(a));
    if (!destinoId) {
      return message.reply(
        `**Uso:** \`!clonar-canal-teste <id_do_canal_destino>\`\n` +
          `Copia **todas** as permissões do canal origem \`${TEST_CANAL_ORIGEM_ID}\` para o canal que você indicar (mesmo servidor).`
      );
    }

    if (destinoId === TEST_CANAL_ORIGEM_ID) {
      return message.reply('❌ O destino não pode ser o mesmo canal da origem.');
    }

    const origem = await message.guild.channels.fetch(TEST_CANAL_ORIGEM_ID).catch(() => null);
    if (!origem?.permissionOverwrites) {
      return message.reply(
        `❌ Canal origem \`${TEST_CANAL_ORIGEM_ID}\` não encontrado ou sem permissões editáveis.`
      );
    }

    const destino = await message.guild.channels.fetch(destinoId).catch(() => null);
    if (!destino?.permissionOverwrites) {
      return message.reply(`❌ Canal destino \`${destinoId}\` não encontrado ou inválido.`);
    }

    const status = await message.reply(
      `⏳ Clonando overwrites de \`${origem.name}\` → \`${destino.name}\`…`
    );

    let aplicadas = 0;
    let removidas = 0;
    const erros = [];

    try {
      for (const [, ow] of origem.permissionOverwrites.cache) {
        const id = ow.id;
        try {
          await destino.permissionOverwrites.edit(
            id,
            {
              allow: new PermissionsBitField(ow.allow),
              deny: new PermissionsBitField(ow.deny)
            },
            REASON
          );
          aplicadas++;
        } catch (e) {
          erros.push({ id, msg: e?.message || String(e) });
        }
        await sleep(DELAY_MS);
      }

      if (typeof destino.fetch === 'function') {
        await destino.fetch().catch(() => {});
      }

      const idsOrigem = new Set(origem.permissionOverwrites.cache.keys());
      for (const id of [...destino.permissionOverwrites.cache.keys()]) {
        if (idsOrigem.has(id)) continue;
        try {
          await destino.permissionOverwrites.delete(id, REASON);
          removidas++;
        } catch (e) {
          erros.push({ id: `del:${id}`, msg: e?.message || String(e) });
        }
        await sleep(DELAY_MS);
      }

      const linhas = [
        '✅ **Teste concluído**',
        `Origem: ${origem} (\`${origem.id}\`)`,
        `Destino: ${destino} (\`${destino.id}\`)`,
        '',
        `• Overwrites **copiados/igualados** à origem: **${aplicadas}**`,
        `• Overwrites **extras** no destino (removidos): **${removidas}**`,
        erros.length ? `• Falhas: **${erros.length}**` : ''
      ].filter(Boolean);

      if (erros.length) {
        linhas.push('', '**Detalhes das falhas (máx. 8):**');
        erros.slice(0, 8).forEach((e) => linhas.push(`• \`${e.id}\`: ${e.msg}`));
        if (erros.length > 8) linhas.push(`… +${erros.length - 8}`);
      }

      await status.edit(linhas.join('\n'));
    } catch (e) {
      await status.edit(`❌ Erro geral: ${e?.message || e}`).catch(() => {});
    }
  }
};
