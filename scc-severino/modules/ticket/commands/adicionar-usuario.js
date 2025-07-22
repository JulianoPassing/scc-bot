import { EmbedBuilder } from 'discord.js';

export const data = {
  name: 'adicionar-usuario',
  description: 'Adiciona um usuário ao ticket.'
};

export async function execute(message, args, client) {
  const channel = message.channel;
  const user = message.mentions.members.first();
  if (!user) return message.reply('❌ Mencione o usuário para adicionar!');
  if (!channel.name.startsWith('ticket-')) {
    return message.reply('❌ Este comando só pode ser usado em canais de ticket!');
  }
  // Permissão: apenas staff
  if (!message.member.permissions.has('ManageChannels')) {
    return message.reply('❌ Apenas membros da equipe podem adicionar usuários em tickets!');
  }
  try {
    await channel.permissionOverwrites.create(user, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true
    });
    const successEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Usuário Adicionado')
      .setDescription(`${user} foi adicionado ao ticket.`)
      .setTimestamp();
    await message.reply({ embeds: [successEmbed] });
  } catch (error) {
    await message.reply('❌ Erro ao adicionar usuário ao ticket.');
  }
} 