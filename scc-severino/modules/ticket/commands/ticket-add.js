export const data = {
  name: 'ticket-add',
  description: 'Adiciona um usuário ao ticket.'
};

export async function execute(message, args, client) {
  const user = message.mentions.members.first();
  if (!user) return message.reply('❌ Mencione o usuário para adicionar!');
  // Aqui você pode adicionar o usuário ao canal do ticket
  await message.reply(`➕ ${user} adicionado ao ticket!`);
} 