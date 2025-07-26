import { EmbedBuilder } from 'discord.js';
import { TICKET_PERMISSIONS } from '../config.js';
import { configurarPermissoesTicket } from '../utils/ticketPermissions.js';

export const data = {
  name: 'corrigir-ticket',
  description: 'Corrige as permissões do ticket atual.'
};

export async function execute(message, args, client) {
  // Verificar se o usuário tem permissão de gerenciar canais
  if (!message.member.permissions.has('ManageChannels')) {
    return message.reply('❌ Você precisa ter permissão de Gerenciar Canais para usar este comando.');
  }

  const channel = message.channel;
  const categorias = Object.keys(TICKET_PERMISSIONS);

  // Verificar se o canal atual é um ticket
  let categoriaEncontrada = null;
  for (const categoria of categorias) {
    const emoji = TICKET_PERMISSIONS[categoria].emoji;
    if (channel.name.startsWith(`${emoji}${categoria}-`)) {
      categoriaEncontrada = categoria;
      break;
    }
  }

  if (!categoriaEncontrada) {
    return message.reply('❌ Este canal não parece ser um ticket válido.');
  }

  // Extrair o nome do usuário do nome do canal
  const nomePartes = channel.name.split('-');
  if (nomePartes.length < 2) {
    return message.reply('❌ Formato de nome inválido para o ticket.');
  }

  const nomeUsuario = nomePartes.slice(1).join('-');
  const usuario = message.guild.members.cache.find(member => 
    member.user.username.toLowerCase() === nomeUsuario.toLowerCase()
  );

  if (!usuario) {
    return message.reply('❌ Usuário não encontrado para este ticket.');
  }

  const embed = new EmbedBuilder()
    .setColor('#FFA500')
    .setTitle('🔧 Corrigindo Permissões do Ticket')
    .setDescription(`Corrigindo permissões do ticket ${channel.name}...`)
    .setTimestamp();

  const statusMsg = await message.reply({ embeds: [embed] });

  try {
    // Aplicar as permissões corretas
    await configurarPermissoesTicket(channel, categoriaEncontrada, usuario.id);

    embed.setColor('#43B581')
      .setTitle('✅ Permissões Corrigidas')
      .setDescription(
        `**Ticket:** ${channel.name}\n` +
        `**Categoria:** ${TICKET_PERMISSIONS[categoriaEncontrada].nome}\n` +
        `**Criador:** ${usuario.user.tag}\n` +
        `**Status:** Permissões aplicadas com sucesso!`
      )
      .setFooter({ text: 'Sistema de Tickets StreetCarClub' });

    await statusMsg.edit({ embeds: [embed] });

  } catch (error) {
    console.error('Erro ao corrigir permissões do ticket:', error);
    
    embed.setColor('#FF0000')
      .setTitle('❌ Erro ao Corrigir Permissões')
      .setDescription(
        `**Erro:** ${error.message}\n` +
        `**Ticket:** ${channel.name}\n` +
        `**Categoria:** ${TICKET_PERMISSIONS[categoriaEncontrada].nome}`
      );

    await statusMsg.edit({ embeds: [embed] });
  }
} 