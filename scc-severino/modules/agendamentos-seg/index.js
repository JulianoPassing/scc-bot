/**
 * Módulo de Agendamento de Entrevistas - StreetCarClub (Segurança)
 * ----------------------------------------------------------------
 * Comandos (apenas via texto no canal seg-*):
 *   agendamento  → (role ROLE_AGENDAMENTO_ID) abre o fluxo de agendamento
 *   reagendar    → (role ROLE_REAGENDAR_ID)   reverte o canal para prefixo-nome
 *
 * Formato dos canais:
 *   Aguardando:  seg-nomedele
 *   Agendado:    seg-ter-10h00-nomedele
 */

import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
} from 'discord.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8')
);

const { ROLE_AGENDAMENTO_ID, ROLE_REAGENDAR_ID, CATEGORIA_AGENDADOS_ID } = config;

// ============================================================
// AGENDA FIXA
// Formato: { dia: { 'HH:MM': capacidade_maxima } }
// Quinta-feira não aparece (sem atendimentos)
// ============================================================
const AGENDA = {
  seg: { '10:00': 2, '12:00': 2, '13:00': 2, '17:00': 2, '18:00': 4, '19:00': 4, '20:00': 4, '21:00': 4 },
  ter: { '10:00': 2, '12:00': 2, '13:00': 2, '17:00': 2, '18:00': 2, '19:00': 4, '20:00': 4, '21:00': 4 },
  qua: { '10:00': 2, '12:00': 2, '13:00': 2, '17:00': 2, '18:00': 2, '19:00': 2, '20:00': 2 },
  sex: { '17:00': 2, '18:00': 2, '19:00': 4, '20:00': 4, '21:00': 4 },
};

// ============================================================
// CONSTANTES
// ============================================================
const DIAS = { seg: 0, ter: 1, qua: 2, sex: 4 };

const DIAS_PT = {
  seg: 'Segunda-feira',
  ter: 'Terça-feira',
  qua: 'Quarta-feira',
  sex: 'Sexta-feira',
};

// Canal agendado: prefixo-dia-HHhMM-nome  ex: seg-ter-10h00-joao
const RE_AGENDADO = /^([a-z0-9]+)-(seg|ter|qua|sex)-(\d{2}h\d{2})-(.+)$/;

// Estado de agendamento em andamento: Map<userId, state>
const pendente = new Map();

// Lock de confirmação
const confirmandoSlot = new Set();

// ============================================================
// HELPERS
// ============================================================
const fmtTime = (t) => t.replace(':', 'h');

const isAgendado = (name) => RE_AGENDADO.test(name);

function parseAgendado(name) {
  const m = name.match(RE_AGENDADO);
  return m ? { prefixo: m[1], dia: m[2], hora: m[3], nome: m[4] } : null;
}

function diasDisponiveis() {
  const jsDay = new Date().getDay();
  const hojeNum = jsDay === 0 ? 6 : jsDay - 1;
  return Object.entries(DIAS)
    .filter(([, n]) => n > hojeNum)
    .map(([d]) => d);
}

function slotsOcupados(guild) {
  const ocupados = {};
  const cat = guild.channels.cache.get(CATEGORIA_AGENDADOS_ID);
  if (!cat) return ocupados;

  for (const [, ch] of cat.children.cache) {
    const m = ch.name.match(RE_AGENDADO);
    if (m) {
      const key = `${m[2]}_${m[3]}`;
      ocupados[key] = (ocupados[key] || 0) + 1;
    }
  }
  return ocupados;
}

function slotsDisponiveis(guild) {
  const ocupados = slotsOcupados(guild);
  const result = {};

  for (const dia of diasDisponiveis()) {
    if (!AGENDA[dia]) continue;
    const livres = Object.entries(AGENDA[dia])
      .filter(([hora, cap]) => {
        const key = `${dia}_${fmtTime(hora)}`;
        return cap - (ocupados[key] || 0) > 0;
      })
      .map(([hora]) => hora);

    if (livres.length) result[dia] = livres;
  }
  return result;
}

const nomeDoCanal = (name) => name.split('-').pop();
const prefixoDoCanal = (name) => name.split('-')[0];

async function sendTemp(channel, content, ms = 15_000) {
  const msg = await channel.send({ content });
  setTimeout(() => msg.delete().catch(() => {}), ms);
}

// ============================================================
// BUILDERS
// ============================================================
function buildDiaEmbed(slots) {
  const embed = new EmbedBuilder()
    .setTitle('📅 Agendar Entrevista')
    .setDescription('Selecione o **dia** desejado para sua entrevista:')
    .setColor(0x5865f2);

  for (const [dia, horarios] of Object.entries(slots)) {
    embed.addFields({
      name: DIAS_PT[dia],
      value: horarios.map((h) => `\`${h}\``).join('  '),
      inline: false,
    });
  }
  return embed;
}

