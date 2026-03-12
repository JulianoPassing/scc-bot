import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  ChannelType,
  PermissionFlagsBits,
  Collection
} from 'discord.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8')
);

const { ADMIN_ROLE_ID, categories, roles, channelPermissions } = config;

// Permissões base para canais de texto
const TEXT_CHANNEL_PERMS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.AddReactions,
  PermissionFlagsBits.UseExternalEmojis
];

// Permissões base para canais de voz
const VOICE_CHANNEL_PERMS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.Connect,
  PermissionFlagsBits.Speak,
  PermissionFlagsBits.Stream
];

// Permissões para canais de leitura apenas (ex: anúncios)
const READ_ONLY_PERMS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.AddReactions
];

// Canais que são apenas leitura para Piloto/Visitante
const READ_ONLY_CHANNELS = ['regras', 'anúncios', 'calendário'];

function hexToDecimal(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setupArmageddon(guild, message) {
  const processingMsg = await message.reply('🔄 Iniciando setup do servidor Armageddon...');

  try {
    // 1. Criar cargos
    const createdRoles = {};
    for (const roleConfig of roles) {
      await sleep(500); // Evitar rate limit
      const color = hexToDecimal(roleConfig.color);
      const role = await guild.roles.create({
        name: roleConfig.name,
        color,
        reason: 'Setup Armageddon - SCC'
      });
      createdRoles[roleConfig.name] = role;
      console.log(`✅ Cargo criado: ${roleConfig.name}`);
    }

    // 2. Criar categorias e canais
    const channelMap = {}; // key -> channel

    for (const catConfig of categories) {
      await sleep(500);

      const category = await guild.channels.create({
        name: catConfig.name,
        type: ChannelType.GuildCategory,
        reason: 'Setup Armageddon - SCC'
      });

      for (const chConfig of catConfig.channels) {
        await sleep(500);

        const isVoice = chConfig.type === 'voice';
        const channelType = isVoice ? ChannelType.GuildVoice : ChannelType.GuildText;

        const permissionOverwrites = buildPermissionOverwrites(
          guild,
          createdRoles,
          chConfig.key,
          isVoice
        );

        const channel = await guild.channels.create({
          name: chConfig.name,
          type: channelType,
          parent: category.id,
          permissionOverwrites,
          reason: 'Setup Armageddon - SCC'
        });

        if (chConfig.key) {
          channelMap[chConfig.key] = channel;
        }
      }
    }

    await processingMsg.edit(
      '✅ **Setup concluído!**\n\n' +
      `📁 ${categories.length} categorias criadas\n` +
      `📝 Canais de texto e voz configurados\n` +
      `👥 ${roles.length} cargos criados com permissões\n\n` +
      '**Cargos:** Prefeitura, Organizador, Piloto, Visitante, Street Armageddon'
    );
  } catch (error) {
    console.error('Erro no setup Armageddon:', error);
    await processingMsg.edit(
      `❌ Erro ao executar setup: ${error.message}\n\n` +
      'Verifique se o bot tem as permissões: Gerenciar Canais, Gerenciar Cargos'
    ).catch(() => {});
  }
}

function buildPermissionOverwrites(guild, createdRoles, channelKey, isVoice) {
  const everyone = guild.roles.everyone;
  const overwrites = [];

  const basePerms = isVoice ? VOICE_CHANNEL_PERMS : TEXT_CHANNEL_PERMS;
  const readOnlyPerms = isVoice ? VOICE_CHANNEL_PERMS : READ_ONLY_PERMS;

  const isReadOnly = READ_ONLY_CHANNELS.includes(channelKey);
  const pilotoChannels = channelPermissions.piloto || [];
  const visitanteChannels = channelPermissions.visitante || [];
  const staffChannels = channelPermissions.staff || [];

  const pilotoRole = createdRoles['Piloto'];
  const visitanteRole = createdRoles['Visitante'];
  const prefeituraRole = createdRoles['Prefeitura'];
  const organizadorRole = createdRoles['Organizador'];

  // Por padrão: @everyone não vê (exceto se for canal público)
  overwrites.push({
    id: everyone.id,
    deny: [PermissionFlagsBits.ViewChannel]
  });

  // Prefeitura e Organizador: acesso total
  if (prefeituraRole) {
    overwrites.push({
      id: prefeituraRole.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AddReactions,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.Stream,
        PermissionFlagsBits.MoveMembers
      ]
    });
  }
  if (organizadorRole) {
    overwrites.push({
      id: organizadorRole.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AddReactions,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.Stream,
        PermissionFlagsBits.MoveMembers
      ]
    });
  }

  // Piloto: canais permitidos
  if (pilotoRole && pilotoChannels.includes(channelKey)) {
    const perms = isReadOnly ? readOnlyPerms : basePerms;
    overwrites.push({
      id: pilotoRole.id,
      allow: perms
    });
  }

  // Visitante: canais permitidos
  if (visitanteRole && visitanteChannels.includes(channelKey)) {
    const perms = isReadOnly ? readOnlyPerms : basePerms;
    overwrites.push({
      id: visitanteRole.id,
      allow: perms
    });
  }

  // Staff: canal exclusivo staff (Prefeitura e Organizador já têm acesso)
  if (staffChannels.includes(channelKey)) {
    // Apenas Prefeitura e Organizador - já adicionados acima
    // Não adicionar Piloto/Visitante ao staff
  }

  return overwrites;
}

const setupDiscordModule = function (client) {
  if (!client.commands) client.commands = new Collection();

  client.commands.set('setup-armageddon', {
    data: {
      name: 'setup-armageddon',
      description: 'Cria a estrutura completa do servidor Armageddon (categorias, canais, cargos e permissões)'
    },
    async execute(message, args, client) {
      if (message.author.bot) return;

      if (!message.member?.roles?.cache?.has(ADMIN_ROLE_ID)) {
        return message.reply('❌ Você não tem permissão para usar este comando.').catch(() => {});
      }

      if (!message.guild) {
        return message.reply('❌ Este comando só pode ser usado em um servidor.').catch(() => {});
      }

      const botMember = await message.guild.members.fetchMe();
      if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return message.reply(
          '❌ O bot precisa da permissão **Gerenciar Canais** para executar o setup.'
        ).catch(() => {});
      }
      if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return message.reply(
          '❌ O bot precisa da permissão **Gerenciar Cargos** para executar o setup.'
        ).catch(() => {});
      }

      await setupArmageddon(message.guild, message);
    }
  });
};

export default setupDiscordModule;
