import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
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
    try {
      // Verificar se a interação já foi processada
      if (interaction.replied || interaction.deferred) {
        return;
      }

      // Verificar se a interação pertence ao módulo de whitelist
      const isWhitelistInteraction = (customId) => {
        const whitelistPrefixes = [
          'iniciar_wl', // Botão para iniciar whitelist
          'modal_wl_etapa1', // Modal de dados pessoais
          'wl_a', // Resposta A
          'wl_b', // Resposta B
          'wl_c'  // Resposta C
        ];
        
        return whitelistPrefixes.some(prefix => customId === prefix || customId.startsWith(prefix));
      };

      // Se não for uma interação de whitelist, não processar
      if (!isWhitelistInteraction(interaction.customId)) {
        return;
      }

      // Botão para iniciar whitelist
      if (interaction.isButton() && interaction.customId === 'iniciar_wl') {
        const userId = interaction.user.id;
        const db = loadDB();
        const user = db[userId];
        const now = new Date();
        const member = await interaction.guild.members.fetch(userId);
        const cargoAprovado = '1263487190575349892';
        const cargoAntigo = '1046404063308288098';
        // Remover cargo antigo SOMENTE SE APROVADO (não aqui)
        // if (member.roles.cache.has(cargoAntigo)) {
        //   try { await member.roles.remove(cargoAntigo); } catch {}
        // }
        if (user && user.aprovado && member.roles.cache.has(cargoAprovado)) {
          await interaction.reply({ content: '✅ Você já foi aprovado na whitelist!', flags: 64 });
          return;
        }
        // Limite de tentativas/cooldown restaurado, mas sem limite para quem tem o cargo especial
        if (!member.roles.cache.has('1046404063689977984')) {
          if (user && user.tentativas >= 2) {
            const last = new Date(user.last_attempt);
            const diff = (now - last) / (1000 * 60 * 60);
            if (diff < 24) {
              await interaction.reply({ content: `⏳ Você atingiu o limite de tentativas. Tente novamente em <t:${Math.floor((last.getTime() + 24*60*60*1000)/1000)}:R>.`, flags: 64 });
              return;
            }
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
                .setCustomId('idade')
                .setLabel('2. Qual sua idade?')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(2)
                .setPlaceholder('Digite apenas números, ex: 18')
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('motivo')
                .setLabel('3. Por que quer jogar no Street Car Club?')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(300)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('conheceu')
                .setLabel('4. Como conheceu o servidor?')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(100)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('historia')
                .setLabel('5. História do personagem')
                .setPlaceholder('Digite uma história com no mínimo 700 caracteres')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMinLength(700)
                .setMaxLength(2000)
            )
          );
        await interaction.showModal(modal);
        return;
      }

      // Handler do modal etapa 1 (dados pessoais)
      if (interaction.isModalSubmit() && interaction.customId === 'modal_wl_etapa1') {
        try {
          const nome = interaction.fields.getTextInputValue('nome');
          const idade = interaction.fields.getTextInputValue('idade');
          const motivo = interaction.fields.getTextInputValue('motivo');
          const conheceu = interaction.fields.getTextInputValue('conheceu');
          const historia = interaction.fields.getTextInputValue('historia');
          if (!client.wlCache) client.wlCache = {};
          client.wlCache[interaction.user.id] = { nome, idade, motivo, conheceu, historia, respostas: [], questaoAtual: 0 };
          // Iniciar perguntas obrigatórias (5 a 12) via botões
          const questoes = [
            {
              titulo: '5. O que é RDM?',
              desc: 'Random Deathmatch',
              alternativas: {
                a: 'Matar após RP com motivo válido',
                b: 'Matar aleatoriamente sem motivo',
                c: 'Evento oficial de mata-mata'
              }
            },
            {
              titulo: '6. O que é VDM?',
              desc: 'Vehicle Deathmatch',
              alternativas: {
                a: 'Usar veículo para matar sem motivo',
                b: 'Fugir da polícia em alta velocidade',
                c: 'Participar de corridas de rua'
              }
            },
            {
              titulo: '7. O que é Dark RP?',
              desc: '',
              alternativas: {
                a: 'Interpretar apenas personagens policiais',
                b: 'Atividades criminosas apenas à noite',
                c: 'RP com temas pesados ou proibidos'
              }
            },
            {
              titulo: '8. O que é Safe Zone?',
              desc: 'Área Segura',
              alternativas: {
                a: 'Locais onde crimes são liberados',
                b: 'Locais seguros',
                c: 'Área só para administradores'
              }
            },
            {
              titulo: '9. O que é Powergaming?',
              desc: '',
              alternativas: {
                a: 'Usar conhecimento para ter vantagens',
                b: 'Abusar de mecânicas do jogo',
                c: 'Interpretar personagem muito forte'
              }
            },
            {
              titulo: '10. O que é Amor à Vida?',
              desc: '',
              alternativas: {
                a: 'Valorizar a vida evitando perigos',
                b: 'Regra que proíbe namoro no jogo',
                c: 'Obrigação de chamar ambulância'
              }
            },
            {
              titulo: '11. Em qual situação você assaltaria uma pessoa?',
              desc: '',
              alternativas: {
                a: 'A partir das 22 horas',
                b: 'Das 00 às 5 horas',
                c: 'Não é permitido assalto'
              }
            },
            {
              titulo: '12. Você tem MICROFONE?',
              desc: '',
              alternativas: {
                a: 'SIM',
                b: 'NÃO'
              }
            }
          ];
          client.wlCache[interaction.user.id].questoes = questoes;
          // Enviar primeira questão
          const q = questoes[0];
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('wl_a').setLabel('A').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('wl_b').setLabel('B').setStyle(ButtonStyle.Primary)
          );
          if (q.alternativas.c && q.alternativas.c.trim()) {
            row.addComponents(new ButtonBuilder().setCustomId('wl_c').setLabel('C').setStyle(ButtonStyle.Primary));
          }
          const embed = new EmbedBuilder()
            .setTitle(q.titulo)
            .setDescription(
              (q.desc ? `*${q.desc}*\n` : '') +
              `A) ${q.alternativas.a}\nB) ${q.alternativas.b}` + (q.alternativas.c && q.alternativas.c.trim() ? `\nC) ${q.alternativas.c}` : '')
            )
            .setColor(0x0099ff);
          await interaction.reply({ embeds: [embed], components: [row], flags: 64 });
          return;
        } catch (err) {
          console.error('[WL][ERRO modal_wl_etapa1]', err);
          try {
            if (!interaction.replied && !interaction.deferred) {
              await interaction.reply({ content: '❌ Erro interno ao processar o formulário. Detalhe: ' + (err?.message || err), flags: 64 });
            }
          } catch {}
          return;
        }
      }

      // Handler dos botões das questões obrigatórias
      if (interaction.isButton() && interaction.customId.startsWith('wl_')) {
        try {
          if (!client.wlCache) client.wlCache = {};
          const cache = client.wlCache[interaction.user.id];
          if (!cache || !cache.questoes) return;
          const alternativa = interaction.customId.replace('wl_', '');
          const idx = cache.questaoAtual || 0;
          cache.respostas[idx] = alternativa;
          // Próxima questão ou finalizar
          if (idx < cache.questoes.length - 1) {
            cache.questaoAtual = idx + 1;
            const q = cache.questoes[cache.questaoAtual];
            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('wl_a').setLabel('A').setStyle(ButtonStyle.Primary),
              new ButtonBuilder().setCustomId('wl_b').setLabel('B').setStyle(ButtonStyle.Primary)
            );
            if (q.alternativas.c && q.alternativas.c.trim()) {
              row.addComponents(new ButtonBuilder().setCustomId('wl_c').setLabel('C').setStyle(ButtonStyle.Primary));
            }
            const embed = new EmbedBuilder()
              .setTitle(q.titulo)
              .setDescription(
                (q.desc ? `*${q.desc}*\n` : '') +
                `A) ${q.alternativas.a}\nB) ${q.alternativas.b}` + (q.alternativas.c && q.alternativas.c.trim() ? `\nC) ${q.alternativas.c}` : '')
              )
              .setColor(0x0099ff);
            await interaction.update({ embeds: [embed], components: [row] });
          } else {
            // Conferir respostas
            const GABARITO = ['b', 'a', 'c', 'b', 'b', 'a', 'c', 'a'];
            let corretas = 0;
            for (let i = 0; i < GABARITO.length; i++) {
              if (cache.respostas[i] && cache.respostas[i].trim().toLowerCase() === GABARITO[i]) {
                corretas++;
              }
            }
            // Verificar idade
            let aprovado = corretas === GABARITO.length;
            let idadeNum = parseInt(cache.idade);
            let cargoMenor16 = '1146863002864332873';
            let cargo16a18 = '1150870237596622868';
            let cargoAprovado = '1263487190575349892';
            let cargoAntigo = '1046404063308288098';
            let motivoReprovado = '';
            if (isNaN(idadeNum) || idadeNum < 16) {
              aprovado = false;
              motivoReprovado = 'Idade menor que 16 anos';
            }
            // Atualizar tentativas e status no JSON
            const db = loadDB();
            const userId = interaction.user.id;
            if (!db[userId]) db[userId] = { tentativas: 0, aprovado: false, last_attempt: null };
            db[userId].tentativas = (db[userId].tentativas || 0) + 1;
            db[userId].last_attempt = new Date().toISOString();
            if (aprovado) db[userId].aprovado = true;
            saveDB(db);
            // Mensagem final ao usuário e manipulação de cargos
            try {
              const member = await interaction.guild.members.fetch(interaction.user.id);
              if (aprovado) {
                // Remover cargo antigo se aprovado
                if (member.roles.cache.has(cargoAntigo)) {
                  try { await member.roles.remove(cargoAntigo); } catch {}
                }
                // 16-18 anos: dois cargos
                if (idadeNum >= 16 && idadeNum < 18) {
                  await member.roles.add(cargoAprovado);
                  await member.roles.add(cargo16a18);
                } else if (idadeNum >= 18) {
                  await member.roles.add(cargoAprovado);
                }
                await interaction.update({
                  embeds: [
                    new EmbedBuilder()
                      .setColor(0x00ff00)
                      .setTitle('✅ Whitelist Aprovada!')
                      .setDescription(`<@${interaction.user.id}> Aprovado, agora basta enviar um "Nome e Sobrenome" registrável em cartório (proibido nomes com duplo sentido) no canal <#1317096106844225586> e aguardar.`)
                      .setFooter({ text: 'Street Car Club • Sistema de Whitelist' })
                  ],
                  components: []
                });
                // Enviar mensagem de aprovação no canal de notificação
                try {
                  const notifyChannel = interaction.guild.channels.cache.get('1046404064189091940');
                  if (notifyChannel) {
                    await notifyChannel.send({ content: `<@${interaction.user.id}> Aprovado, agora basta enviar um "Nome e Sobrenome" registrável em cartório (proibido nomes com duplo sentido) no canal <#1317096106844225586> e aguardar.` });
                  }
                } catch (e) { console.error('[WL][NOTIFY][APROVADO]', e); }
              } else {
                // Menor de 16: cargo de reprovado
                if (idadeNum < 16) {
                  await member.roles.add(cargoMenor16);
                }
                await interaction.update({
                  embeds: [
                    new EmbedBuilder()
                      .setColor(0xff0000)
                      .setTitle('❌ Whitelist Reprovada')
                      .setDescription(`Você acertou ${corretas}/${GABARITO.length} questões obrigatórias.\n${motivoReprovado ? 'Motivo: ' + motivoReprovado : 'Você pode tentar novamente após o cooldown.'}`)
                      .setFooter({ text: 'Street Car Club • Sistema de Whitelist' })
                  ],
                  components: []
                });
                // Enviar mensagem de reprovação no canal de notificação
                try {
                  const notifyChannel = interaction.guild.channels.cache.get('1046404064189091940');
                  if (notifyChannel) {
                    let motivo = motivoReprovado && idadeNum < 16 ? 'Reprovado, não atinge idade mínima' : 'Reprovado';
                    await notifyChannel.send({ content: `<@${interaction.user.id}> ${motivo} <@&1046404063673192541>` });
                  }
                } catch (e) { console.error('[WL][NOTIFY][REPROVADO]', e); }
              }
            } catch (e) {}
            // Enviar formulário para canal de logs
            try {
              const logChannel = interaction.guild.channels.cache.get('1396911720835973160');
              if (logChannel) {
                const GABARITO = ['b', 'a', 'c', 'b', 'b', 'a', 'c', 'a'];
                const respostasDetalhadas = cache.respostas.map((r, idx) => {
                  const correta = GABARITO[idx];
                  const status = (r && r.trim().toLowerCase() === correta) ? '✅' : '❌';
                  return `Q${5+idx}: ${r ? r.toUpperCase() : '-'} (Correta: ${correta.toUpperCase()}) ${status}`;
                }).join('\n');
                const embed = new EmbedBuilder()
                  .setColor(aprovado ? 0x00ff00 : 0xff0000)
                  .setTitle(aprovado ? '✅ Whitelist Aprovada' : '❌ Whitelist Reprovada')
                  .setDescription(`Usuário: <@${interaction.user.id}> (${interaction.user.tag})`)
                  .addFields(
                    { name: 'Nome', value: cache?.nome || 'N/A', inline: false },
                    { name: 'Motivo', value: cache?.motivo || 'N/A', inline: false },
                    { name: 'Como conheceu', value: cache?.conheceu || 'N/A', inline: false },
                    { name: 'História', value: cache?.historia || 'N/A', inline: false },
                    { name: 'Respostas', value: respostasDetalhadas, inline: false },
                    { name: 'Acertos', value: `${corretas}/${GABARITO.length}`, inline: true },
                    { name: 'Aprovado', value: aprovado ? 'Sim' : 'Não', inline: true },
                    { name: 'Idade', value: cache?.idade || 'N/A', inline: false }
                  )
                  .setTimestamp();
                await logChannel.send({ embeds: [embed] });
              }
            } catch (e) {}
            // Limpar cache temporário
            delete client.wlCache[interaction.user.id];
          }
          return;
        } catch (err) {
          console.error('[WL][ERRO wl_questao]', err);
          try {
            if (!interaction.replied && !interaction.deferred) {
              await interaction.reply({ content: '❌ Erro interno ao processar a questão. Detalhe: ' + (err?.message || err), flags: 64 });
            }
          } catch {}
          return;
        }
      }
    } catch (error) {
      console.error('[WL][ERRO GERAL]', error);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ Ocorreu um erro ao processar sua interação.', flags: 64 });
        }
      } catch (e) {}
    }
  });
} 