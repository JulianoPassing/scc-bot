import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { EmbedBuilder } from 'discord.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8')
);

const { ACOES_CHANNEL_ID, ADMIN_ROLE_ID } = config;
const REGRAS_SITE_URL = 'https://regras-scc.vercel.app/#acoes';

const setupRegrasAcoesModule = function (client) {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.content !== '!regras-acoes') return;

    if (!message.member?.roles?.cache?.has(ADMIN_ROLE_ID)) {
      return message.reply('❌ Você não tem permissão para usar este comando.').catch(() => {});
    }

    try {
      const processingMsg = await message.reply('🔄 Publicando regras...');

      const channel = await message.guild.channels.fetch(ACOES_CHANNEL_ID).catch(() => null);
      if (!channel) {
        return processingMsg.edit('❌ Canal #acoes não encontrado.').catch(() => {});
      }

      const embed = new EmbedBuilder()
        .setAuthor({
          name: 'Street Car Club Roleplay',
          iconURL: 'https://i.imgur.com/YULctuK.png',
          url: REGRAS_SITE_URL
        })
        .setTitle('🎯 Regras de Ações – PvP/PvE')
        .setURL(REGRAS_SITE_URL)
        .setDescription(
          '**Regras oficiais de PvP/PvE da Street Car Club Roleplay. Consulte o canal para mais detalhes.**\n\n' +
            `📌 [Ver regras completas no site](${REGRAS_SITE_URL})`
        )
        .setColor(0xEAF207)
        .setImage('https://i.imgur.com/Wf7bGAO.png')
        .setThumbnail('https://i.imgur.com/YULctuK.png')
        .setFooter({ text: 'Street Car Club Roleplay • Regras oficiais • Clique no título para abrir o site' })
        .setTimestamp();

      await channel.send({ embeds: [embed] });

      await processingMsg.edit('✅ Regras de ações publicadas no canal <#' + ACOES_CHANNEL_ID + '>!').catch(() => {});
    } catch (error) {
      console.error('Erro no regras-acoes:', error);
      await message.reply('❌ Erro ao publicar as regras.').catch(() => {});
    }
  });
};

export default setupRegrasAcoesModule;
