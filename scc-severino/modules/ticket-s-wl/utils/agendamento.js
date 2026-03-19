/**
 * Módulo de Agendamento de Atendimento - Tickets de Segurança
 * ----------------------------------------------------------
 * Integrado ao ticket-s-wl. Permite ao criador do ticket agendar
 * o atendimento. Apenas tickets de segurança (seg-*).
 *
 * Comandos (via texto no canal do ticket):
 *   agendamento  → abre o fluxo de agendamento (criador do ticket)
 *   reagendar    → (staff) reverte o canal para seg-nome
 *
 * Formato dos canais:
 *   Aguardando:  seg-nomedele
 *   Agendado:    seg-ter-10h00-nomedele
 */

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
} from 'discord.js';
import config from '../config.json' with { type: 'json' };

// ============================================================
// CONSTANTES
// ============================================================
const DIAS = { seg: 0, ter: 1, qua: 2, sex: 4 };
const DIAS_PT = { seg: 'Segunda-feira', ter: 'Terça-feira', qua: 'Quarta-feira', sex: 'Sexta-feira' };
const DIA_PARA_JS = { seg: 1, ter: 2, qua: 3, sex: 5 };
const MAX_CHANNELS_PER_CATEGORY = 50;

// Regex: seg-ter-10h00-username
const RE_AGENDADO = /^seg-(seg|ter|qua|sex)-(\d{2}h\d{2})-(.+)$/;

// Estado de agendamento em andamento: Map<userId, state>
export const pendente = new Map();

// Lock de confirmação para evitar race condition
const confirmandoSlot = new Set();

// IDs dos canais que já receberam lembretes
export const lembreteCanal = new Set();
export const lembreteDM = new Set();

// channelId → userId para DM no lembrete
export const agendadoPorUsuario = new Map();

// Config padrão (merge com config.json)
const DEFAULT_AGENDA = {
  seg: { '10:00': 2, '12:00': 2, '13:00': 2, '17:00': 2, '18:00': 4, '19:00': 4, '20:00': 4, '21:00': 4 },
  ter: { '10:00': 2, '12:00': 2, '13:00': 2, '17:00': 2, '18:00': 2, '19:00': 4, '20:00': 4, '21:00': 4 },
  qua: { '10:00': 2, '12:00': 2, '13:00': 2, '17:00': 2, '18:00': 2, '19:00': 2, '20:00': 2 },
  sex: { '17:00': 2, '18:00': 2, '19:00': 4, '20:00': 4, '21:00': 4 },
};

const DEFAULT_MENSAGENS = {
  lembrete: 'No horário agendado é só entrar na call e aguardar. Assim que a equipe tiver disponível irá te atender.',
  dm_lembrete: 'Faltam 10 minutos para o seu atendimento agendado! Entre na call no horário e aguarde.',
  ja_agendado: '❌ Este ticket já possui um agendamento ativo. Entre em contato com a Staff solicitando Reagendamento.',
  sem_vagas: '❌ Não há dias ou horários disponíveis para esta semana. Tente agendar na sexta-feira ou fim de semana.',
  categoria_cheia: '❌ A categoria de tickets agendados está cheia (máx. 50 canais). Tente novamente mais tarde.',
};

function getAgenda() {
  return config.agendamento?.agenda ? { ...DEFAULT_AGENDA, ...config.agendamento.agenda } : DEFAULT_AGENDA;
}

export function getMensagens() {
  return config.agendamento?.mensagens ? { ...DEFAULT_MENSAGENS, ...config.agendamento.mensagens } : DEFAULT_MENSAGENS;
}

// ============================================================
// HELPERS
// ============================================================
export const fmtTime = (t) => t.replace(':', 'h');

export function isAgendado(name) {
  return RE_AGENDADO.test(name);
}

export function parseAgendado(name) {
  const m = name.match(RE_AGENDADO);
  return m ? { dia: m[1], hora: m[2], nome: m[3] } : null;
}

export function nomeDoCanal(name) {
  if (isAgendado(name)) return parseAgendado(name).nome;
  return name.replace(/^seg-/, '');
}

function isProximaSemana() {
  const jsDay = new Date().getDay();
  const hojeNum = jsDay === 0 ? 6 : jsDay - 1;
  return !Object.values(DIAS).some((n) => n > hojeNum);
}

function diasDisponiveis() {
  const jsDay = new Date().getDay();
  const hojeNum = jsDay === 0 ? 6 : jsDay - 1;
  const diasAtual = Object.entries(DIAS)
    .filter(([, n]) => n > hojeNum)
    .map(([d]) => d);
  return diasAtual.length ? diasAtual : Object.keys(DIAS);
}

