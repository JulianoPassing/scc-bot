import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, Events, Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// IDs e configs fixos do bot original
const CARGO_APROVADO = '1263487190575349892';
const CANAL_FORMULARIOS = '1392299124371751075';
const TENTATIVAS_MAXIMAS = 2;
const COOLDOWN_HORAS = 24;
const DATABASE_PATH = path.join(__dirname, 'whitelist.json');

// Banco de dados simples em JSON
function loadDB() {
  if (!fs.existsSync(DATABASE_PATH)) return {};
  return JSON.parse(fs.readFileSync(DATABASE_PATH, 'utf8'));
}
function saveDB(db) {
  fs.writeFileSync(DATABASE_PATH, JSON.stringify(db, null, 2));
}

const setupWLModule = async function(client) {
  // Carregar comandos modulares
  const commandsPath = path.join(__dirname, 'commands');
  if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    if (!client.commands) client.commands = new Collection();
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = await import(filePath);
      if (command && command.data && command.data.name) {
        client.commands.set(command.data.name, command);
      }
    }
  }
  // Comando para criar painel de whitelist
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!formwlscc')) return;
    if (!message.member.permissions.has('Administrator')) return message.reply('❌ Você não tem permissão!');
    const canal = message.mentions.channels.first() || message.channel;
    const embed = new EmbedBuilder()
      .setTitle('🏁 Whitelist Street Car Club')
      .setDescription('**Bem-vindo ao processo de whitelist!**\n\nPara fazer parte do nosso servidor de GTA RP, você precisa passar por um formulário de perguntas.\n\n⚠️ **IMPORTANTE:**\n• Questões 5 a 12 são obrigatórias\n• É necessário acertar TODAS para ser aprovado\n• Você tem 2 tentativas com cooldown de 24h\n\n📋 O formulário inclui:\n• Informações pessoais\n• História do personagem\n• Conhecimento sobre regras do servidor\n\nClique no botão abaixo para começar!')
      .setColor(0x00ff00)
      .setFooter({ text: 'Street Car Club • Sistema de Whitelist' });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('iniciar_wl').setLabel('🎯 Iniciar Whitelist').setStyle(3)
    );
    await canal.send({ embeds: [embed], components: [row] });
    await message.reply('✅ Painel criado!');
  });

  // Lógica de tentativas e cooldown
  function podeTentar(userId) {
    const db = loadDB();
    const user = db[userId];
    if (!user) return { pode: true, tentativas: 0 };
    if (user.aprovado) return { pode: false, tentativas: -1 };
    if (user.tentativas >= TENTATIVAS_MAXIMAS) {
      const last = new Date(user.last_attempt);
      const now = new Date();
      const diff = (now - last) / (1000 * 60 * 60);
      if (diff < COOLDOWN_HORAS) return { pode: false, tentativas: user.tentativas };
      return { pode: true, tentativas: user.tentativas };
    }
    return { pode: true, tentativas: user.tentativas };
  }
  function registrarTentativa(userId, aprovado) {
    const db = loadDB();
    if (!db[userId]) db[userId] = { tentativas: 0, aprovado: false, last_attempt: null };
    db[userId].tentativas += 1;
    db[userId].last_attempt = new Date().toISOString();
    if (aprovado) db[userId].aprovado = true;
    saveDB(db);
  }

  // Comando para status da whitelist
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!wlstatus')) return;
    const user = message.mentions.members.first() || message.member;
    const db = loadDB();
    const info = db[user.id];
    if (!info) {
      return message.reply({ embeds: [new EmbedBuilder().setTitle('📊 Status da Whitelist').setDescription(`**Usuário:** ${user}
**Status:** Nunca tentou a whitelist`).setColor(0x808080)] });
    }
    let status = info.aprovado ? '✅ Aprovado' : '❌ Reprovado';
    let color = info.aprovado ? 0x00ff00 : 0xff0000;
    const embed = new EmbedBuilder()
      .setTitle('📊 Status da Whitelist')
      .setDescription(`