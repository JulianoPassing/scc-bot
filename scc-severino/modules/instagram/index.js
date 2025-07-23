import { Events } from 'discord.js';

const setupInstagramModule = function(client) {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== '1046404065690652746') return;
    // Verifica se a mensagem NÃO tem anexo
    const temAnexo = message.attachments && message.attachments.size > 0;
    // Verifica se a mensagem NÃO tem link
    const temLink = /(https?:\/\/|discord\.gg|www\.)/i.test(message.content);
    if (!temAnexo && !temLink) {
      await message.reply('Aqui não é Bate-bapo 👮🏻');
    }
  });
};
export default setupInstagramModule; 