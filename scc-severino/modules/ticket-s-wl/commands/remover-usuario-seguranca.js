import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = {
  name: 'remover-usuario-seguranca',
  description: 'Remove um usuário do ticket de segurança.'
};

export async function execute(message, args, client) {
  const channel = message.channel;
  const user = message.mentions.members.first();
  if (!user) return message.reply('❌ Mencione o usuário para remover!');
  if (!channel.name.startsWith('seg-')) {
    return message.reply('❌ Este comando só pode ser usado em canais de ticket de segurança!');
  }
  // Permissão: apenas staff
  const config = await import('../config.json', { assert: { type: 'json' } });
  const member = message.member;
  const hasStaffRole = member.roles.cache.has(config.default.staffRoleId);
  if (!hasStaffRole) {
    return message.reply('❌ Apenas membros da equipe podem remover usuários de tickets de segurança!');
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