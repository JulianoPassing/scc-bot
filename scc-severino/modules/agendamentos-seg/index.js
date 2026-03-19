/**
 * Bot de Agendamento de Entrevistas - StreetCarClub
 * --------------------------------------------------
 * Comandos (apenas via texto no canal):
 *   agendamento  → (role ROLE_AGENDAMENTO_ID) abre o fluxo de agendamento
 *   reagendar    → (role ROLE_REAGENDAR_ID)   reverte o canal para prefixo-nome
 *
 * Formato dos canais:
 *   Aguardando:  seg-nomedele
 *   Agendado:    seg-ter-10h00-nomedele
 */

require('dotenv').config();

// Captura erros não tratados e envia para o canal de config
async function logDiscord(msg) {
  try {
    const ch = client?.channels?.cache?.get(CONFIG_CHANNEL_ID);
    if (ch?.isTextBased()) await ch.send(`\`\`\`\n${msg}\n\`\`\``);
  } catch {}
  console.error(msg);
}

process.on('unhandledRejection', (err) => logDiscord(`❌ unhandledRejection: ${err?.stack ?? err}`));
process.on('uncaughtException',  (err) => logDiscord(`❌ uncaughtException: ${err?.stack ?? err}`));

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
} = require('discord.js');

// ============================================================
// CONFIGURAÇÃO (via .env)
// ============================================================
const TOKEN                  = process.env.DISCORD_TOKEN;
const ROLE_AGENDAMENTO_ID    = process.env.ROLE_AGENDAMENTO_ID;
const ROLE_REAGENDAR_ID      = process.env.ROLE_REAGENDAR_ID;
const CATEGORIA_AGENDADOS_ID = process.env.CATEGORIA_AGENDADOS_ID;

// ============================================================
// CONFIG DINÂMICA — canal Discord como banco de dados
// Para atualizar: poste uma nova mensagem JSON neste canal.
// ============================================================
const CONFIG_CHANNEL_ID = '1483578658391326962';

// Valores padrão usados quando o canal de config não estiver acessível
// ou não contiver um JSON válido.
const DEFAULT_CONFIG = {
  agenda: {
    seg: { '10:00': 2, '12:00': 2, '13:00': 2, '17:00': 2, '18:00': 4, '19:00': 4, '20:00': 4, '21:00': 4 },
    ter: { '10:00': 2, '12:00': 2, '13:00': 2, '17:00': 2, '18:00': 2, '19:00': 4, '20:00': 4, '21:00': 4 },
    qua: { '10:00': 2, '12:00': 2, '13:00': 2, '17:00': 2, '18:00': 2, '19:00': 2, '20:00': 2 },
    // qui: sem atendimentos — não incluído
    sex: { '17:00': 2, '18:00': 2, '19:00': 4, '20:00': 4, '21:00': 4 },
  },
  mensagens: {
    lembrete:     'No horário agendado é só entrar na call https://discord.com/channels/1046404063287332936/1378780085091565678.\n\nAssim que a gente tiver disponível a gente te puxa. Como o atendimento é a cada hora, então vc pode ser atendido nesse intervalo. Exemplo: Se seu horário é as 19 horas, vc será atendido entre 19:00 até 19:59.\n\nPode ser q n seja atendido exatamente no horário agendado pois podemos estar em outro atendimento.\n\nÉ só aguardar na call que iremos atender assim que puder.',
    dm_lembrete:  'Faltam 10 minutos para a sua entrevista! No horário agendado é só entrar na call https://discord.com/channels/1046404063287332936/1378780085091565678 e aguardar que iremos te atender assim que puder.',
    ja_agendado:  '❌ Este canal já possui um agendamento ativo.\nEntre em contato com um Staff nesse mesmo chat solicitando o Reagendamento.',
    sem_vagas:    '❌ Não há dias ou horários disponíveis para esta semana. Tente agendar na sexta-feira ou fim de semana. Para ser atendido na próxima semana.',
    boas_vindas:  'Olá! Para agendar sua entrevista escreva `agendamento` aqui.',
  },
};

// Config ativa em memória — null = usar DEFAULT_CONFIG
let cachedConfig = null;

/** Retorna a config ativa (canal) ou os valores padrão. */
function getConfig() {
  return cachedConfig ?? DEFAULT_CONFIG;
}

