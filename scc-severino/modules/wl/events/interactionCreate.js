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
    if (!interaction.isButton() || interaction.customId !== 'iniciar_wl') return;
    const userId = interaction.user.id;
    const db = loadDB();
    const user = db[userId];
    const now = new Date();
    if (user && user.aprovado) {
      return interaction.reply({ content: '✅ Você já foi aprovado na whitelist!', ephemeral: true });
    }
    if (user && user.tentativas >= 2) {
      const last = new Date(user.last_attempt);
      const diff = (now - last) / (1000 * 60 * 60);
      if (diff < 24) {
        return interaction.reply({ content: `⏳ Você atingiu o limite de tentativas. Tente novamente em <t:${Math.floor((last.getTime() + 24*60*60*1000)/1000)}:R>.`, ephemeral: true });
      }
    }
    // Modal de início
    const modal = new ModalBuilder()
      .setCustomId('modal_wl_nome')
      .setTitle('Whitelist Street Car Club - Parte 1')
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
        )
      );
    await interaction.showModal(modal);

    // Handler do primeiro modal (nome e motivo)
    if (interaction.isModalSubmit() && interaction.customId === 'modal_wl_nome') {
      const nome = interaction.fields.getTextInputValue('nome');
      const motivo = interaction.fields.getTextInputValue('motivo');
      // Salva temporariamente no cache do usuário (poderia ser em memória ou DB, aqui simplificado)
      if (!client.wlCache) client.wlCache = {};
      client.wlCache[interaction.user.id] = { nome, motivo };
      // Modal de história
      const modal = new ModalBuilder()
        .setCustomId('modal_wl_historia')
        .setTitle('Whitelist Street Car Club - Parte 2')
        .addComponents(
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
          )
        );
      await interaction.showModal(modal);
      return;
    }

    // Handler do segundo modal (história)
    if (interaction.isModalSubmit() && interaction.customId === 'modal_wl_historia') {
      const conheceu = interaction.fields.getTextInputValue('conheceu');
      const historia = interaction.fields.getTextInputValue('historia');
      if (!client.wlCache) client.wlCache = {};
      if (!client.wlCache[interaction.user.id]) client.wlCache[interaction.user.id] = {};
      client.wlCache[interaction.user.id].conheceu = conheceu;
      client.wlCache[interaction.user.id].historia = historia;
      // Iniciar fluxo das questões obrigatórias
      const questoes = [
        { id: 'q5', label: '5. O que é RDM?', placeholder: 'Responda com a letra correta (a, b, c, d)', maxLength: 1 },
        { id: 'q6', label: '6. O que é VDM?', placeholder: 'Responda com a letra correta (a, b, c, d)', maxLength: 1 },
        { id: 'q7', label: '7. O que é Dark RP?', placeholder: 'Responda com a letra correta (a, b, c, d)', maxLength: 1 },
        { id: 'q8', label: '8. O que é Safe Zone?', placeholder: 'Responda com a letra correta (a, b, c, d)', maxLength: 1 },
        { id: 'q9', label: '9. O que é Powergaming?', placeholder: 'Responda com a letra correta (a, b, c, d)', maxLength: 1 },
        { id: 'q10', label: '10. O que é Amor à Vida?', placeholder: 'Responda com a letra correta (a, b, c, d)', maxLength: 1 },
        { id: 'q11', label: '11. O que é Assalto?', placeholder: 'Responda com a letra correta (a, b, c, d)', maxLength: 1 },
        { id: 'q12', label: '12. O que é obrigatório para jogar no SCC?', placeholder: 'Responda com a letra correta (a, b, c, d)', maxLength: 1 }
      ];
      client.wlCache[interaction.user.id].questoes = questoes;
      client.wlCache[interaction.user.id].respostas = [];
      // Iniciar pela primeira questão
      const q = questoes[0];
      const modal = new ModalBuilder()
        .setCustomId('modal_wl_questao_0')
        .setTitle('Whitelist - Questão 5')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('resposta')
              .setLabel(q.label)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder(q.placeholder)
              .setMaxLength(q.maxLength)
          )
        );
      await interaction.showModal(modal);
      return;
    }

    // Handler das questões obrigatórias (perguntas 5 a 12)
    for (let i = 0; i < 8; i++) {
      if (interaction.isModalSubmit() && interaction.customId === `modal_wl_questao_${i}`) {
        const resposta = interaction.fields.getTextInputValue('resposta').toLowerCase();
        if (!client.wlCache) client.wlCache = {};
        if (!client.wlCache[interaction.user.id]) client.wlCache[interaction.user.id] = {};
        if (!client.wlCache[interaction.user.id].respostas) client.wlCache[interaction.user.id].respostas = [];
        client.wlCache[interaction.user.id].respostas[i] = resposta;
        const questoes = client.wlCache[interaction.user.id].questoes;
        if (i < questoes.length - 1) {
          // Próxima questão
          const q = questoes[i + 1];
          const modal = new ModalBuilder()
            .setCustomId(`modal_wl_questao_${i + 1}`)
            .setTitle(`Whitelist - Questão ${5 + i + 1}`)
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('resposta')
                  .setLabel(q.label)
                  .setStyle(TextInputStyle.Short)
                  .setRequired(true)
                  .setPlaceholder(q.placeholder)
                  .setMaxLength(q.maxLength)
              )
            );
          await interaction.showModal(modal);
          return;
        } else {
          // Finalizar e validar respostas
          const GABARITO = ['b', 'a', 'c', 'b', 'b', 'a', 'c', 'a'];
          const respostas = client.wlCache[interaction.user.id].respostas;
          let corretas = 0;
          for (let j = 0; j < GABARITO.length; j++) {
            if (respostas[j] && respostas[j].trim().toLowerCase() === GABARITO[j]) {
              corretas++;
            }
          }
          const aprovado = corretas === GABARITO.length;
          // Atualizar tentativas e status no JSON
          const db = loadDB();
          const userId = interaction.user.id;
          if (!db[userId]) db[userId] = { tentativas: 0, aprovado: false, last_attempt: null };
          db[userId].tentativas = (db[userId].tentativas || 0) + 1;
          db[userId].last_attempt = new Date().toISOString();
          if (aprovado) db[userId].aprovado = true;
          saveDB(db);
          // Mensagem final ao usuário
          if (aprovado) {
            // Adicionar cargo aprovado
            try {
              const member = await interaction.guild.members.fetch(interaction.user.id);
              await member.roles.add('1263487190575349892');
            } catch (e) {}
            await interaction.reply({
              embeds: [
                new EmbedBuilder()
                  .setColor(0x00ff00)
                  .setTitle('✅ Whitelist Aprovada!')
                  .setDescription('Parabéns! Você foi aprovado na whitelist e já pode jogar no servidor.')
                  .setFooter({ text: 'Street Car Club • Sistema de Whitelist' })
              ],
              ephemeral: true
            });
          } else {
            await interaction.reply({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xff0000)
                  .setTitle('❌ Whitelist Reprovada')
                  .setDescription(`Você acertou ${corretas}/${GABARITO.length} questões obrigatórias.\nVocê pode tentar novamente após o cooldown.`)
                  .setFooter({ text: 'Street Car Club • Sistema de Whitelist' })
              ],
              ephemeral: true
            });
          }
          // Enviar formulário para canal de logs
          try {
            const logChannel = interaction.guild.channels.cache.get('1396911720835973160');
            if (logChannel) {
              const cache = client.wlCache[interaction.user.id];
              const embed = new EmbedBuilder()
                .setColor(aprovado ? 0x00ff00 : 0xff0000)
                .setTitle(aprovado ? '✅ Whitelist Aprovada' : '❌ Whitelist Reprovada')
                .setDescription(`Usuário: <@${interaction.user.id}> (${interaction.user.tag})`)
                .addFields(
                  { name: 'Nome', value: cache?.nome || 'N/A', inline: false },
                  { name: 'Motivo', value: cache?.motivo || 'N/A', inline: false },
                  { name: 'Como conheceu', value: cache?.conheceu || 'N/A', inline: false },
                  { name: 'História', value: cache?.historia || 'N/A', inline: false },
                  { name: 'Respostas', value: (cache?.respostas || []).map((r, idx) => `Q${5+idx}: ${r || '-'}`).join('\n'), inline: false },
                  { name: 'Acertos', value: `${corretas}/${GABARITO.length}`, inline: true },
                  { name: 'Aprovado', value: aprovado ? 'Sim' : 'Não', inline: true }
                )
                .setTimestamp();
              await logChannel.send({ embeds: [embed] });
            }
          } catch (e) {}
          // Limpar cache temporário
          delete client.wlCache[interaction.user.id];
          return;
        }
      }
    }
  });
} 