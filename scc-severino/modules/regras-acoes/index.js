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
const MAX_FIELDS_PER_EMBED = 6; // Menos fields = mais espaço e melhor leitura
const REGRAS_SITE_URL = 'https://regras-scc.vercel.app/#acoes';

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

  // Embed de abertura – imagem em destaque para melhor visualização
  const introEmbed = new EmbedBuilder()
    .setAuthor({
      name: 'Street Car Club Roleplay',
      iconURL: 'https://i.imgur.com/YULctuK.png',
      url: REGRAS_SITE_URL
    })
    .setTitle(`🎯 ${data.titulo}`)
    .setURL(REGRAS_SITE_URL)
    .setDescription(`**${data.descricao}**\n\n📌 [Ver regras completas no site](${REGRAS_SITE_URL})`)
    .setColor(0xEAF207)
    .setImage('https://i.imgur.com/Wf7bGAO.png') // Banner maior (full width)
    .setThumbnail('https://i.imgur.com/YULctuK.png')
    .setFooter({ text: 'Street Car Club Roleplay • Regras oficiais • Clique no título para abrir o site' })
    .setTimestamp();
  embeds.push(introEmbed);

  for (const secao of data.secoes) {
    const tituloCompleto = `${secao.emoji} ${secao.titulo}`;
    const cor = secao.cor || 0xEAF207;

    // Seção com muitos fields (ex: Regras Gerais) - divide em mais embeds para melhor leitura
    if (secao.fields && secao.fields.length > 0) {
      let embed = new EmbedBuilder()
        .setTitle(tituloCompleto)
        .setURL(REGRAS_SITE_URL)
        .setColor(cor);

      if (secao.conteudo) {
        embed = embed.setDescription(`**${truncate(secao.conteudo, MAX_DESCRIPTION - 10)}**`);
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
              .setURL(REGRAS_SITE_URL)
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
      const conteudo = (secao.conteudo || '').trim();
      const desc = conteudo ? `**${truncate(conteudo, MAX_DESCRIPTION - 10)}**` : '';
      const embed = new EmbedBuilder()
        .setTitle(tituloCompleto)
        .setURL(REGRAS_SITE_URL)
        .setDescription(desc || '\u200b') // zero-width space se vazio
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
      const MIN_SECOES = 5;

      try {
        data = await fetchRegrasFromSite();
        if (data?.secoes?.length >= MIN_SECOES) {
          fs.writeFileSync(REGRAS_JSON_PATH, JSON.stringify(data, null, 2), 'utf-8');
        }
      } catch (fetchError) {
        console.warn('Fetch do site falhou, usando JSON local:', fetchError.message);
      }

      if (!data?.secoes?.length || data.secoes.length < MIN_SECOES) {
        if (fs.existsSync(REGRAS_JSON_PATH)) {
          data = JSON.parse(fs.readFileSync(REGRAS_JSON_PATH, 'utf-8'));
        }
      }

      if (!data?.secoes?.length) {
        return processingMsg.edit(
          '❌ Não foi possível buscar do site. Execute o comando quando o site estiver acessível para criar o arquivo de cache.'
        ).catch(() => {});
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