/** Tenta extrair um objeto JSON do conteúdo de uma mensagem Discord
 *  (aceita JSON puro ou bloco de código ```json ... ```). */
function extractJSON(content) {
  try { return JSON.parse(content); } catch {}
  const m = content.match(/```(?:json)?\s*\n?([\s\S]+?)\n?```/);
  if (m) { try { return JSON.parse(m[1]); } catch {} }
  return null;
}

/** Carrega/recarrega a config a partir do canal CONFIG_CHANNEL_ID.
 *  Lê as últimas 50 mensagens e usa a mais recente com JSON válido. */
async function loadConfig() {
  try {
    const ch = await client.channels.fetch(CONFIG_CHANNEL_ID);
    if (!ch?.isTextBased()) {
      console.warn('⚠️  Canal de config inválido — usando padrões.');
      return;
    }

    const msgs = await ch.messages.fetch({ limit: 50 });
    for (const [, msg] of msgs) {
      const parsed = extractJSON(msg.content);
      if (!parsed || typeof parsed !== 'object') continue;
      if (!parsed.agenda && !parsed.mensagens) continue;

      // Merge parcial: campos ausentes herdam o DEFAULT_CONFIG
      cachedConfig = {
        agenda:    { ...DEFAULT_CONFIG.agenda,    ...(parsed.agenda    ?? {}) },
        mensagens: { ...DEFAULT_CONFIG.mensagens, ...(parsed.mensagens ?? {}) },
      };
      console.log(`✅ Config carregada do canal (msg ${msg.id}).`);
      return;
    }

    console.warn('⚠️  Nenhuma config válida no canal — usando padrões.');
    cachedConfig = null;
  } catch (e) {
    console.error('❌ Erro ao carregar config:', e.message);
    cachedConfig = null;
  }
}

// ============================================================
// CONSTANTES
// ============================================================
// Número do dia da semana no nosso sistema (0=seg … 4=sex)
// qui nunca exibido — sem atendimentos às quintas-feiras
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

// Lock de confirmação: Set de slotKeys ('ter_10h00') atualmente sendo confirmados.
// Garante que dois usuários não reservem a última vaga do mesmo slot simultaneamente.
// Como JS é single-thread, add/has são atômicos entre si (sem await no meio).
const confirmandoSlot = new Set();

// IDs dos canais que já receberam o lembrete de 10 minutos nesta sessão.
// Evita enviar a mensagem mais de uma vez caso o intervalo dispare no mesmo janela.
const lembreteEnviado = new Set();

// Mapeamento de channelId → userId para envio de DM no lembrete.
// Preenchido quando o candidato confirma o agendamento nesta sessão.
// Para canais agendados antes do bot iniciar, usa fallback via histórico do canal.
const agendadoPorUsuario = new Map();

// IDs dos canais que já receberam (ou foram verificados para) a mensagem de boas-vindas.
const boasVindasEnviado = new Set();

// ============================================================
// HELPERS
// ============================================================
const fmtTime = (t) => t.replace(':', 'h'); // '10:00' → '10h00'

const isAgendado = (name) => RE_AGENDADO.test(name);

// Retorna true se o canal está no formato de espera (prefixo-nome, sem agendamento).
const isCanalEspera = (name) => name.includes('-') && !isAgendado(name);

function parseAgendado(name) {
  const m = name.match(RE_AGENDADO);
  return m ? { prefixo: m[1], dia: m[2], hora: m[3], nome: m[4] } : null;
}

/**
 * Retorna true quando não há mais dias a agendar nesta semana
 * (sexta-feira, sábado ou domingo), indicando que devemos exibir a próxima semana.
 */
function isProximaSemana() {
  const jsDay   = new Date().getDay();
  const hojeNum = jsDay === 0 ? 6 : jsDay - 1;
  return !Object.values(DIAS).some((n) => n > hojeNum);
}

function diasDisponiveis() {
  // JS: getDay() retorna 0=Dom, 1=Seg … 6=Sab
  // Convertemos para 0=Seg … 6=Dom para comparar com os valores de DIAS
  const jsDay   = new Date().getDay();
  const hojeNum = jsDay === 0 ? 6 : jsDay - 1;

  // Dias ainda disponíveis nesta semana (estritamente futuros — hoje excluído)
  const diasAtual = Object.entries(DIAS)
    .filter(([, n]) => n > hojeNum)
    .map(([d]) => d);

  // Se ainda há dias nesta semana, retorna-os.
  // Sexta/sábado/domingo → sem dias restantes → retorna todos os dias da próxima semana.
  return diasAtual.length ? diasAtual : Object.keys(DIAS);
}

