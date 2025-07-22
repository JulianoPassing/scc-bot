import { EmbedBuilder } from 'discord.js';

export const data = {
  name: 'fechar-ticket-seguranca',
  description: 'Fecha o ticket de segurança atual.'
};

export async function execute(message, args, client) {
  const channel = message.channel;
  if (!channel.name.startsWith('seg-')) {
    return message.reply('❌ Este comando só pode ser usado em canais de ticket de segurança!');
  }
  // Permissão: apenas staff
  const config = await import('../config.json', { assert: { type: 'json' } });
  const member = message.member;
  const hasStaffRole = member.roles.cache.has(config.default.staffRoleId);
  if (!hasStaffRole) {
    return message.reply('❌ Apenas membros da equipe podem fechar tickets de segurança!');
  }
  const confirmEmbed = new EmbedBuilder()
    .setColor('#FFA500')
    .setTitle('🔒 Fechando Ticket')
    .setDescription('Este ticket será deletado em 5 segundos...')
    .setFooter({ text: `Fechado por ${message.author.tag}` })
    .setTimestamp();
  await message.reply({ embeds: [confirmEmbed] });
  setTimeout(async () => {
    try {
      await channel.delete(`Ticket fechado por ${message.author.tag}`);
    } catch (error) {
      // erro ao deletar
    }
  }, 5000);
} 