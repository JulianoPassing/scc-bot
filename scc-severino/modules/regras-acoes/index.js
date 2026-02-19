import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { EmbedBuilder } from 'discord.js';
import { fetchRegrasFromSite } from './fetchRegras.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8')
);

const { ACOES_CHANNEL_ID, ADMIN_ROLE_ID } = config;
const REGRAS_JSON_PATH = path.join(__dirname, 'regras-acoes.json');

const MAX_FIELD_VALUE = 1024;
const MAX_DESCRIPTION = 4096;
const MAX_FIELD_NAME = 256;
const MAX_EMBED_TOTAL = 6000;
const MAX_FIELDS_PER_EMBED = 25;

/**
 * Trunca texto para caber no limite do Discord
 */
function truncate(str, max) {
  if (!str || str.length <= max) return str;
  return str.slice(0, max - 3) + '...';
}

/**
 * Cria embeds a partir do JSON de regras
 */
function buildEmbeds(data) {
  const embeds = [];

  // Embed de abertura
  const introEmbed = new EmbedBuilder()
    .setTitle(`🎯 ${data.titulo}`)
    .setDescription(data.descricao)
    .setColor(0xEAF207)
    .setThumbnail('https://i.imgur.com/YULctuK.png')
    .setFooter({ text: 'Street Car Club Roleplay • Regras oficiais' })
    .setTimestamp();
  embeds.push(introEmbed);

  for (const secao of data.secoes) {
    const tituloCompleto = `${secao.emoji} ${secao.titulo}`;
    const cor = secao.cor || 0xEAF207;

    // Seção com muitos fields (ex: Regras Gerais) - pode precisar dividir
    if (secao.fields && secao.fields.length > 0) {
      let embed = new EmbedBuilder()
        .setTitle(tituloCompleto)
        .setColor(cor);

      if (secao.conteudo) {
        embed = embed.setDescription(truncate(secao.conteudo, MAX_DESCRIPTION));
      }

      let totalChars = (embed.data.description?.length || 0) + tituloCompleto.length + 100;
      const fieldsToAdd = [];

      for (const f of secao.fields) {
        const nome = truncate(f.nome, MAX_FIELD_NAME);
        let valor = f.valor;
        if (valor.length > MAX_FIELD_VALUE) {
          valor = truncate(valor, MAX_FIELD_VALUE);
        }
        const fieldSize = nome.length + valor.length + 10;
        if (totalChars + fieldSize > MAX_EMBED_TOTAL || fieldsToAdd.length >= MAX_FIELDS_PER_EMBED) {
          // Envia embed atual e começa outro
          if (fieldsToAdd.length > 0) {
            embed.addFields(fieldsToAdd);
            embeds.push(embed);
            embed = new EmbedBuilder()
              .setTitle(`${tituloCompleto} (continuação)`)
              .setColor(cor);
            totalChars = tituloCompleto.length + 100;
            fieldsToAdd.length = 0;
          }
        }
        fieldsToAdd.push({
          name: nome,
          value: valor,
          inline: f.inline ?? false
        });
        totalChars += fieldSize;
      }
      if (fieldsToAdd.length > 0) {
        embed.addFields(fieldsToAdd);
        embeds.push(embed);
      }
    } else {
      // Seção com apenas conteúdo
      const embed = new EmbedBuilder()
        .setTitle(tituloCompleto)
        .setDescription(truncate(secao.conteudo || '', MAX_DESCRIPTION))
        .setColor(cor);
      embeds.push(embed);
    }
  }

  return embeds;
}

const setupRegrasAcoesModule = function (client) {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.content !== '!regras-acoes') return;

    if (!message.member?.roles?.cache?.has(ADMIN_ROLE_ID)) {
      return message.reply('❌ Você não tem permissão para usar este comando.').catch(() => {});
    }

    try {
      const processingMsg = await message.reply('🔄 Buscando regras atualizadas no site...');

      let data;
      try {
        data = await fetchRegrasFromSite();
      } catch (fetchError) {
        console.warn('Erro ao buscar do site, usando arquivo local:', fetchError.message);
        if (fs.existsSync(REGRAS_JSON_PATH)) {
          data = JSON.parse(fs.readFileSync(REGRAS_JSON_PATH, 'utf-8'));
        } else {
          return processingMsg.edit(
            '❌ Não foi possível buscar do site e o arquivo `regras-acoes.json` não foi encontrado.'
          ).catch(() => {});
        }
      }

      const embeds = buildEmbeds(data);

      const channel = await message.guild.channels.fetch(ACOES_CHANNEL_ID).catch(() => null);
      if (!channel) {
        return processingMsg.edit('❌ Canal #acoes não encontrado.').catch(() => {});
      }

      await processingMsg.edit('🔄 Publicando regras no canal #acoes...').catch(() => {});

      // Discord permite até 10 embeds por mensagem
      const BATCH_SIZE = 10;
      for (let i = 0; i < embeds.length; i += BATCH_SIZE) {
        const batch = embeds.slice(i, i + BATCH_SIZE);
        await channel.send({ embeds: batch }).catch((e) => {
          console.error('Erro ao enviar embeds regras-acoes:', e);
        });
      }

      await processingMsg.edit('✅ Regras de ações publicadas no canal <#' + ACOES_CHANNEL_ID + '>!').catch(() => {});
    } catch (error) {
      console.error('Erro no regras-acoes:', error);
      await message.reply('❌ Erro ao carregar as regras. Verifique o arquivo e os logs.').catch(() => {});
    }
  });
};

export default setupRegrasAcoesModule;
