import { EmbedBuilder } from 'discord.js';
import { TICKET_PERMISSIONS } from '../config.js';

export const data = {
  name: 'debug-cargos',
  description: 'Debuga os cargos e suas permissões.'
};

export async function execute(message, args, client) {
  // Verificar se o usuário tem permissão de administrador
  if (!message.member.permissions.has('Administrator')) {
    return message.reply('❌ Você precisa ter permissão de Administrador para usar este comando.');
  }

  const guild = message.guild;
  const embed = new EmbedBuilder()
    .setColor('#0099FF')
    .setTitle('🔍 Debug de Cargos e Permissões')
    .setDescription('Verificando cargos configurados no sistema de tickets...')
    .setTimestamp();

  const statusMsg = await message.reply({ embeds: [embed] });

  const categorias = Object.keys(TICKET_PERMISSIONS);
  let debugInfo = '';

  for (const categoriaTipo of categorias) {
    const categoria = TICKET_PERMISSIONS[categoriaTipo];
    debugInfo += `\n**${categoria.emoji} ${categoria.nome}**\n`;
    debugInfo += `ID da Categoria: ${categoria.categoriaId}\n`;
    
    // Verificar se a categoria existe
    const categoriaChannel = guild.channels.cache.get(categoria.categoriaId);
    if (categoriaChannel) {
      debugInfo += `✅ Categoria encontrada: ${categoriaChannel.name}\n`;
    } else {
      debugInfo += `❌ Categoria NÃO encontrada\n`;
    }

    debugInfo += `**Cargos de Staff:**\n`;
    for (const roleId of categoria.staffRoles) {
      const role = guild.roles.cache.get(roleId);
      if (role) {
        debugInfo += `✅ ${role.name} (${roleId})\n`;
      } else {
        debugInfo += `❌ Cargo NÃO encontrado: ${roleId}\n`;
      }
    }
    debugInfo += `\n`;
  }

  // Verificar permissões do bot
  const botMember = guild.members.cache.get(client.user.id);
  const botPerms = botMember.permissions.toArray();
  debugInfo += `**Permissões do Bot:**\n`;
  debugInfo += `Gerenciar Canais: ${botPerms.includes('ManageChannels') ? '✅' : '❌'}\n`;
  debugInfo += `Gerenciar Permissões: ${botPerms.includes('ManageRoles') ? '✅' : '❌'}\n`;
  debugInfo += `Ver Canais: ${botPerms.includes('ViewChannel') ? '✅' : '❌'}\n`;

  embed.setDescription(debugInfo);
  embed.setFooter({ text: 'Sistema de Tickets StreetCarClub' });

  await statusMsg.edit({ embeds: [embed] });
} 