function slotsOcupados(guild) {
  const ocupados = {};

  // Varre TODOS os canais do servidor — canais agendados podem estar
  // em mais de uma categoria, então não limitamos a CATEGORIA_AGENDADOS_ID.
  for (const [, ch] of guild.channels.cache) {
    const m = ch.name.match(RE_AGENDADO);
    if (m) {
      const key = `${m[2]}_${m[3]}`; // ex: 'ter_10h00'
      ocupados[key] = (ocupados[key] || 0) + 1;
    }
  }
  return ocupados;
}

function slotsDisponiveis(guild) {
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

const nomeDoCanel   = (name) => name.split('-').pop();
const prefixoDoCanal = (name) => name.split('-')[0];

// Envia mensagem temporária que se apaga após `ms` milissegundos
async function sendTemp(channel, content, ms = 15_000) {
  const msg = await channel.send({ content });
  setTimeout(() => msg.delete().catch(() => {}), ms);
}

/**
 * Varre os canais existentes do servidor e envia a mensagem de boas-vindas
 * nos que estão no formato de espera e ainda não tiveram interação de player
 * com a role ROLE_REAGENDAR_ID. Executado uma vez na inicialização.
 */
async function scanBoasVindas() {
  let enviados = 0;
  for (const [, guild] of client.guilds.cache) {
    for (const [, ch] of guild.channels.cache) {
      if (!ch.isTextBased() || !isCanalEspera(ch.name)) continue;
      if (boasVindasEnviado.has(ch.id)) continue;
      boasVindasEnviado.add(ch.id); // marca antes do await para evitar duplicata
      try {
        const msgs = await ch.messages.fetch({ limit: 50 });
        // Se algum player com a role já interagiu, não envia
        const temInteracao = msgs.some((m) =>
          m.member?.roles.cache.has(ROLE_REAGENDAR_ID),
        );
        if (!temInteracao) {
          await ch.send(getConfig().mensagens.boas_vindas).catch(() => {});
          enviados++;
        }
      } catch {} // sem permissão de leitura no canal — ignora
    }
  }
  console.log(`   👋 Scan de boas-vindas: ${enviados} mensagem(ns) enviada(s).`);
}

// ============================================================
// LEMBRETE DE 10 MINUTOS
// ============================================================

// Mapeamento de abreviação → número do dia JS (0=Dom, 1=Seg … 6=Sab)
const DIA_PARA_JS = { seg: 1, ter: 2, qua: 3, sex: 5 };

/**
 * Retorna o rótulo de exibição de um dia:
 *   - Semana atual  → "Terça-feira"
 *   - Próxima semana → "Terça-feira (17/03)"
 */
function labelDia(dia) {
  if (!isProximaSemana()) return DIAS_PT[dia];

  // Calcula a data da próxima ocorrência do dia (sempre semana que vem)
  const targetJSDay = DIA_PARA_JS[dia];
  const now = new Date();
  let diff = targetJSDay - now.getDay();
  if (diff <= 0) diff += 7; // garante que seja a próxima semana (inclui diff=0 = hoje)

  const date = new Date(now);
  date.setDate(now.getDate() + diff);
  const dd = String(date.getDate()).padStart(2, '0');
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  return `${DIAS_PT[dia]} (${dd}/${mo})`;
}

/**
 * Dado o dia abreviado ('ter') e o horário formatado ('10h00'),
 * retorna o objeto Date da próxima ocorrência desse horário.
 * Se o horário já passou hoje, retorna null.
 */
function getAppointmentDate(dia, horaFmt) {
  const targetJSDay = DIA_PARA_JS[dia];
  if (targetJSDay === undefined) return null;

  const [hh, mm] = horaFmt.split('h').map(Number);

  const now  = new Date();
  let diff   = targetJSDay - now.getDay();
  // Se o dia já passou esta semana, aponta para a próxima ocorrência
  if (diff < 0) diff += 7;

  const target = new Date(now);
  target.setDate(now.getDate() + diff);
  target.setHours(hh, mm, 0, 0);

  // Se a data alvo já passou (ex: hoje mesmo mas hora passada), não há lembrete
  return target > now ? target : null;
}

/**
 * Varre todos os canais do servidor e envia
 * um lembrete nos canais cuja entrevista ocorrerá em ~10 minutos.
 *
 * Janela de disparo: entre 9 min 30s e 10 min 30s antes (570–630 s),
 * checando a cada 30s — garante que o intervalo sempre capture a janela.
 */
async function checkReminders() {
  for (const [, guild] of client.guilds.cache) {
    // Varre TODOS os canais do servidor — canais agendados podem estar
    // em mais de uma categoria, então não limitamos a CATEGORIA_AGENDADOS_ID.
    for (const [, channel] of guild.channels.cache) {
      if (!channel.isTextBased())      continue;
      if (lembreteEnviado.has(channel.id)) continue;

      const parsed = parseAgendado(channel.name);
      if (!parsed) continue;

      const appointmentDate = getAppointmentDate(parsed.dia, parsed.hora);
      if (!appointmentDate) continue;

      const secUntil = (appointmentDate - Date.now()) / 1000;

      // Janela: 9 min 30s → 10 min 30s
      if (secUntil < 1170 || secUntil > 1230) continue;

      // Marca antes de qualquer await para evitar disparo duplo
      lembreteEnviado.add(channel.id);

      const horaExibida = parsed.hora.replace('h', ':');

      // Formata a data exata do agendamento para exibir no lembrete
      const ddR = String(appointmentDate.getDate()).padStart(2, '0');
      const moR = String(appointmentDate.getMonth() + 1).padStart(2, '0');
      const diaLabel = `${DIAS_PT[parsed.dia]} (${ddR}/${moR})`;

      const embed = new EmbedBuilder()
        .setTitle('⏰ Lembrete')
        .setDescription(getConfig().mensagens.lembrete)
        .setColor(0xfee75c)
        .addFields(
          { name: 'Dia',     value: diaLabel,    inline: true },
          { name: 'Horário', value: horaExibida, inline: true },
        );

      await channel.send({ embeds: [embed] }).catch(() => {});

      // ----- DM para o candidato -----
      // 1) Tenta usar o mapa preenchido em ag_confirmar (sessão atual)
      // 2) Fallback: varre o histórico do canal em busca do membro com ROLE_AGENDAMENTO_ID
      let userId = agendadoPorUsuario.get(channel.id);

      if (!userId) {
        try {
          const msgs = await channel.messages.fetch({ limit: 100 });
          const found = msgs.find(
            (m) => !m.author.bot && m.member?.roles.cache.has(ROLE_AGENDAMENTO_ID),
          );
          if (found) userId = found.author.id;
        } catch {} // sem permissão de leitura — ignora
      }

      if (userId) {
        try {
          const user = await client.users.fetch(userId);
          const dmEmbed = new EmbedBuilder()
            .setTitle('⏰ Lembrete de Entrevista')
            .setDescription(getConfig().mensagens.dm_lembrete)
            .setColor(0xfee75c)
            .addFields(
              { name: 'Dia',     value: diaLabel,    inline: true },
              { name: 'Horário', value: horaExibida, inline: true },
            );
          await user.send({ embeds: [dmEmbed] });
        } catch {} // DMs desativados ou usuário não encontrado — ignora
      }
    }
  }
}

// ============================================================
// BUILDERS DE COMPONENTES E EMBEDS
// ============================================================
function buildDiaEmbed(slots) {
  const embed = new EmbedBuilder()
    .setTitle('📅 Agendar Entrevista')
    .setDescription(
      isProximaSemana()
        ? 'Não há mais vagas esta semana. Selecione o **dia** desejado da **próxima semana**:'
        : 'Selecione o **dia** desejado para sua entrevista:',
    )
    .setColor(0x5865f2);

  for (const [dia, horarios] of Object.entries(slots)) {
    embed.addFields({
      name: labelDia(dia),
      value: horarios.map((h) => `\`${h}\``).join('  '),
      inline: false,
    });
  }
  return embed;
}

function buildHorariosEmbed(dia, horarios) {
  const horariosFormatados = horarios
    .map((h, i) => `${i + 1}. \`${h}\``).join("\n");
  return new EmbedBuilder()
    .setTitle(`🕐 Horários — ${labelDia(dia)}`)
    .setDescription(`Selecione o horário desejado:\n\n${horariosFormatados}`)
    .setColor(0x5865f2);
}

function buildConfirmarEmbed(dia, hora, novoNome) {
  return new EmbedBuilder()
    .setTitle('Confirmar Agendamento')
    .setColor(0xffa500)
    .addFields(
      { name: 'Dia',       value: labelDia(dia), inline: true },
      { name: 'Horário',   value: hora,          inline: true },
      { name: 'Novo canal', value: `\`#${novoNome}\``, inline: false },
    )
    .setFooter({ text: 'Confirme ou cancele o agendamento abaixo.' });
}

function buildDiaRows(slots) {
  const buttons = Object.keys(slots).map((dia) =>
    new ButtonBuilder()
      .setCustomId(`ag_dia_${dia}`)
      .setLabel(labelDia(dia))
      .setStyle(ButtonStyle.Primary),
  );
  buttons.push(
    new ButtonBuilder()
      .setCustomId('ag_cancelar')
      .setLabel('Cancelar')
      .setStyle(ButtonStyle.Danger),
  );

  // Máximo de 5 botões por row
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
// CLIENT
// ============================================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once('ready', async () => {
  console.log(`✅ Bot online: ${client.user.tag} (ID: ${client.user.id})`);
  console.log(`   Servidores: ${client.guilds.cache.map((g) => g.name).join(', ')}`);

  // Avisa no canal de config que o bot iniciou
  try {
    const configCh = await client.channels.fetch(CONFIG_CHANNEL_ID);
    if (configCh?.isTextBased()) {
      await configCh.send(`🟢 Bot online — ${new Date().toLocaleString('pt-BR')}`)
        .catch(() => {});
    }
  } catch {}

  // Carrega config e depois faz scan de boas-vindas nos canais existentes
  loadConfig()
    .then(() => {
      console.log('   📋 Config inicial carregada.');
      return scanBoasVindas();
    })
    .catch(console.error);

  // Verifica lembretes a cada 30 segundos
  setInterval(() => { checkReminders().catch(console.error); }, 30_000);
  console.log('   ⏰ Verificação de lembretes iniciada (intervalo: 30s)');
});

