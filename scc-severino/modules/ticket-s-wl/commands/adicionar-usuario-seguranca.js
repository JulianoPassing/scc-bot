import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = {
  name: 'adicionar-usuario-seguranca',
  description: 'Adiciona um usuário ao ticket de segurança.'
};

export async function execute(message, args, client) {
  const channel = message.channel;
  const user = message.mentions.members.first();
  if (!user) return message.reply('❌ Mencione o usuário para adicionar!');
  if (!channel.name.startsWith('seg-')) {
    return message.reply('❌ Este comando só pode ser usado em canais de ticket de segurança!');
  }
  // Permissão: apenas staff
  const config = await import('../config.json', { assert: { type: 'json' } });
  const member = message.member;
  const hasStaffRole = member.roles.cache.has(config.default.staffRoleId);
  if (!hasStaffRole) {
    return message.reply('❌ Apenas membros da equipe podem adicionar usuários em tickets de segurança!');
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