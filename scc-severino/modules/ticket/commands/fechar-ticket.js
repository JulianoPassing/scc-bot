import { EmbedBuilder } from 'discord.js';
import { CATEGORY_CONFIG } from '../config.js';
import { LOG_CHANNEL_ID } from '../config.js';

export const data = {
  name: 'fechar-ticket',
  description: 'Fecha o ticket atual.'
};

export async function execute(message, args, client) {
  const channel = message.channel;
  
  // Verificar se é um canal de ticket válido
  const isTicketChannel = Object.values(CATEGORY_CONFIG).some(config => 
    channel.name.startsWith(config.emoji)
  );
  
  if (!isTicketChannel) {
    return message.reply('❌ Este comando só pode ser usado em canais de ticket!');
  }
  
  // Verificar permissão de staff
  const hasStaffPermission = message.member.permissions.has('ManageChannels') || 
    Object.values(CATEGORY_CONFIG).some(config => 
      config.staffRoles.some(roleId => message.member.roles.cache.has(roleId))
    );

  if (!hasStaffPermission) {
    return message.reply('❌ Apenas membros da equipe podem fechar tickets!');
  }

  const motivo = args.join(' ') || 'Fechado via comando';
  
  const confirmEmbed = new EmbedBuilder()
    .setColor('#FFA500')
    .setTitle('🔒 Fechando Ticket')
    .setDescription(`Este ticket será deletado em 5 segundos...\n**Motivo:** ${motivo}`)
    .setFooter({ text: `Fechado por ${message.author.tag}` })
    .setTimestamp();
    
  await message.reply({ embeds: [confirmEmbed] });
  
  // Gerar transcript simples
  try {
    const messages = await channel.messages.fetch({ limit: 100 });
    const sorted = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    
    let transcript = `=== TRANSCRIPT DO TICKET ===\n`;
    transcript += `Canal: #${channel.name}\n`;
    transcript += `Fechado por: ${message.author.tag}\n`;
    transcript += `Motivo: ${motivo}\n`;
    transcript += `Data: ${new Date().toLocaleString('pt-BR')}\n\n`;
    
    for (const msg of sorted.values()) {
      const time = new Date(msg.createdTimestamp).toLocaleString('pt-BR');
      transcript += `[${time}] ${msg.author.tag}: ${msg.content}\n`;
    }
    
    // Enviar para canal de logs
    const logChannel = await message.guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('📑 Ticket Fechado (Comando)')
        .setDescription(`Ticket fechado por <@${message.author.id}>\n**Motivo:** ${motivo}`)
        .addFields(
          { name: 'Canal', value: `<#${channel.id}>`, inline: true },
          { name: 'Fechado por', value: `<@${message.author.id}>`, inline: true }
        )
        .setTimestamp();
      
      await logChannel.send({ 
        embeds: [logEmbed], 
        files: [{ attachment: Buffer.from(transcript, 'utf-8'), name: `transcript-${channel.name}.txt` }] 
      });
    }
  } catch (error) {
    console.error('Erro ao gerar transcript:', error);
  }
  
  setTimeout(async () => {
    try {
      await channel.delete(`Ticket fechado por ${message.author.tag} - Motivo: ${motivo}`);
    } catch (error) {
      console.error('Erro ao deletar canal:', error);
    }
  }, 5000);
} 