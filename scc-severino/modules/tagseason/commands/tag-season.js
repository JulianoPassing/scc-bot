import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const data = {
  name: 'tag-season',
  description: 'Cria o painel para resgatar a tag da Temporada 05.'
};

export async function execute(message, args, client) {
  // Verificar se o comando foi executado no canal correto
  if (message.channel.id !== '1406085682639671468') {
    await message.reply('❌ Este comando só pode ser usado no canal específico para tags da temporada.');
    return;
  }

  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle('🏆 Tag da Temporada 05 🏆')
    .setDescription(
      '🏆 A Temporada 05 do SCC foi inesquecível! 🏆\n\n' +
      'Agradecemos a **todos os players** que fizeram parte desta jornada e ajudaram a construir essa história.\n\n' +
      'Para celebrar suas conquistas, resgate agora sua Tag comemorativa. Basta clicar no botão **Resgatar** e ela será sua!'
    )
    .setFooter({ text: 'StreetCarClub • Temporada 05 | ™ Street CarClub © All rights reserved', iconURL: null })
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