function buildHorariosEmbed(dia, horarios) {
  return new EmbedBuilder()
    .setTitle(`🕐 Horários — ${DIAS_PT[dia]}`)
    .setDescription('Selecione o horário desejado:')
    .setColor(0x5865f2)
    .addFields(horarios.map((h) => ({ name: h, value: '✅', inline: true })));
}

function buildConfirmarEmbed(dia, hora, novoNome) {
  return new EmbedBuilder()
    .setTitle('Confirmar Agendamento')
    .setColor(0xffa500)
    .addFields(
      { name: 'Dia', value: DIAS_PT[dia], inline: true },
      { name: 'Horário', value: hora, inline: true },
      { name: 'Novo canal', value: `\`#${novoNome}\``, inline: false },
    )
    .setFooter({ text: 'Confirme ou cancele o agendamento abaixo.' });
}

function buildDiaRows(slots) {
  const buttons = Object.keys(slots).map((dia) =>
    new ButtonBuilder()
      .setCustomId(`ag_dia_${dia}`)
      .setLabel(DIAS_PT[dia])
      .setStyle(ButtonStyle.Primary),
  );
  buttons.push(
    new ButtonBuilder()
      .setCustomId('ag_cancelar')
      .setLabel('Cancelar')
      .setStyle(ButtonStyle.Danger),
  );

  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
  }
  return rows;
}

function buildHorariosRows(horarios) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('ag_hora')
    .setPlaceholder('Escolha o horário…')
    .addOptions(horarios.map((h) => ({ label: h, value: h })));

  return [
    new ActionRowBuilder().addComponents(menu),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ag_back_dia')
        .setLabel('← Voltar')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function buildConfirmarRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ag_confirmar').setLabel('✅ Confirmar').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('ag_back_hora').setLabel('← Voltar').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ag_cancelar').setLabel('❌ Cancelar').setStyle(ButtonStyle.Danger),
    ),
  ];
}

