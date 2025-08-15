import { ChannelType, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import config from '../config.json' with { type: 'json' };

const ticketCounterFile = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'ticket-counter.json');

export async function getNextTicketNumber() {
  let counter = 1;
  try {
    const fileContent = await fs.readFile(ticketCounterFile, 'utf8');
    if (fileContent.trim()) {
      const data = JSON.parse(fileContent);
      counter = data.counter || 1;
    }
  } catch (error) {}
  const newCounter = counter + 1;
  try {
    await fs.writeFile(ticketCounterFile, JSON.stringify({ counter: newCounter }, null, 2));
  } catch (error) {}
  return counter;
}

export async function createTicketChannel(guild, channelName, user, reason, ticketNumber, client) {
  try {
    // Usar sempre a categoria padrão para criação
    const selectedCategoryId = config.categoryId; // Sempre usar a categoria padrão
    const ticketCategory = guild.channels.cache.get(selectedCategoryId);
    if (!ticketCategory) {
      throw new Error(`Categoria padrão não encontrada: ${config.categoryId}`);
    }
    
    // Permissões específicas para o canal
    const permissionOverwrites = [
      { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
      { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
      { id: config.staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageChannels] }
    ];
    
    // Adicionar permissões para roles de suporte
    for (const roleName of config.supportRoles || []) {
      const role = guild.roles.cache.find(r => r.name === roleName);
      if (role) {
        permissionOverwrites.push({
          id: role.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageChannels]
        });
      }
    }
    
    // Criação do canal
    console.log('[DEBUG] Criando canal com permissões:', permissionOverwrites.length, 'overwrites');
    console.log('[DEBUG] Permissões para usuário:', user.id, 'Staff Role:', config.staffRoleId);
    
    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: selectedCategoryId,
      topic: `Ticket de Segurança #${ticketNumber} | ${user.tag} | ${reason}`,
      permissionOverwrites
    });
    
    console.log('[DEBUG] Canal criado com sucesso:', ticketChannel.id);
    console.log('[DEBUG] Permissões do canal criado:', ticketChannel.permissionOverwrites.cache.size, 'overwrites');
    // Log de criação
    try {
      const logChannel = guild.channels.cache.get(config.logChannelId);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setColor('#EAF207')
          .setTitle('🛡️ Novo Ticket de Segurança')
          .setDescription(`Usuário: <@${user.id}> (${user.tag})\nCanal: ${ticketChannel}`)
          .addFields(
            { name: 'Motivo', value: reason, inline: false },
            { name: 'Número do Ticket', value: `#${ticketNumber}`, inline: true }
          )
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
      }
    } catch (e) {}
    return ticketChannel;
  } catch (error) {
    throw error;
  }
} 