export function slotsOcupados(guild) {
  const ocupados = {};
  for (const [, ch] of guild.channels.cache) {
    const m = ch.name.match(RE_AGENDADO);
    if (m) {
      const key = `${m[1]}_${m[2]}`;
      ocupados[key] = (ocupados[key] || 0) + 1;
    }
  }
  return ocupados;
}

export function slotsDisponiveis(guild) {
  const ocupados = slotsOcupados(guild);
  const result = {};
  const agenda = getAgenda();

  for (const dia of diasDisponiveis()) {
    if (!agenda[dia]) continue;
    const livres = Object.entries(agenda[dia])
      .filter(([hora, cap]) => {
        const key = `${dia}_${fmtTime(hora)}`;
        return cap - (ocupados[key] || 0) > 0;
      })
      .map(([hora]) => hora);
    if (livres.length) result[dia] = livres;
  }
  return result;
}

export function labelDia(dia) {
  if (!isProximaSemana()) return DIAS_PT[dia];
  const targetJSDay = DIA_PARA_JS[dia];
  const now = new Date();
  let diff = targetJSDay - now.getDay();
  if (diff <= 0) diff += 7;
  const date = new Date(now);
  date.setDate(now.getDate() + diff);
  const dd = String(date.getDate()).padStart(2, '0');
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  return `${DIAS_PT[dia]} (${dd}/${mo})`;
}

function getAppointmentDate(dia, horaFmt) {
  const targetJSDay = DIA_PARA_JS[dia];
  if (targetJSDay === undefined) return null;
  const [hh, mm] = horaFmt.split('h').map(Number);
  const now = new Date();
  let diff = targetJSDay - now.getDay();
  if (diff < 0) diff += 7;
  const target = new Date(now);
  target.setDate(now.getDate() + diff);
  target.setHours(hh, mm, 0, 0);
  return target > now ? target : null;
}

/** Verifica se a categoria de agendados tem espaço */
export function categoriaAgendadosTemEspaco(guild) {
  const catId = config.agendamento?.categoryAgendadosId || '1378778111856087130';
  const category = guild.channels.cache.get(catId);
  if (!category || category.type !== 4) return false;
  const children = guild.channels.cache.filter((ch) => ch.parentId === catId);
  return children.size < MAX_CHANNELS_PER_CATEGORY;
}

// ============================================================
// LEMBRETES
// ============================================================
export async function checkReminders(client) {
  const mensagens = getMensagens();

  for (const [, guild] of client.guilds.cache) {
    for (const [, channel] of guild.channels.cache) {
      if (!channel.isTextBased()) continue;
      const parsed = parseAgendado(channel.name);
      if (!parsed) continue;

      const appointmentDate = getAppointmentDate(parsed.dia, parsed.hora);
      if (!appointmentDate) continue;

      const secUntil = (appointmentDate - Date.now()) / 1000;
      const horaExibida = parsed.hora.replace('h', ':');
      const ddR = String(appointmentDate.getDate()).padStart(2, '0');
      const moR = String(appointmentDate.getMonth() + 1).padStart(2, '0');
      const diaLabel = `${DIAS_PT[parsed.dia]} (${ddR}/${moR})`;

      if (!lembreteCanal.has(channel.id) && secUntil >= 1170 && secUntil <= 1230) {
        lembreteCanal.add(channel.id);
        const embed = new EmbedBuilder()
          .setTitle('⏰ Lembrete de Atendimento')
          .setDescription(mensagens.lembrete)
          .setColor(0xfee75c)
          .addFields(
            { name: 'Dia', value: diaLabel, inline: true },
            { name: 'Horário', value: horaExibida, inline: true },
          );
        await channel.send({ embeds: [embed] }).catch(() => {});
      }

      if (!lembreteDM.has(channel.id) && secUntil >= 570 && secUntil <= 630) {
        lembreteDM.add(channel.id);
        let userId = agendadoPorUsuario.get(channel.id);
        if (!userId) {
          try {
            const msgs = await channel.messages.fetch({ limit: 100 });
            const topicMatch = channel.topic?.match(/creatorId\s*=\s*(\d{17,19})/i);
            if (topicMatch) userId = topicMatch[1];
            if (!userId) {
              const found = msgs.find((m) => !m.author.bot && m.content?.includes('abriu um ticket'));
              if (found) {
                const match = found.content.match(/<@!?([0-9]+)>/);
                if (match) userId = match[1];
              }
            }
          } catch {}
        }
        if (userId) {
          try {
            const user = await client.users.fetch(userId);
            const dmEmbed = new EmbedBuilder()
              .setTitle('⏰ Lembrete de Atendimento')
              .setDescription(mensagens.dm_lembrete)
              .setColor(0xfee75c)
              .addFields(
                { name: 'Dia', value: diaLabel, inline: true },
                { name: 'Horário', value: horaExibida, inline: true },
              );
            await user.send({ embeds: [dmEmbed] });
          } catch {}
        }
      }
    }
  }
}

