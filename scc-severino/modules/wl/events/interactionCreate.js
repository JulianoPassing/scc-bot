import { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  CARGO_IDADE_VERIFICADA,
  CARGO_VERIFICACAO_ADICIONAL,
  buildPainelVerificacaoEtaria
} from '../verificacaoEtaria.js';
import { buildModalWlEtapa1, getWlPrecheck } from '../wlForm.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATABASE_PATH = path.join(__dirname, '../whitelist.json');

function loadDB() {
  if (!fs.existsSync(DATABASE_PATH)) return {};
  try {
    const content = fs.readFileSync(DATABASE_PATH, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error('[WL][ERRO] Falha ao carregar whitelist.json:', err.message);
    // Fazer backup do arquivo corrompido
    const backupPath = DATABASE_PATH + '.corrupted.' + Date.now();
    try {
      fs.copyFileSync(DATABASE_PATH, backupPath);
      console.log('[WL] Backup do arquivo corrompido salvo em:', backupPath);
    } catch (backupErr) {
      console.error('[WL] Falha ao criar backup:', backupErr.message);
    }
    // Retornar objeto vazio para não quebrar o bot
    return {};
  }
}

function saveDB(db) {
  // Criar backup antes de salvar
  if (fs.existsSync(DATABASE_PATH)) {
    try {
      fs.copyFileSync(DATABASE_PATH, DATABASE_PATH + '.backup');
    } catch (err) {
      console.error('[WL][ERRO] Falha ao criar backup antes de salvar:', err.message);
    }
  }
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
      const member = await interaction.guild.members.fetch(userId);

      if (!member.roles.cache.has(CARGO_IDADE_VERIFICADA)) {
        if (member.roles.cache.has(CARGO_VERIFICACAO_ADICIONAL)) {
          return interaction.reply({
            content:
              '⛔ **Verificação adicional pendente.** Sua conta está marcada para revisão e não é possível iniciar a whitelist por aqui até a equipe regularizar. Procure um canal de suporte ou ticket conforme as regras do servidor.',
            flags: MessageFlags.Ephemeral
          });
        }
        const painel = buildPainelVerificacaoEtaria({ wlFlow: true });
        return interaction.reply({
          content:
            '**Whitelist · etapa de idade**\n' +
              'Conclua a verificação abaixo (**18+**). Após confirmar, o **formulário da whitelist** será aberto automaticamente.',
          embeds: painel.embeds,
          components: painel.components,
          flags: MessageFlags.Ephemeral
        });
      }

      const pre = getWlPrecheck(member);
      if (!pre.ok) {
        return interaction.reply({ content: pre.message, flags: MessageFlags.Ephemeral });
      }

      await interaction.showModal(buildModalWlEtapa1());
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
              a: 'Locais onde crimes são permitidos',
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
          new ButtonBuilder().setCustomId('wl_a').setLabel('A').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('wl_b').setLabel('B').setStyle(ButtonStyle.Secondary)
        );
        if (q.alternativas.c && q.alternativas.c.trim()) {
          row.addComponents(new ButtonBuilder().setCustomId('wl_c').setLabel('C').setStyle(ButtonStyle.Secondary));
        }
        const embed = new EmbedBuilder()
          .setTitle(q.titulo)
          .setDescription(
            (q.desc ? `*${q.desc}*\n` : '') +
            `A) ${q.alternativas.a}\nB) ${q.alternativas.b}` + (q.alternativas.c && q.alternativas.c.trim() ? `\nC) ${q.alternativas.c}` : '')
          )
          .setColor(0x0099ff);
        await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
        return;
      } catch (err) {
        console.error('[WL][ERRO modal_wl_etapa1]', err);
        try {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Erro interno ao processar o formulário. Detalhe: ' + (err?.message || err), flags: MessageFlags.Ephemeral });
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
            new ButtonBuilder().setCustomId('wl_a').setLabel('A').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('wl_b').setLabel('B').setStyle(ButtonStyle.Secondary)
          );
          if (q.alternativas.c && q.alternativas.c.trim()) {
            row.addComponents(new ButtonBuilder().setCustomId('wl_c').setLabel('C').setStyle(ButtonStyle.Secondary));
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
          console.log('[WL][DEBUG] Finalizando whitelist para usuário:', interaction.user.tag);
          const GABARITO = ['b', 'a', 'c', 'b', 'b', 'a', 'c', 'a'];
          let corretas = 0;
          for (let i = 0; i < GABARITO.length; i++) {
            if (cache.respostas[i] && cache.respostas[i].trim().toLowerCase() === GABARITO[i]) {
              corretas++;
            }
          }
          console.log('[WL][DEBUG] Acertos:', corretas, '/', GABARITO.length);
          // Verificar idade (mínimo 18 anos — sem tag "lucky" 16–18; só cargo sem idade se < 18)
          const IDADE_MINIMA_WL = 18;
          const CARGO_SEM_IDADE = '1146863002864332873';
          /** Tag antiga 16–18 (lucky); não é mais aplicada — removida se o membro for < 18 na WL */
          const CARGO_LUCKY_16_18 = '1150870237596622868';
          let aprovado = corretas === GABARITO.length;
          let idadeNum = parseInt(cache.idade, 10);
          let cargoAprovado = '1263487190575349892';
          let cargoAntigo = '1046404063308288098';
          let motivoReprovado = '';
          if (isNaN(idadeNum) || idadeNum < IDADE_MINIMA_WL) {
            aprovado = false;
            motivoReprovado = isNaN(idadeNum)
              ? 'Idade inválida — é obrigatório ter 18 anos ou mais para a whitelist'
              : 'Idade inferior a 18 anos (mínimo para a whitelist)';
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
              try {
                if (member.roles.cache.has(CARGO_LUCKY_16_18)) {
                  await member.roles.remove(CARGO_LUCKY_16_18, 'WL 18+ — removendo tag 16–18 (não usada mais)');
                }
              } catch (_) {}
              await member.roles.add(cargoAprovado);
              await interaction.update({
                embeds: [
                  new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('✅ Whitelist Aprovada!')
                    .setDescription('Parabéns! Você foi aprovado na whitelist e já pode jogar no servidor.')
                    .setFooter({ text: 'Street Car Club • Sistema de Whitelist' })
                ],
                components: []
              });
            } else {
              const falhaIdade = isNaN(idadeNum) || idadeNum < IDADE_MINIMA_WL;
              if (falhaIdade) {
                try {
                  if (member.roles.cache.has(CARGO_LUCKY_16_18)) {
                    await member.roles.remove(CARGO_LUCKY_16_18, 'WL — menor de 18, removendo tag 16–18');
                  }
                } catch (_) {}
                try {
                  await member.roles.add(CARGO_SEM_IDADE, 'WL — sem idade mínima (menor de 18 ou idade inválida)');
                } catch (_) {}
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
            }
          } catch (e) {}
          console.log('[WL][DEBUG] Chegou ao ponto de envio da log');
          // Enviar formulário para canal de logs
          try {
            console.log('[WL][DEBUG] Tentando enviar log para canal 1396911720835973160');
            const logChannel = interaction.guild.channels.cache.get('1396911720835973160');
            console.log('[WL][DEBUG] Canal encontrado:', !!logChannel);
            
            if (logChannel) {
              const GABARITO = ['b', 'a', 'c', 'b', 'b', 'a', 'c', 'a'];
              const respostasDetalhadas = cache.respostas.map((r, idx) => {
                const correta = GABARITO[idx];
                const status = (r && r.trim().toLowerCase() === correta) ? '✅' : '❌';
                return `Q${5+idx}: ${r ? r.toUpperCase() : '-'} (Correta: ${correta.toUpperCase()}) ${status}`;
              }).join('\n');
              
                          console.log('[WL][DEBUG] Criando embed para log');
            console.log('[WL][DEBUG] Cache data:', {
              nome: cache?.nome,
              idade: cache?.idade,
              motivo: cache?.motivo,
              conheceu: cache?.conheceu,
              historia: cache?.historia,
              respostas: cache?.respostas
            });
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
                  { name: 'Idade real', value: cache?.idade || 'N/A', inline: false }
                )
                .setTimestamp();
              
              console.log('[WL][DEBUG] Enviando embed para canal de logs');
              await logChannel.send({ embeds: [embed] });
              console.log('[WL][DEBUG] Log enviado com sucesso!');
            } else {
              console.error('[WL][ERRO] Canal de logs não encontrado: 1396911720835973160');
            }
          } catch (e) {
            console.error('[WL][ERRO ao enviar log]', e);
            console.error('[WL][ERRO] Stack trace:', e.stack);
          }

          // Enviar resultado no canal especificado
          try {
            const resultadoChannel = interaction.guild.channels.cache.get('1046404064189091940');
            if (resultadoChannel) {
              if (aprovado) {
                // Se aprovado: enviar mensagem de aprovação
                await resultadoChannel.send(`<@${interaction.user.id}> Aprovado, agora basta enviar um "Nome e Sobrenome" registrável em cartório (proibido nomes com duplo sentido) no canal <#1317096106844225586> e aguardar.`);
              } else {
                // Se reprovado: enviar mensagem de reprovação e marcar cargo
                await resultadoChannel.send(`<@${interaction.user.id}> Reprovado <@&1046404063673192541>`);
              }
            }
          } catch (e) {
            console.error('[WL][ERRO ao enviar resultado]', e);
          }
          // Limpar cache temporário
          delete client.wlCache[interaction.user.id];
        }
        return;
      } catch (err) {
        console.error('[WL][ERRO wl_questao]', err);
        try {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Erro interno ao processar a questão. Detalhe: ' + (err?.message || err), flags: MessageFlags.Ephemeral });
          }
        } catch {}
        return;
      }
    }
  });
} 