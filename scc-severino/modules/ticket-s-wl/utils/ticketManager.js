import { ChannelType, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import config from '../config.json' assert { type: 'json' };

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
    // Categoria correta
    const ticketCategory = guild.channels.cache.get(config.categoryId);
    // Permissões
    const permissionOverwrites = [
      { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
      { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
      { id: config.staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageChannels] }
    ];
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
    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: ticketCategory,
      topic: `Ticket de Segurança #${ticketNumber} | ${user.tag} | ${reason}`,
      permissionOverwrites
    });
    // Log de criação
    try {
      const logChannel = guild.channels.cache.get(config.logChannelId);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setColor('#0099FF')
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