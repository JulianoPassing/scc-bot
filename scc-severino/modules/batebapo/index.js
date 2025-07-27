import { Events } from 'discord.js';

const setupBateBapoModule = function(client) {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== '1046404065690652745') return;
    if (message.content.trim() === '.') {
      await message.reply('Se for pra contratação, me contrata também, **Noel 🎅🏻** me escravizou aqui.');
    }
  });
};
export default setupBateBapoModule; 