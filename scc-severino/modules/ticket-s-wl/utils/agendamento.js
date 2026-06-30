/**
 * Bot de Agendamento de Entrevistas - StreetCarClub
 * Integrado ao ticket-s-wl (tickets de segurança seg-*)
 *
 * Comandos (texto no canal do ticket):
 *   agendamento  → (criador do ticket ou roleAgendamentoId) abre o fluxo
 *   reagendar    → (roleReagendarId ou staff) reverte para prefixo-nome
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

const CONFIG_CHANNEL_ID = config.agendamento?.configChannelId || '1483578658391326962';
const CATEGORIA_AGENDADOS_ID = config.agendamento?.categoryAgendadosId || '1378778111856087130';
const ROLE_AGENDAMENTO_ID = config.agendamento?.roleAgendamentoId || null;
const ROLE_REAGENDAR_ID = config.agendamento?.roleReagendarId || config.staffRoleId;
const MAX_CHANNELS_PER_CATEGORY = 50;

const INFO_DIAS = {
  seg: { num: 0, js: 1, pt: 'Segunda-feira' },
  ter: { num: 1, js: 2, pt: 'Terça-feira' },
  qua: { num: 2, js: 3, pt: 'Quarta-feira' },
  qui: { num: 3, js: 4, pt: 'Quinta-feira' },
  sex: { num: 4, js: 5, pt: 'Sexta-feira' },
  sab: { num: 5, js: 6, pt: 'Sábado' },
  dom: { num: 6, js: 0, pt: 'Domingo' },
};

// prefixo-dia-HHhMM-nome  ex: seg-ter-10h00-joao
const RE_AGENDADO = /^([a-z0-9]+)-([a-z]{3})-(\d{2}h\d{2})-(.+)$/;

export const pendente = new Map();
const confirmandoSlot = new Set();
export const lembreteCanal = new Set();
export const lembreteDM = new Set();
export const agendadoPorUsuario = new Map();

let cachedConfig = null;

const DEFAULT_AGENDA = {
  seg: { '10:00': 2, '12:00': 2, '13:00': 2, '17:00': 2, '18:00': 4, '19:00': 4, '20:00': 4, '21:00': 4 },
  ter: { '10:00': 2, '12:00': 2, '13:00': 2, '17:00': 2, '18:00': 2, '19:00': 4, '20:00': 4, '21:00': 4 },
  qua: { '10:00': 2, '12:00': 2, '13:00': 2, '17:00': 2, '18:00': 2, '19:00': 2, '20:00': 2 },
  sex: { '17:00': 2, '18:00': 2, '19:00': 4, '20:00': 4, '21:00': 4 },
};

const DEFAULT_MENSAGENS = {
  lembrete:
    'No horário agendado é só entrar na call https://discord.com/channels/1046404063287332936/1378780085091565678.\n\n' +
    'Assim que a gente tiver disponível a gente te puxa. Como o atendimento é a cada hora, então vc pode ser atendido nesse intervalo. Exemplo: Se seu horário é as 19 horas, vc será atendido entre 19:00 até 19:59.\n\n' +
    'Pode ser q n seja atendido exatamente no horário agendado pois podemos estar em outro atendimento.\n\n' +
    'É só aguardar na call que iremos atender assim que puder.',
  dm_lembrete:
    'Faltam 10 minutos para a sua entrevista! No horário agendado é só entrar na call https://discord.com/channels/1046404063287332936/1378780085091565678 e aguardar que iremos te atender assim que puder.',
  ja_agendado:
    '❌ Este canal já possui um agendamento ativo.\nEntre em contato com um Staff nesse mesmo chat solicitando o Reagendamento.',
  sem_vagas:
    '❌ Não há dias ou horários disponíveis para esta semana. Tente agendar na sexta-feira ou fim de semana. Para ser atendido na próxima semana.',
  categoria_cheia:
    '❌ A categoria de tickets agendados está cheia (máx. 50 canais). Tente novamente mais tarde.',
};

function getConfig() {
  const agenda = cachedConfig?.agenda
    ?? (config.agendamento?.agenda ? { ...DEFAULT_AGENDA, ...config.agendamento.agenda } : DEFAULT_AGENDA);
  const mensagens = cachedConfig?.mensagens
    ?? (config.agendamento?.mensagens ? { ...DEFAULT_MENSAGENS, ...config.agendamento.mensagens } : DEFAULT_MENSAGENS);
  return { agenda, mensagens };
}

function extractJSON(content) {
  try {
    return JSON.parse(content);
  } catch {}
  const m = content.match(/```(?:json)?\s*\n?([\s\S]+?)\n?```/);
  if (m) {
    try {
      return JSON.parse(m[1]);
    } catch {}
  }
  return null;
}

export async function loadConfig(client) {
  try {
    const ch = await client.channels.fetch(CONFIG_CHANNEL_ID);
    if (!ch?.isTextBased()) {
      console.warn('[agendamento] Canal de config inválido — usando padrões.');
      return;
    }

    const msgs = await ch.messages.fetch({ limit: 50 });
    for (const [, msg] of msgs) {
      const parsed = extractJSON(msg.content);
      if (!parsed || typeof parsed !== 'object') continue;
      if (!parsed.agenda && !parsed.mensagens) continue;

      cachedConfig = {
        agenda: { ...DEFAULT_AGENDA, ...(parsed.agenda ?? {}) },
        mensagens: { ...DEFAULT_MENSAGENS, ...(parsed.mensagens ?? {}) },
      };
      console.log(`[agendamento] Config carregada do canal (msg ${msg.id}).`);
      return;
    }

    console.warn('[agendamento] Nenhuma config válida no canal — usando padrões.');
    cachedConfig = null;
  } catch (e) {
    console.error('[agendamento] Erro ao carregar config:', e.message);
    cachedConfig = null;
  }
}

export function updateConfigFromMessage(content) {
  const parsed = extractJSON(content);
  if (!parsed || typeof parsed !== 'object') return false;
  if (!parsed.agenda && !parsed.mensagens) return false;

  cachedConfig = {
    agenda: { ...DEFAULT_AGENDA, ...(parsed.agenda ?? {}) },
    mensagens: { ...DEFAULT_MENSAGENS, ...(parsed.mensagens ?? {}) },
  };
  return true;
}

export function getCachedConfig() {
  return cachedConfig;
}

export function getConfigStatus() {
  return cachedConfig ? '✅ custom (canal)' : '⚠️ padrão (config.json)';
}

export function getMensagens() {
  return getConfig().mensagens;
}

export function getRoleAgendamentoId() {
  return ROLE_AGENDAMENTO_ID;
}

export function getRoleReagendarId() {
  return ROLE_REAGENDAR_ID;
}

export const fmtTime = (t) => t.replace(':', 'h');

export function isAgendado(name) {
  return RE_AGENDADO.test(name);
}

export function parseAgendado(name) {
  const m = name.match(RE_AGENDADO);
  return m ? { prefixo: m[1], dia: m[2], hora: m[3], nome: m[4] } : null;
}

export function nomeDoCanal(name) {
  if (isAgendado(name)) return parseAgendado(name).nome;
  const parts = name.split('-');
  return parts.length > 1 ? parts.slice(1).join('-') : name.replace(/^seg-/, '');
}

export function prefixoDoCanal(name) {
  if (isAgendado(name)) return parseAgendado(name).prefixo;
  return name.split('-')[0];
}

function getDiasAtivos() {
  const agenda = getConfig().agenda || {};
  return Object.keys(agenda).filter((dia) => INFO_DIAS[dia]);
}

function isProximaSemana() {
  const jsDay = new Date().getDay();
  const hojeNum = jsDay === 0 ? 6 : jsDay - 1;
  return !getDiasAtivos().some((dia) => INFO_DIAS[dia].num > hojeNum);
}

function diasDisponiveis() {
  const jsDay = new Date().getDay();
  const hojeNum = jsDay === 0 ? 6 : jsDay - 1;
  const diasAtivos = getDiasAtivos();
  const diasAtual = diasAtivos.filter((dia) => INFO_DIAS[dia].num > hojeNum);
  return diasAtual.length ? diasAtual : diasAtivos;
}

export function slotsOcupados(guild) {
  const ocupados = {};
  for (const [, ch] of guild.channels.cache) {
    const m = ch.name.match(RE_AGENDADO);
    if (m) {
      const key = `${m[2]}_${m[3]}`;
      ocupados[key] = (ocupados[key] || 0) + 1;
    }
  }
  return ocupados;
}

export function slotsDisponiveis(guild) {
  const ocupados = slotsOcupados(guild);
  const result = {};
  const agenda = getConfig().agenda;

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
  const info = INFO_DIAS[dia];
  if (!info) return dia;
  if (!isProximaSemana()) return info.pt;

  const targetJSDay = info.js;
  const now = new Date();
  let diff = targetJSDay - now.getDay();
  if (diff <= 0) diff += 7;

  const date = new Date(now);
  date.setDate(now.getDate() + diff);
  const dd = String(date.getDate()).padStart(2, '0');
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  return `${info.pt} (${dd}/${mo})`;
}

function getAppointmentDate(dia, horaFmt) {
  const info = INFO_DIAS[dia];
  if (!info) return null;
  const [hh, mm] = horaFmt.split('h').map(Number);
  const now = new Date();
  let diff = info.js - now.getDay();
  if (diff < 0) diff += 7;
  const target = new Date(now);
  target.setDate(now.getDate() + diff);
  target.setHours(hh, mm, 0, 0);
  return target > now ? target : null;
}

export function categoriaAgendadosTemEspaco(guild) {
  const category = guild.channels.cache.get(CATEGORIA_AGENDADOS_ID);
  if (!category || category.type !== 4) return false;
  const children = guild.channels.cache.filter((ch) => ch.parentId === CATEGORIA_AGENDADOS_ID);
  return children.size < MAX_CHANNELS_PER_CATEGORY;
}

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
      const diaLabel = `${INFO_DIAS[parsed.dia]?.pt || parsed.dia} (${ddR}/${moR})`;

      if (!lembreteCanal.has(channel.id) && secUntil >= 1170 && secUntil <= 1230) {
        lembreteCanal.add(channel.id);
        const embed = new EmbedBuilder()
          .setTitle('⏰ Lembrete')
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
          const topicMatch = channel.topic?.match(/creatorId\s*=\s*(\d{17,19})/i);
          if (topicMatch) userId = topicMatch[1];
        }

        if (!userId && ROLE_AGENDAMENTO_ID) {
          try {
            const msgs = await channel.messages.fetch({ limit: 100 });
            const found = msgs.find(
              (m) => !m.author.bot && m.member?.roles.cache.has(ROLE_AGENDAMENTO_ID),
            );
            if (found) userId = found.author.id;
          } catch {}
        }

        if (userId) {
          try {
            const user = await client.users.fetch(userId);
            const dmEmbed = new EmbedBuilder()
              .setTitle('⏰ Lembrete de Entrevista')
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

export function buildDiaEmbed(slots) {
  return new EmbedBuilder()
    .setTitle('📅 Agendar Entrevista')
    .setDescription(
      isProximaSemana()
        ? 'Não há mais vagas esta semana. Selecione o **dia** desejado da **próxima semana**:'
        : 'Selecione o **dia** desejado para sua entrevista:',
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
    .setDescription(`Selecione o horário desejado:\n\n${horariosFormatados}`)
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
    .setFooter({ text: 'Confirme ou cancele o agendamento abaixo.' });
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

export async function executarConfirmacao(interaction, state) {
  const slotKey = `${state.dia}_${fmtTime(state.hora)}`;

  if (confirmandoSlot.has(slotKey)) {
    return interaction.update({
      content: '⏳ Outro candidato está confirmando este horário agora. Aguarde um momento e tente novamente com `agendamento`.',
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
        content: '❌ Este horário não está mais disponível. Reinicie com `agendamento`.',
        embeds: [],
        components: [],
      });
    }

    if (!categoriaAgendadosTemEspaco(interaction.guild)) {
      pendente.delete(interaction.user.id);
      return interaction.editReply({
        content: `${interaction.user} ${getMensagens().categoria_cheia}`,
        embeds: [],
        components: [],
      });
    }

    const prefixo = state.prefixo || prefixoDoCanal(interaction.channel.name);
    const novoNome = `${prefixo}-${state.dia}-${fmtTime(state.hora)}-${state.nome}`;

    await interaction.channel.edit({
      name: novoNome,
      parent: CATEGORIA_AGENDADOS_ID,
    });

    pendente.delete(interaction.user.id);
    agendadoPorUsuario.set(interaction.channel.id, interaction.user.id);

    const embed = new EmbedBuilder()
      .setTitle('✅ Entrevista Agendada!')
      .setColor(0x57f287)
      .addFields(
        { name: 'Dia', value: labelDia(state.dia), inline: true },
        { name: 'Horário', value: state.hora, inline: true },
        { name: 'Canal', value: `\`#${novoNome}\``, inline: false },
      );

    return interaction.editReply({ content: '', embeds: [embed], components: [] });
  } catch {
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
