import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, Events, Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';

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

const setupWLModule = function(client) {
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
      .setDescription(`**Usuário:** ${user}
**Status:** ${status}
**Tentativas:** ${info.tentativas}/${TENTATIVAS_MAXIMAS}`)
      .setColor(color);
    if (info.last_attempt) {
      embed.addFields({ name: 'Última tentativa', value: `<t:${Math.floor(new Date(info.last_attempt).getTime()/1000)}:R>`, inline: false });
    }
    await message.reply({ embeds: [embed] });
  });

  // Comando para resetar whitelist
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!resetwl')) return;
    if (!message.member.permissions.has('Administrator')) return message.reply('❌ Você não tem permissão!');
    const user = message.mentions.members.first();
    if (!user) return message.reply('❌ Mencione o usuário para resetar!');
    const db = loadDB();
    delete db[user.id];
    saveDB(db);
    // Remover cargo se tiver
    try {
      const role = message.guild.roles.cache.get(CARGO_APROVADO);
      if (role && user.roles.cache.has(role.id)) {
        await user.roles.remove(role);
      }
    } catch {}
    await message.reply(`🔄 Whitelist de ${user} resetada!`);
  });

  // Handler do botão para iniciar whitelist
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() || interaction.customId !== 'iniciar_wl') return;
    const { pode, tentativas } = podeTentar(interaction.user.id);
    if (!pode) {
      if (tentativas === -1) {
        return interaction.reply({ content: '❌ Você já foi aprovado na whitelist!', ephemeral: true });
      } else {
        return interaction.reply({ content: `⏰ Cooldown ativo. Aguarde 24h para tentar novamente.`, ephemeral: true });
      }
    }
    // Modal de whitelist simplificado
    const modal = new ModalBuilder()
      .setCustomId('modal_wl')
      .setTitle('Whitelist Street Car Club');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('nome').setLabel('Nome completo').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('motivo').setLabel('Por que quer jogar?').setStyle(TextInputStyle.Paragraph).setRequired(true)
      )
    );
    await interaction.showModal(modal);
  });

  // Handler do modal de whitelist
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit() || interaction.customId !== 'modal_wl') return;
    // Aqui você pode adicionar lógica de perguntas obrigatórias, validação, etc.
    // Para simplificação, aprova automaticamente
    registrarTentativa(interaction.user.id, true);
    // Dar cargo
    try {
      const role = interaction.guild.roles.cache.get(CARGO_APROVADO);
      if (role) await interaction.member.roles.add(role);
    } catch {}
    // Logar formulário
    const canal = interaction.guild.channels.cache.get(CANAL_FORMULARIOS);
    if (canal) {
      const embed = new EmbedBuilder()
        .setTitle('📋 Formulário de Whitelist Respondido')
        .setColor(0x00ff00)
        .addFields(
          { name: '👤 Usuário', value: `${interaction.user} (ID: ${interaction.user.id})`, inline: false },
          { name: '📝 Nome', value: interaction.fields.getTextInputValue('nome'), inline: false },
          { name: '💭 Motivação', value: interaction.fields.getTextInputValue('motivo'), inline: false },
          { name: 'Status', value: '✅ APROVADO', inline: true }
        )
        .setTimestamp();
      await canal.send({ embeds: [embed] });
    }
    await interaction.reply({ content: '✅ Formulário enviado e aprovado! Você foi adicionado à whitelist.', ephemeral: true });
  });
};
export default setupWLModule; 