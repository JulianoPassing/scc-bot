import { EmbedBuilder } from 'discord.js';
import { createTicketChannel, getNextTicketNumber } from '../utils/ticketManager.js';
import config from '../config.json' with { type: 'json' };

const SEGURANCA_CATEGORY_ID = '1378778140528087191';

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
      // Cria o canal na categoria correta
      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: 0, // GuildText
        parent: SEGURANCA_CATEGORY_ID,
        topic: `Ticket de Segurança #${ticketNumber} | ${user.tag} | Sem motivo especificado`,
        permissionOverwrites: [
          { id: guild.roles.everyone, deny: ['ViewChannel'] },
          { id: user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles', 'EmbedLinks'] }
        ]
      });
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

    // Fechar Ticket
    if (customId === 'close_ticket') {
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
          await interaction.channel.delete(`Ticket fechado por ${user.tag}`);
        } catch (error) {}
      }, 5000);
      return;
    }
    // Assumir Ticket
    if (customId === 'assumir_ticket') {
      if (!member.roles.cache.has(config.default.staffRoleId)) {
        return interaction.reply({ content: '❌ Apenas membros da equipe podem assumir tickets!', ephemeral: true });
      }
      await interaction.reply({ content: `🫡 <@${user.id}> assumiu o ticket!`, ephemeral: false });
      return;
    }
    // Adicionar Membro
    if (customId === 'adicionar_membro') {
      await interaction.reply({ content: 'Mencione o usuário a ser adicionado ao ticket.', ephemeral: true });
      return;
    }
    // Avisar Membro
    if (customId === 'avisar_membro') {
      await interaction.reply({ content: 'A equipe foi avisada sobre este ticket.', ephemeral: false });
      return;
    }
    // Renomear Ticket mantendo emoji da categoria
    if (customId === 'renomear_ticket') {
      const name = interaction.channel.name;
      const emoji = name.startsWith('seg-') ? '🛡️' : '';
      await interaction.showModal({
        customId: 'modal_renomear_ticket',
        title: 'Renomear Ticket',
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: 'novo_nome',
                label: 'Novo nome do ticket',
                style: 1,
                min_length: 1,
                max_length: 32,
                required: true
              }
            ]
          }
        ]
      });
      return;
    }
    // Timer 24h
    if (customId === 'timer_24h') {
      await interaction.reply({ content: '⏰ Timer de 24h iniciado para este ticket.', ephemeral: false });
      return;
    }
    // Handler do modal de renomear
    if (interaction.isModalSubmit() && interaction.customId === 'modal_renomear_ticket') {
      const novoNome = interaction.fields.getTextInputValue('novo_nome');
      const name = interaction.channel.name;
      const emoji = name.startsWith('seg-') ? '🛡️' : '';
      let finalName = novoNome;
      if (!finalName.startsWith(emoji)) finalName = emoji + finalName;
      await interaction.channel.setName(finalName);
      await interaction.reply({ content: `✏️ Nome do ticket alterado para: ${finalName}`, ephemeral: true });
      return;
    }
  });
} 