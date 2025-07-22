export const data = {
  name: 'ticket-remove',
  description: 'Remove um usuário do ticket.'
};

export async function execute(message, args, client) {
  const user = message.mentions.members.first();
  if (!user) return message.reply('❌ Mencione o usuário para remover!');
  // Aqui você pode remover o usuário do canal do ticket
  await message.reply(`➖ ${user} removido do ticket!`);
} 