import { EmbedBuilder } from 'discord.js';
import { CATEGORY_CONFIG } from '../config.js';
import { isCategoryFull } from '../utils/ticketPermissions.js';

export const data = {
  name: 'ticket-status',
  description: 'Verifica o status das categorias de tickets e suas permissões.'
};

export async function execute(message, args, client) {
  // Verificar se o usuário tem permissão de staff
  const hasStaffPermission = message.member.permissions.has('ManageChannels') || 
    Object.values(CATEGORY_CONFIG).some(config => 
      config.staffRoles.some(roleId => message.member.roles.cache.has(roleId))
    );

  if (!hasStaffPermission) {
    return message.reply('❌ Você não tem permissão para usar este comando.');
  }

  const embed = new EmbedBuilder()
    .setColor('#0099FF')
    .setTitle('📊 Status das Categorias de Tickets')
    .setDescription('Informações sobre as categorias de tickets e suas permissões')
    .setTimestamp();

  for (const [categoriaKey, config] of Object.entries(CATEGORY_CONFIG)) {
    try {
      const isFull = await isCategoryFull(config.id, message.guild);
      const channelsInCategory = message.guild.channels.cache.filter(
        channel => channel.parentId === config.id
      ).size;

      const staffRolesText = config.staffRoles.map(roleId => {
        const role = message.guild.roles.cache.get(roleId);
        return role ? `<@&${roleId}>` : `ID: ${roleId} (não encontrado)`;
      }).join(', ');

      embed.addFields({
        name: `${config.emoji} ${config.nome}`,
        value: `**ID da Categoria:** ${config.id}\n` +
               `**Canais ativos:** ${channelsInCategory}/50\n` +
               `**Status:** ${isFull ? '🔴 CHEIA' : '🟢 Disponível'}\n` +
               `**Staff com acesso:** ${staffRolesText}\n` +
               `**Descrição:** ${config.desc}`,
        inline: false
      });
    } catch (error) {
      embed.addFields({
        name: `${config.emoji} ${config.nome}`,
        value: `**Erro ao verificar categoria:** ${error.message}`,
        inline: false
      });
    }
  }

  embed.addFields({
    name: 'ℹ️ Informações Gerais',
    value: '• **Criador do ticket:** Ver canal, Enviar mensagens, Enviar links, Enviar anexos, Ver histórico\n' +
           '• **Staff:** Todas as permissões do criador + Gerenciar mensagens e canais\n' +
           '• **Categoria cheia:** Tickets são criados no topo do servidor com as mesmas permissões\n' +
           '• **Herança:** Não há herança de permissões da categoria',
    inline: false
  });

  await message.reply({ embeds: [embed] });
} 