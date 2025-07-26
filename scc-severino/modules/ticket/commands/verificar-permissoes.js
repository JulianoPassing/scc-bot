import { EmbedBuilder } from 'discord.js';
import { TICKET_PERMISSIONS, CREATOR_PERMISSIONS, STAFF_PERMISSIONS } from '../config.js';

export const data = {
  name: 'verificar-permissoes',
  description: 'Verifica as permissões de um ticket específico.'
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

  const categoria = TICKET_PERMISSIONS[categoriaEncontrada];
  const embed = new EmbedBuilder()
    .setColor('#0099FF')
    .setTitle(`🔍 Verificação de Permissões - ${categoria.emoji} ${categoria.nome}`)
    .setDescription(`Canal: ${channel.name}`)
    .addFields(
      { name: 'Categoria', value: `${categoria.emoji} ${categoria.nome}`, inline: true },
      { name: 'ID da Categoria', value: categoria.categoriaId, inline: true },
      { name: 'Descrição', value: categoria.desc, inline: false }
    )
    .setTimestamp();

  // Verificar permissões do @everyone
  const everyonePerms = channel.permissionOverwrites.cache.get(message.guild.roles.everyone.id);
  if (everyonePerms) {
    const everyoneStatus = everyonePerms.deny.has('ViewChannel') ? '✅ Negado' : '❌ Permitido';
    embed.addFields({ name: '@everyone - Ver Canal', value: everyoneStatus, inline: true });
  }

  // Verificar cargos de staff
  const staffFields = [];
  for (const roleId of categoria.staffRoles) {
    const role = message.guild.roles.cache.get(roleId);
    const rolePerms = channel.permissionOverwrites.cache.get(roleId);
    
    if (role) {
      const hasViewChannel = rolePerms ? rolePerms.allow.has('ViewChannel') : false;
      const hasSendMessages = rolePerms ? rolePerms.allow.has('SendMessages') : false;
      const hasManageMessages = rolePerms ? rolePerms.allow.has('ManageMessages') : false;
      
      const status = hasViewChannel && hasSendMessages ? '✅ Configurado' : '❌ Não configurado';
      staffFields.push({
        name: `${role.name} (${roleId})`,
        value: `${status}\nVer: ${hasViewChannel ? '✅' : '❌'} | Enviar: ${hasSendMessages ? '✅' : '❌'} | Gerenciar: ${hasManageMessages ? '✅' : '❌'}`,
        inline: true
      });
    } else {
      staffFields.push({
        name: `Cargo ${roleId}`,
        value: '❌ Cargo não encontrado',
        inline: true
      });
    }
  }

  embed.addFields({ name: 'Cargos de Staff', value: 'Permissões configuradas:', inline: false });
  embed.addFields(...staffFields);

  // Verificar permissões do criador (se possível identificar)
  const nomePartes = channel.name.split('-');
  if (nomePartes.length >= 2) {
    const nomeUsuario = nomePartes.slice(1).join('-');
    const usuario = message.guild.members.cache.find(member => 
      member.user.username.toLowerCase() === nomeUsuario.toLowerCase()
    );

    if (usuario) {
      const userPerms = channel.permissionOverwrites.cache.get(usuario.id);
      const hasViewChannel = userPerms ? userPerms.allow.has('ViewChannel') : false;
      const hasSendMessages = userPerms ? userPerms.allow.has('SendMessages') : false;
      const hasAttachFiles = userPerms ? userPerms.allow.has('AttachFiles') : false;
      const hasEmbedLinks = userPerms ? userPerms.allow.has('EmbedLinks') : false;

      embed.addFields({
        name: 'Criador do Ticket',
        value: `${usuario.user.tag} (${usuario.id})`,
        inline: false
      });

      embed.addFields({
        name: 'Permissões do Criador',
        value: `Ver Canal: ${hasViewChannel ? '✅' : '❌'}\nEnviar Mensagens: ${hasSendMessages ? '✅' : '❌'}\nAnexar Arquivos: ${hasAttachFiles ? '✅' : '❌'}\nEnviar Links: ${hasEmbedLinks ? '✅' : '❌'}`,
        inline: false
      });
    }
  }

  // Adicionar informações sobre permissões esperadas
  embed.addFields({
    name: 'Permissões Esperadas - Criador',
    value: Object.keys(CREATOR_PERMISSIONS).filter(perm => CREATOR_PERMISSIONS[perm]).join(', '),
    inline: false
  });

  embed.addFields({
    name: 'Permissões Esperadas - Staff',
    value: Object.keys(STAFF_PERMISSIONS).filter(perm => STAFF_PERMISSIONS[perm]).join(', '),
    inline: false
  });

  embed.setFooter({ text: 'Sistema de Tickets StreetCarClub' });

  await message.reply({ embeds: [embed] });
} 