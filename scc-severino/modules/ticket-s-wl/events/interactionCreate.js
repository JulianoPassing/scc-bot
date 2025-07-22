import { EmbedBuilder } from 'discord.js';
import { createTicketChannel, getNextTicketNumber } from '../utils/ticketManager.js';
import config from '../config.json' assert { type: 'json' };

export default async function(client) {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    const { customId, user, guild, channel } = interaction;

    // Botão para abrir ticket de segurança
    if (customId === 'create_ticket_panel') {
      // Verifica se já existe ticket
      const existing = guild.channels.cache.find(
        c => c.name === `seg-${user.username.toLowerCase()}`
      );
      if (existing) {
        return interaction.reply({ content: '❌ Você já possui um ticket aberto: ' + existing.toString(), ephemeral: true });
      }
      const ticketNumber = await getNextTicketNumber();
      const channelName = `seg-${user.username.toLowerCase()}`;
      const ticketChannel = await createTicketChannel(guild, channelName, user, 'Sem motivo especificado', ticketNumber);
      const welcomeEmbed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle(`🛡️ Ticket de Segurança #${ticketNumber}`)
        .setDescription(`Olá ${user}, obrigado por abrir um ticket de segurança.`)
        .addFields(
          { name: 'Motivo', value: 'Sem motivo especificado' },
          { name: 'Instruções', value: 'Descreva seu problema. A equipe irá te atender em breve.' }
        )
        .setFooter({ text: 'Use o botão abaixo para fechar este ticket quando resolvido.' })
        .setTimestamp();
      await ticketChannel.send({
        content: `${user}`,
        embeds: [welcomeEmbed],
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                custom_id: 'close_ticket',
                label: 'Fechar Ticket',
                style: 4,
                emoji: { name: '🔒' }
              }
            ]
          }
        ]
      });
      await interaction.reply({ content: '✅ Ticket criado com sucesso!', ephemeral: true });
      return;
    }

    // Botão para fechar ticket de segurança
    if (customId === 'close_ticket') {
      if (!channel.name.startsWith('seg-')) return;
      const member = guild.members.cache.get(user.id);
      const hasStaffRole = member.roles.cache.has(config.default.staffRoleId);
      if (!hasStaffRole) {
        return interaction.reply({ content: '❌ Apenas membros da equipe podem fechar tickets de segurança!', ephemeral: true });
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