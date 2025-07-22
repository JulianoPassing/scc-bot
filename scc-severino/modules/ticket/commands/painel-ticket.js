export const data = {
  name: 'painel-ticket',
  description: 'Cria um painel para abertura de tickets.'
};

export async function execute(message, args, client) {
  if (!message.member.permissions.has('Administrator')) return message.reply('❌ Você não tem permissão!');
  // Aqui você pode criar o painel de tickets com botões, embed, etc.
  await message.channel.send('🎫 Painel de tickets criado!');
} 