// ============================================================
// BUILDERS
// ============================================================
export function buildDiaEmbed(slots) {
  const mensagens = getMensagens();
  return new EmbedBuilder()
    .setTitle('📅 Agendar Atendimento do Ticket')
    .setDescription(
      isProximaSemana()
        ? 'Não há mais vagas esta semana. Selecione o **dia** da **próxima semana**:'
        : 'Selecione o **dia** desejado para seu atendimento:',
    )
    .setColor(0x5865f2)
    .addFields(
      ...Object.entries(slots).map(([dia, horarios]) => ({
        name: labelDia(dia),
        value: horarios.map((h) => `\`${h}\``).join('  '),
        inline: false,
      })),
    );
}

export function buildHorariosEmbed(dia, horarios) {
  const horariosFormatados = horarios.map((h, i) => `${i + 1}. \`${h}\``).join('\n');
  return new EmbedBuilder()
    .setTitle(`🕐 Horários — ${labelDia(dia)}`)
    .setDescription(`Selecione o horário:\n\n${horariosFormatados}`)
    .setColor(0x5865f2);
}

export function buildConfirmarEmbed(dia, hora, novoNome) {
  return new EmbedBuilder()
    .setTitle('Confirmar Agendamento')
    .setColor(0xffa500)
    .addFields(
      { name: 'Dia', value: labelDia(dia), inline: true },
      { name: 'Horário', value: hora, inline: true },
      { name: 'Novo canal', value: `\`#${novoNome}\``, inline: false },
    )
    .setFooter({ text: 'Confirme ou cancele abaixo.' });
}

export function buildDiaRows(slots) {
  const buttons = Object.keys(slots).map((dia) =>
    new ButtonBuilder()
      .setCustomId(`ag_dia_${dia}`)
      .setLabel(labelDia(dia))
      .setStyle(ButtonStyle.Primary),
  );
  buttons.push(
    new ButtonBuilder().setCustomId('ag_cancelar').setLabel('Cancelar').setStyle(ButtonStyle.Danger),
  );
  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
  }
  return rows;
}

export function buildHorariosRows(horarios) {
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

export function buildConfirmarRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ag_confirmar').setLabel('✅ Confirmar').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('ag_back_hora').setLabel('← Voltar').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ag_cancelar').setLabel('❌ Cancelar').setStyle(ButtonStyle.Danger),
    ),
  ];
}

// ============================================================
// CONFIRMAR AGENDAMENTO (lógica central)
// ============================================================
export async function executarConfirmacao(interaction, state) {
  const slotKey = `${state.dia}_${fmtTime(state.hora)}`;

  if (confirmandoSlot.has(slotKey)) {
    return interaction.update({
      content: '⏳ Outro ticket está confirmando este horário. Aguarde e tente novamente com `agendamento`.',
      embeds: [],
      components: [],
    });
  }
  confirmandoSlot.add(slotKey);

  await interaction.deferUpdate();

  try {
    const slots = slotsDisponiveis(interaction.guild);
    const horarios = slots[state.dia] || [];
    if (!horarios.includes(state.hora)) {
      pendente.delete(interaction.user.id);
      return interaction.editReply({
        content: '❌ Este horário não está mais disponível. Use `agendamento` para reiniciar.',
        embeds: [],
        components: [],
      });
    }

    const nome = nomeDoCanal(interaction.channel.name);
    const novoNome = `seg-${state.dia}-${fmtTime(state.hora)}-${nome}`;

    const categoryAgendadosId = config.agendamento?.categoryAgendadosId || '1378778111856087130';
    const categoryPadraoId = config.categoryId || '1378778140528087191';

    if (!categoriaAgendadosTemEspaco(interaction.guild)) {
      pendente.delete(interaction.user.id);
      return interaction.editReply({
        content: `${interaction.user} ${getMensagens().categoria_cheia}`,
        embeds: [],
        components: [],
      });
    }

    await interaction.channel.edit({
      name: novoNome,
      parent: categoryAgendadosId,
    });

    pendente.delete(interaction.user.id);
    agendadoPorUsuario.set(interaction.channel.id, interaction.user.id);

    const embed = new EmbedBuilder()
      .setTitle('✅ Atendimento Agendado!')
      .setColor(0x57f287)
      .addFields(
        { name: 'Dia', value: labelDia(state.dia), inline: true },
        { name: 'Horário', value: state.hora, inline: true },
        { name: 'Canal', value: `\`#${novoNome}\``, inline: false },
      );

    return interaction.editReply({ content: '', embeds: [embed], components: [] });
  } catch (err) {
    pendente.delete(interaction.user.id);
    return interaction.editReply({
      content: '❌ O bot não tem permissão para renomear/mover este canal.',
      embeds: [],
      components: [],
    });
  } finally {
    confirmandoSlot.delete(slotKey);
  }
}
