import { EmbedBuilder } from 'discord.js';

export default async function(client) {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    const { customId, user, guild, channel } = interaction;

    // Botão para abrir ticket
    if (customId === 'create_ticket_panel') {
      // Simula comando !abrir-ticket
      const message = {
        author: user,
        guild,
        channel: interaction.channel,
        reply: (msg) => interaction.reply({ content: msg, ephemeral: true }),
        member: guild.members.cache.get(user.id),
        content: '!abrir-ticket',
        mentions: { members: { first: () => null } }
      };
      const command = client.commands.get('abrir-ticket');
      if (command) await command.execute(message, [], client);
      return;
    }

    // Botão para fechar ticket
    if (customId === 'close_ticket') {
      if (!channel.name.startsWith('ticket-')) return;
      if (!interaction.member.permissions.has('ManageChannels')) {
        return interaction.reply({ content: '❌ Apenas membros da equipe podem fechar tickets!', ephemeral: true });
      }
      const confirmEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🔒 Fechando Ticket')
        .setDescription('Este ticket será deletado em 5 segundos...')
        .setFooter({ text: `Fechado por ${user.tag}` })
        .setTimestamp();
      await interaction.reply({ embeds: [confirmEmbed] });
      setTimeout(async () => {
        try {
          await channel.delete(`Ticket fechado por ${user.tag}`);
        } catch (error) {}
      }, 5000);
      return;
    }
  });
} 