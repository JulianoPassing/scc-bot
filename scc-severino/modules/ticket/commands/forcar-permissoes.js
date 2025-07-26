import { EmbedBuilder } from 'discord.js';
import { TICKET_PERMISSIONS } from '../config.js';
import { configurarPermissoesTicket } from '../utils/ticketPermissions.js';

export const data = {
  name: 'forcar-permissoes',
  description: 'Força a aplicação das permissões corretas no ticket atual.'
};

export async function execute(message, args, client) {
  // Verificar se o usuário tem permissão de administrador
  if (!message.member.permissions.has('Administrator')) {
    return message.reply('❌ Você precisa ter permissão de Administrador para usar este comando.');
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
    .setColor('#FF0000')
    .setTitle('⚠️ Forçando Aplicação de Permissões')
    .setDescription(
      `**ATENÇÃO:** Este comando irá REMOVER TODAS as permissões existentes e aplicar apenas as permissões corretas!\n\n` +
      `**Ticket:** ${channel.name}\n` +
      `**Categoria:** ${TICKET_PERMISSIONS[categoriaEncontrada].nome}\n` +
      `**Criador:** ${usuario.user.tag}\n\n` +
      `**Permissões que serão aplicadas:**\n` +
      `• @everyone: ❌ Ver Canal (Canal Privado)\n` +
      `• Criador: ✅ Ver, Enviar, Anexar, Links, Histórico\n` +
      `• Staff: ✅ Ver, Enviar, Anexar, Links, Histórico, Gerenciar Mensagens`
    )
    .setTimestamp();

  const statusMsg = await message.reply({ embeds: [embed] });

  try {
    // Forçar aplicação das permissões corretas
    await configurarPermissoesTicket(channel, categoriaEncontrada, usuario.id);

    embed.setColor('#43B581')
      .setTitle('✅ Permissões Forçadas com Sucesso')
      .setDescription(
        `**Ticket:** ${channel.name}\n` +
        `**Categoria:** ${TICKET_PERMISSIONS[categoriaEncontrada].nome}\n` +
        `**Criador:** ${usuario.user.tag}\n` +
        `**Status:** Todas as permissões foram removidas e reaplicadas corretamente!\n\n` +
        `**Permissões aplicadas:**\n` +
        `• @everyone: ❌ Ver Canal (Canal Privado)\n` +
        `• Criador: ✅ Ver, Enviar, Anexar, Links, Histórico\n` +
        `• Staff: ✅ Ver, Enviar, Anexar, Links, Histórico, Gerenciar Mensagens`
      )
      .setFooter({ text: 'Sistema de Tickets StreetCarClub' });

    await statusMsg.edit({ embeds: [embed] });

  } catch (error) {
    console.error('Erro ao forçar permissões do ticket:', error);
    
    embed.setColor('#FF0000')
      .setTitle('❌ Erro ao Forçar Permissões')
      .setDescription(
        `**Erro:** ${error.message}\n` +
        `**Ticket:** ${channel.name}\n` +
        `**Categoria:** ${TICKET_PERMISSIONS[categoriaEncontrada].nome}`
      );

    await statusMsg.edit({ embeds: [embed] });
  }
} 