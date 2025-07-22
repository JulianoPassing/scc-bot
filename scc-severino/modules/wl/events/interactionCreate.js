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
      // Modal etapa 1: dados pessoais
      const modal = new ModalBuilder()
        .setCustomId('modal_wl_etapa1')
        .setTitle('Whitelist Street Car Club - Dados Pessoais')
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
          )
        );
      await interaction.showModal(modal);
      return;
    }

    // Handler do modal etapa 1
    if (interaction.isModalSubmit() && interaction.customId === 'modal_wl_etapa1') {
      try {
        const nome = interaction.fields.getTextInputValue('nome');
        const motivo = interaction.fields.getTextInputValue('motivo');
        const conheceu = interaction.fields.getTextInputValue('conheceu');
        const historia = interaction.fields.getTextInputValue('historia');
        if (!client.wlCache) client.wlCache = {};
        client.wlCache[interaction.user.id] = { nome, motivo, conheceu, historia, respostas: [] };
        // Modal etapa 2: questões 5-9
        const modal = new ModalBuilder()
          .setCustomId('modal_wl_etapa2')
          .setTitle('Whitelist - Questões 5 a 9')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('q5')
                .setLabel('5. O que é RDM?\nA) Matar após RP com motivo válido\nB) Matar aleatoriamente sem motivo\nC) Evento oficial de mata-mata\n(Responda apenas a letra)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(1)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('q6')
                .setLabel('6. O que é VDM?\nA) Usar veículo para matar sem motivo RP\nB) Fugir da polícia em alta velocidade\nC) Participar de corridas de rua\n(Responda apenas a letra)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(1)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('q7')
                .setLabel('7. O que é Dark RP?\nA) Interpretar apenas personagens policiais\nB) Atividades criminosas apenas à noite\nC) RP com temas pesados proibidos\n(Responda apenas a letra)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(1)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('q8')
                .setLabel('8. O que é Safe Zone?\nA) Locais onde crimes são proibidos\nB) Locais seguros\nC) Área só para administradores\n(Responda apenas a letra)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(1)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('q9')
                .setLabel('9. O que é Powergaming?\nA) Usar conhecimento para ter vantagens\nB) Abusar de mecânicas para vencer\nC) Interpretar personagem muito forte\n(Responda apenas a letra)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(1)
            )
          );
        await interaction.showModal(modal);
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

    // Handler do modal etapa 2
    if (interaction.isModalSubmit() && interaction.customId === 'modal_wl_etapa2') {
      try {
        const q5 = interaction.fields.getTextInputValue('q5').toLowerCase();
        const q6 = interaction.fields.getTextInputValue('q6').toLowerCase();
        const q7 = interaction.fields.getTextInputValue('q7').toLowerCase();
        const q8 = interaction.fields.getTextInputValue('q8').toLowerCase();
        const q9 = interaction.fields.getTextInputValue('q9').toLowerCase();
        if (!client.wlCache) client.wlCache = {};
        if (!client.wlCache[interaction.user.id]) client.wlCache[interaction.user.id] = { respostas: [] };
        client.wlCache[interaction.user.id].respostas = [q5, q6, q7, q8, q9];
        // Modal etapa 3: questões 10-12
        const modal = new ModalBuilder()
          .setCustomId('modal_wl_etapa3')
          .setTitle('Whitelist - Questões 10 a 12')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('q10')
                .setLabel('10. O que é Amor à Vida?\nA) Valorizar a vida evitando perigos\nB) Regra que proíbe namoro no jogo\nC) Obrigação de chamar ambulância\n(Responda apenas a letra)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(1)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('q11')
                .setLabel('11. Em qual situação você assaltaria uma pessoa?\nA) A partir das 22 horas\nB) Das 00 às 5 horas\nC) Não é permitido assalto\n(Responda apenas a letra)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(1)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('q12')
                .setLabel('12. Você tem MICROFONE?\nA) SIM\nB) NÃO\n(Responda apenas a letra)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(1)
            )
          );
        await interaction.showModal(modal);
        return;
      } catch (err) {
        console.error('[WL][ERRO modal_wl_etapa2]', err);
        try {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Erro interno ao processar o formulário. Detalhe: ' + (err?.message || err), ephemeral: true });
          }
        } catch {}
        return;
      }
    }

    // Handler do modal etapa 3 (final)
    if (interaction.isModalSubmit() && interaction.customId === 'modal_wl_etapa3') {
      try {
        const q10 = interaction.fields.getTextInputValue('q10').toLowerCase();
        const q11 = interaction.fields.getTextInputValue('q11').toLowerCase();
        const q12 = interaction.fields.getTextInputValue('q12').toLowerCase();
        if (!client.wlCache) client.wlCache = {};
        if (!client.wlCache[interaction.user.id]) client.wlCache[interaction.user.id] = { respostas: [] };
        // Recuperar respostas anteriores
        let respostas = client.wlCache[interaction.user.id].respostas || [];
        respostas = respostas.concat([q10, q11, q12]);
        // Conferir respostas
        const GABARITO = ['b', 'a', 'c', 'b', 'b', 'a', 'c', 'a'];
        let corretas = 0;
        for (let i = 0; i < GABARITO.length; i++) {
          if (respostas[i] && respostas[i].trim().toLowerCase() === GABARITO[i]) {
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
                { name: 'Respostas', value: respostas.map((r, idx) => `Q${5+idx}: ${r || '-'}`).join('\n'), inline: false },
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
      } catch (err) {
        console.error('[WL][ERRO modal_wl_etapa3]', err);
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