// ============================================================
// MENSAGENS DE TEXTO
// ============================================================
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // ----------------------------------------------------------
  // CANAL DE CONFIG — recarrega config e valida o JSON postado
  // ----------------------------------------------------------
  if (message.channelId === CONFIG_CHANNEL_ID) {
    const parsed = extractJSON(message.content);
    if (parsed && typeof parsed === 'object' && (parsed.agenda || parsed.mensagens)) {
      cachedConfig = {
        agenda:    { ...DEFAULT_CONFIG.agenda,    ...(parsed.agenda    ?? {}) },
        mensagens: { ...DEFAULT_CONFIG.mensagens, ...(parsed.mensagens ?? {}) },
      };
      console.log(`✅ Config atualizada via canal (msg ${message.id}).`);
      await message.reply('✅ Config atualizada!').catch(() => {});
    } else {
      console.warn('⚠️  Mensagem no canal de config ignorada (JSON inválido ou fora do formato).');
      await message.reply('❌ JSON inválido ou fora do formato esperado.').catch(() => {});
    }
    return;
  }

  const cmd     = message.content.trim().toLowerCase();
  const channel = message.channel;
  const member  = message.member;
  const guild   = message.guild;

  // ----------------------------------------------------------
  // STATUS — diagnóstico rápido via Discord
  // ----------------------------------------------------------
  if (cmd === '!status' && message.channelId === CONFIG_CHANNEL_ID) {
    const uptime  = Math.floor(process.uptime());
    const config  = cachedConfig ? '✅ custom' : '⚠️ padrão';
    const guilds  = client.guilds.cache.size;
    const pending = pendente.size;
    await message.reply(
      `**Bot status**\n` +
      `⏱ Uptime: ${uptime}s\n` +
      `📋 Config: ${config}\n` +
      `🏠 Servidores: ${guilds}\n` +
      `⏳ Agendamentos pendentes: ${pending}\n` +
      `🔁 Lembretes enviados: ${lembreteEnviado.size}`,
    ).catch(() => {});
    return;
  }

  // ----------------------------------------------------------
  // AGENDAMENTO
  // ----------------------------------------------------------
  if (cmd === 'agendamento') {
    if (!member.roles.cache.has(ROLE_AGENDAMENTO_ID)) {
      try { await message.delete(); } catch { /* sem permissão para deletar */ }
      return;
    }

    if (isAgendado(channel.name)) {
      try { await message.delete(); } catch {}
      await sendTemp(
        channel,
        `${member} ${getConfig().mensagens.ja_agendado}`,
        15_000,
      );
      return;
    }

    try { await message.delete(); } catch {}

    const slots = slotsDisponiveis(guild);
    if (!Object.keys(slots).length) {
      await sendTemp(channel, `${member} ${getConfig().mensagens.sem_vagas}`, 15_000);
      return;
    }

    const prefixo = prefixoDoCanal(channel.name);
    const nome    = nomeDoCanel(channel.name);

    pendente.set(member.id, { channelId: channel.id, prefixo, nome, dia: null, hora: null });

    await channel.send({
      content: `${member}`,
      embeds: [buildDiaEmbed(slots)],
      components: buildDiaRows(slots),
    });
  }

  // ----------------------------------------------------------
  // REAGENDAR
  // ----------------------------------------------------------
  else if (cmd === 'reagendar') {
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

// ============================================================
// INTERAÇÕES (botões e select menu)
// ============================================================
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

  const uid   = interaction.user.id;
  const state = pendente.get(uid);

  // Verifica se a interação pertence ao usuário que iniciou o agendamento neste canal
  const isOwner = state && state.channelId === interaction.channelId;

  // ----------------------------------------------------------
  // Botão: seleção de dia
  // ----------------------------------------------------------
  if (interaction.isButton() && interaction.customId.startsWith('ag_dia_')) {
    if (!isOwner) {
      return interaction.reply({ content: 'Apenas o solicitante pode usar este menu.', ephemeral: true });
    }

    const dia    = interaction.customId.replace('ag_dia_', '');
    const slots  = slotsDisponiveis(interaction.guild);
    const horarios = slots[dia];

    if (!horarios?.length) {
      return interaction.update({ content: '❌ Não há mais horários disponíveis para este dia.\nRetorne para a seleção de dia e escolha outro.', embeds: [], components: [] });
    }

    state.dia = dia;
    pendente.set(uid, state);

    return interaction.update({
      embeds: [buildHorariosEmbed(dia, horarios)],
      components: buildHorariosRows(horarios),
    });
  }

  // ----------------------------------------------------------
  // Select menu: seleção de horário
  // ----------------------------------------------------------
  if (interaction.isStringSelectMenu() && interaction.customId === 'ag_hora') {
    if (!isOwner) {
      return interaction.reply({ content: 'Apenas o solicitante pode usar este menu.', ephemeral: true });
    }

    const hora     = interaction.values[0];
    const novoNome = `${state.prefixo}-${state.dia}-${fmtTime(hora)}-${state.nome}`;

    state.hora = hora;
    pendente.set(uid, state);

    return interaction.update({
      embeds: [buildConfirmarEmbed(state.dia, hora, novoNome)],
      components: buildConfirmarRows(),
    });
  }

  // ----------------------------------------------------------
  // Botão: voltar para seleção de dia
  // ----------------------------------------------------------
  if (interaction.isButton() && interaction.customId === 'ag_back_dia') {
    if (!isOwner) {
      return interaction.reply({ content: 'Apenas o solicitante pode usar este botão.', ephemeral: true });
    }

    const slots = slotsDisponiveis(interaction.guild);
    if (!Object.keys(slots).length) {
      return interaction.update({ content: 'Sem horários disponíveis.', embeds: [], components: [] });
    }

    state.dia  = null;
    state.hora = null;
    pendente.set(uid, state);

    return interaction.update({
      embeds: [buildDiaEmbed(slots)],
      components: buildDiaRows(slots),
    });
  }

  // ----------------------------------------------------------
  // Botão: voltar para seleção de horário
  // ----------------------------------------------------------
  if (interaction.isButton() && interaction.customId === 'ag_back_hora') {
    if (!isOwner) {
      return interaction.reply({ content: 'Apenas o solicitante pode usar este botão.', ephemeral: true });
    }

    const slots    = slotsDisponiveis(interaction.guild);
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

  // ----------------------------------------------------------
  // Botão: confirmar agendamento
  // ----------------------------------------------------------
  if (interaction.isButton() && interaction.customId === 'ag_confirmar') {
    if (!isOwner) {
      return interaction.reply({ content: 'Apenas o solicitante pode confirmar.', ephemeral: true });
    }

    // Guarda defensiva: dia/hora devem estar preenchidos antes de chegar aqui.
    // Protege contra cliques em botões de mensagens antigas (ex: após reagendar).
    if (!state.dia || !state.hora) {
      return interaction.update({
        content: '❌ Sessão expirada. Use `agendamento` para reiniciar.',
        embeds: [],
        components: [],
      });
    }

    const slotKey = `${state.dia}_${fmtTime(state.hora)}`;

    // --- LOCK atômico ---
    // Se outro usuário já está confirmando este mesmo slot, bloqueia imediatamente.
    // Esta verificação + add é síncrona (sem await), portanto segura contra race conditions.
    if (confirmandoSlot.has(slotKey)) {
      return interaction.update({
        content: '⏳ Outro candidato está confirmando este horário agora. Aguarde um momento e tente novamente com `agendamento`.',
        embeds: [],
        components: [],
      });
    }
    confirmandoSlot.add(slotKey);
    // --- fim do lock síncrono ---

    // Sinaliza ao Discord que a resposta pode demorar mais que 3 s.
    // Necessário porque o Discord aplica rate-limit em renomeações de canal
    // (2 por 10 min), e o discord.js aguarda esse limite em fila antes de prosseguir.
    // deferUpdate() estende o prazo de resposta de 3 s para 15 min,
    // permitindo que editReply() atualize a mensagem após a renomeação.
    await interaction.deferUpdate();

    try {
      // Verificação final (feita DENTRO do lock): slot ainda tem vaga?
      const slots    = slotsDisponiveis(interaction.guild);
      const horarios = slots[state.dia] || [];

      if (!horarios.includes(state.hora)) {
        pendente.delete(uid);
        return interaction.editReply({
          content: '❌ Este horário não está mais disponível. Reinicie com `agendamento`.',
          embeds: [],
          components: [],
        });
      }

      const novoNome = `${state.prefixo}-${state.dia}-${fmtTime(state.hora)}-${state.nome}`;
      const cat      = interaction.guild.channels.cache.get(CATEGORIA_AGENDADOS_ID);

      // Pode aguardar aqui se o rate-limit estiver ativo — deferUpdate() garante que há tempo.
      await interaction.channel.edit({ name: novoNome, parent: cat ?? CATEGORIA_AGENDADOS_ID });
      pendente.delete(uid);

      // Registra o usuário dono do agendamento para envio de DM no lembrete de 10 min
      agendadoPorUsuario.set(interaction.channel.id, uid);

      const embed = new EmbedBuilder()
        .setTitle('✅ Entrevista Agendada!')
        .setColor(0x57f287)
        .addFields(
          { name: 'Dia',     value: labelDia(state.dia), inline: true },
          { name: 'Horário', value: state.hora,          inline: true },
          { name: 'Canal',   value: `\`#${novoNome}\``,  inline: false },
        );

      return interaction.editReply({ content: '', embeds: [embed], components: [] });
    } catch {
      pendente.delete(uid);
      return interaction.editReply({
        content: '❌ O bot não tem permissão para renomear/mover este canal.',
        embeds: [],
        components: [],
      });
    } finally {
      // Sempre libera o lock, mesmo em caso de erro
      confirmandoSlot.delete(slotKey);
    }
  }

  // ----------------------------------------------------------
  // Botão: cancelar
  // ----------------------------------------------------------
  if (interaction.isButton() && interaction.customId === 'ag_cancelar') {
    if (!isOwner) {
      return interaction.reply({ content: 'Apenas o solicitante pode cancelar.', ephemeral: true });
    }
    pendente.delete(uid);
    return interaction.update({ content: 'Agendamento cancelado.', embeds: [], components: [] });
  }
});

// ============================================================
// NOVO CANAL — boas-vindas automáticas
// ============================================================
client.on('channelCreate', async (channel) => {
  if (!channel.isTextBased() || !isCanalEspera(channel.name)) return;
  if (boasVindasEnviado.has(channel.id)) return;
  boasVindasEnviado.add(channel.id);
  await channel.send(getConfig().mensagens.boas_vindas).catch(() => {});
});

// ============================================================
// INICIAR
// ============================================================
if (!TOKEN) {
  console.error('❌ DISCORD_TOKEN não configurado. Crie um arquivo .env com as variáveis necessárias.');
  process.exit(1);
}

client.login(TOKEN);
