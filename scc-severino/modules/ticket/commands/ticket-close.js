export const data = {
  name: 'ticket-close',
  description: 'Fecha o ticket atual.'
};

export async function execute(message, args, client) {
  // Aqui você pode implementar a lógica para fechar o canal do ticket
  await message.reply('✅ Ticket fechado!');
} 