// ============================================================
// SETUP
// ============================================================
const setupAgendamentosSegModule = function (client) {
  // Apenas canais seg-* (tickets de segurança)
  const isCanalSeg = (name) => name && name.startsWith('seg-');

  // --- messageCreate ---
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!isCanalSeg(message.channel?.name)) return;

    const cmd = message.content.trim().toLowerCase();
    const channel = message.channel;
    const member = message.member;
    const guild = message.guild;

    if (cmd === 'agendamento') {
      if (!member.roles.cache.has(ROLE_AGENDAMENTO_ID)) {
        try { await message.delete(); } catch {}
        return;
      }

      if (isAgendado(channel.name)) {
        try { await message.delete(); } catch {}
        await sendTemp(
          channel,
          `${member} ❌ Este canal já possui um agendamento ativo.\nUm coordenador pode usar \`reagendar\` para liberar a data.`,
          15_000,
        );
        return;
      }

      try { await message.delete(); } catch {}

      const slots = slotsDisponiveis(guild);
      if (!Object.keys(slots).length) {
        await sendTemp(channel, `${member} ❌ Não há dias ou horários disponíveis para esta semana.`, 15_000);
        return;
      }

      const prefixo = prefixoDoCanal(channel.name);
      const nome = nomeDoCanal(channel.name);

      pendente.set(member.id, { channelId: channel.id, prefixo, nome, dia: null, hora: null });

      await channel.send({
        content: `${member}`,
        embeds: [buildDiaEmbed(slots)],
        components: buildDiaRows(slots),
      });
    } else if (cmd === 'reagendar') {
      if (!member.roles.cache.has(ROLE_REAGENDAR_ID)) {
        try { await message.delete(); } catch {}
        return;
      }

      if (!isAgendado(channel.name)) {
        try { await message.delete(); } catch {}
        await sendTemp(channel, `${member} ❌ Este canal não possui agendamento ativo.`, 15_000);
        return;
      }

      try { await message.delete(); } catch {}

      const parsed = parseAgendado(channel.name);
      if (!parsed) {
        await sendTemp(channel, `${member} ❌ Erro ao processar nome do canal.`, 10_000);
        return;
      }

      const novoNome = `${parsed.prefixo}-${parsed.nome}`;
      try {
        await channel.setName(novoNome);
        await sendTemp(
          channel,
          `${member} ✅ Agendamento removido. Canal renomeado para \`#${novoNome}\`.\nO candidato pode usar \`agendamento\` para remarcar.`,
          20_000,
        );
      } catch {
        await sendTemp(channel, `${member} ❌ Sem permissão para renomear o canal.`, 10_000);
      }
    }
  });

  // --- interactionCreate ---
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

    const customId = interaction.customId;
    if (!customId.startsWith('ag_')) return;

    const uid = interaction.user.id;
    const state = pendente.get(uid);
    const isOwner = state && state.channelId === interaction.channelId;

    if (interaction.isButton() && customId.startsWith('ag_dia_')) {
      if (!isOwner) {
        return interaction.reply({ content: 'Apenas o solicitante pode usar este menu.', ephemeral: true });
      }

      const dia = customId.replace('ag_dia_', '');
      const slots = slotsDisponiveis(interaction.guild);
      const horarios = slots[dia];

      if (!horarios?.length) {
        return interaction.update({ content: '❌ Não há mais horários disponíveis para este dia.', embeds: [], components: [] });
      }

      state.dia = dia;
      pendente.set(uid, state);

      return interaction.update({
        embeds: [buildHorariosEmbed(dia, horarios)],
        components: buildHorariosRows(horarios),
      });
    }

    if (interaction.isStringSelectMenu() && customId === 'ag_hora') {
      if (!isOwner) {
        return interaction.reply({ content: 'Apenas o solicitante pode usar este menu.', ephemeral: true });
      }

      const hora = interaction.values[0];
      const novoNome = `${state.prefixo}-${state.dia}-${fmtTime(hora)}-${state.nome}`;

      state.hora = hora;
      pendente.set(uid, state);

      return interaction.update({
        embeds: [buildConfirmarEmbed(state.dia, hora, novoNome)],
        components: buildConfirmarRows(),
      });
    }

    if (interaction.isButton() && customId === 'ag_back_dia') {
      if (!isOwner) {
        return interaction.reply({ content: 'Apenas o solicitante pode usar este botão.', ephemeral: true });
      }

      const slots = slotsDisponiveis(interaction.guild);
      if (!Object.keys(slots).length) {
        return interaction.update({ content: 'Sem horários disponíveis.', embeds: [], components: [] });
      }

      state.dia = null;
      state.hora = null;
      pendente.set(uid, state);

      return interaction.update({
        embeds: [buildDiaEmbed(slots)],
        components: buildDiaRows(slots),
      });
    }

    if (interaction.isButton() && customId === 'ag_back_hora') {
      if (!isOwner) {
        return interaction.reply({ content: 'Apenas o solicitante pode usar este botão.', ephemeral: true });
      }

      const slots = slotsDisponiveis(interaction.guild);
      const horarios = slots[state.dia];

      if (!horarios?.length) {
        return interaction.update({ content: '❌ Não há mais horários disponíveis para este dia.', embeds: [], components: [] });
      }

      state.hora = null;
      pendente.set(uid, state);

      return interaction.update({
        embeds: [buildHorariosEmbed(state.dia, horarios)],
        components: buildHorariosRows(horarios),
      });
    }

    if (interaction.isButton() && customId === 'ag_confirmar') {
      if (!isOwner) {
        return interaction.reply({ content: 'Apenas o solicitante pode confirmar.', ephemeral: true });
      }

      const slotKey = `${state.dia}_${fmtTime(state.hora)}`;

      if (confirmandoSlot.has(slotKey)) {
        return interaction.update({
          content: '⏳ Outro candidato está confirmando este horário agora. Aguarde um momento e tente novamente com `agendamento`.',
          embeds: [],
          components: [],
        });
      }
      confirmandoSlot.add(slotKey);

      try {
        const slots = slotsDisponiveis(interaction.guild);
        const horarios = slots[state.dia] || [];

        if (!horarios.includes(state.hora)) {
          pendente.delete(uid);
          return interaction.update({
            content: '❌ Este horário não está mais disponível. Reinicie com `agendamento`.',
            embeds: [],
            components: [],
          });
        }

        const novoNome = `${state.prefixo}-${state.dia}-${fmtTime(state.hora)}-${state.nome}`;
        const cat = interaction.guild.channels.cache.get(CATEGORIA_AGENDADOS_ID);

        await interaction.channel.edit({ name: novoNome, parent: cat ?? CATEGORIA_AGENDADOS_ID });
        pendente.delete(uid);

        const embed = new EmbedBuilder()
          .setTitle('✅ Entrevista Agendada!')
          .setColor(0x57f287)
          .addFields(
            { name: 'Dia', value: DIAS_PT[state.dia], inline: true },
            { name: 'Horário', value: state.hora, inline: true },
            { name: 'Canal', value: `\`#${novoNome}\``, inline: false },
          );

        return interaction.update({ content: null, embeds: [embed], components: [] });
      } catch {
        pendente.delete(uid);
        return interaction.update({
          content: '❌ O bot não tem permissão para renomear/mover este canal.',
          embeds: [],
          components: [],
        });
      } finally {
        confirmandoSlot.delete(slotKey);
      }
    }

    if (interaction.isButton() && customId === 'ag_cancelar') {
      if (!isOwner) {
        return interaction.reply({ content: 'Apenas o solicitante pode cancelar.', ephemeral: true });
      }
      pendente.delete(uid);
      return interaction.update({ content: 'Agendamento cancelado.', embeds: [], components: [] });
    }
  });
};

export default setupAgendamentosSegModule;
