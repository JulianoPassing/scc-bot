import { EmbedBuilder } from 'discord.js';

export const data = {
  name: 'remover-usuario',
  description: 'Remove um usuário do ticket.'
};

export async function execute(message, args, client) {
  const channel = message.channel;
  const user = message.mentions.members.first();
  if (!user) return message.reply('❌ Mencione o usuário para remover!');
  if (!channel.name.startsWith('ticket-')) {
    return message.reply('❌ Este comando só pode ser usado em canais de ticket!');
  }
  // Permissão: apenas staff
  if (!message.member.permissions.has('ManageChannels')) {
    return message.reply('❌ Apenas membros da equipe podem remover usuários de tickets!');
  }
  try {
    await channel.permissionOverwrites.delete(user);
    const successEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Usuário Removido')
      .setDescription(`${user} foi removido do ticket.`)
      .setTimestamp();
    await message.reply({ embeds: [successEmbed] });
  } catch (error) {
    await message.reply('❌ Erro ao remover usuário do ticket.');
  }
} 