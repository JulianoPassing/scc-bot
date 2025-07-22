export const data = {
  name: 'ticket-status',
  description: 'Mostra o status dos tickets do usuário.'
};

export async function execute(message, args, client) {
  const user = message.mentions.members.first() || message.member;
  // Aqui você pode buscar e mostrar o status dos tickets do usuário
  await message.reply(`📋 Status dos tickets de ${user}: (exemplo)`);
} 