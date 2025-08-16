import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const data = {
  name: 'tag-season',
  description: 'Cria o painel para resgatar a tag da temporada 04.'
};

export async function execute(message, args, client) {
  // Verificar se o comando foi executado no canal correto
  if (message.channel.id !== '1406085682639671468') {
    await message.reply('❌ Este comando só pode ser usado no canal específico para tags da temporada.');
    return;
  }

  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle('🏆 Tag da Temporada 04 🏆')
    .setDescription('🏆 A Temporada 04 do SCC foi inesquecível! 🏆\n\nPara celebrar suas conquistas, resgate agora sua Tag comemorativa. Basta clicar no botão resgatar e ela será sua!')
    .setFooter({ text: 'StreetCarClub • Temporada 04 | ™ Street CarClub © All rights reserved', iconURL: null })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('resgatar_tag_season')
      .setLabel('Resgatar Tag')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🏆')
  );

  await message.channel.send({ embeds: [embed], components: [row] });
  await message.reply('✅ Painel da tag da temporada criado!');
}
