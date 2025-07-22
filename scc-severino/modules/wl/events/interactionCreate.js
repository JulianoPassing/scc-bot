import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATABASE_PATH = path.join(__dirname, '../whitelist.json');

function loadDB() {
  if (!fs.existsSync(DATABASE_PATH)) return {};
  return JSON.parse(fs.readFileSync(DATABASE_PATH, 'utf8'));
}
function saveDB(db) {
  fs.writeFileSync(DATABASE_PATH, JSON.stringify(db, null, 2));
}

export default async function(client) {
  client.on('interactionCreate', async (interaction) => {
    console.log('[WL][DEBUG] interactionCreate recebida:', {
      type: interaction.type,
      isButton: interaction.isButton && interaction.isButton(),
      isModalSubmit: interaction.isModalSubmit && interaction.isModalSubmit(),
      customId: interaction.customId
    });

    // Botão para iniciar whitelist
    if (interaction.isButton() && interaction.customId === 'iniciar_wl') {
      const userId = interaction.user.id;
      const db = loadDB();
      const user = db[userId];
      const now = new Date();
      const member = await interaction.guild.members.fetch(userId);
      const cargoAprovado = '1263487190575349892';
      const cargoAntigo = '1046404063308288098';
      if (member.roles.cache.has(cargoAntigo)) {
        try { await member.roles.remove(cargoAntigo); } catch {}
      }
      if (user && user.aprovado && member.roles.cache.has(cargoAprovado)) {
        return interaction.reply({ content: '✅ Você já foi aprovado na whitelist!', ephemeral: true });
      }
      if (user && user.tentativas >= 2) {
        const last = new Date(user.last_attempt);
        const diff = (now - last) / (1000 * 60 * 60);
        if (diff < 24) {
          return interaction.reply({ content: `⏳ Você atingiu o limite de tentativas. Tente novamente em <t:${Math.floor((last.getTime() + 24*60*60*1000)/1000)}:R>.`, ephemeral: true });
        }
      }
      // Modal único com 5 perguntas
      const modal = new ModalBuilder()
        .setCustomId('modal_wl_etapa1')
        .setTitle('Whitelist Street Car Club - Etapa 1')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('nome')
              .setLabel('1. Seu nome e sobrenome completo?')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(100)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('motivo')
              .setLabel('2. Por que quer jogar no Street Car Club?')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setMaxLength(300)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('conheceu')
              .setLabel('3. Como conheceu o servidor?')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(100)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('historia')
              .setLabel('4. Conte a história do seu personagem')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setMaxLength(400)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('q5')
              .setLabel('5. O que é RDM? (a, b, c, d)')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(1)
          )
        );
      await interaction.showModal(modal);
      return;
    }

    // Handler do modal único (etapa 1)
    if (interaction.isModalSubmit() && interaction.customId === 'modal_wl_etapa1') {
      try {
        const nome = interaction.fields.getTextInputValue('nome');
        const motivo = interaction.fields.getTextInputValue('motivo');
        const conheceu = interaction.fields.getTextInputValue('conheceu');
        const historia = interaction.fields.getTextInputValue('historia');
        const q5 = interaction.fields.getTextInputValue('q5').toLowerCase();
        // Salva temporariamente no cache do usuário
        if (!client.wlCache) client.wlCache = {};
        client.wlCache[interaction.user.id] = { nome, motivo, conheceu, historia, respostas: [q5] };
        // Responder ao usuário e informar próxima etapa (ou expandir para mais perguntas com botão futuramente)
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x00ff00)
              .setTitle('✅ Primeira etapa enviada!')
              .setDescription('Sua primeira etapa da whitelist foi enviada. Aguarde a próxima etapa ou aguarde a análise da equipe.')
              .setFooter({ text: 'Street Car Club • Sistema de Whitelist' })
          ],
          ephemeral: true
        });
        // Aqui você pode implementar lógica para enviar a próxima etapa via botão, DM, ou análise manual.
        return;
      } catch (err) {
        console.error('[WL][ERRO modal_wl_etapa1]', err);
        try {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Erro interno ao processar o formulário. Detalhe: ' + (err?.message || err), ephemeral: true });
          }
        } catch {}
        return;
      }
    }
  });
} 