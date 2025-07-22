import { EmbedBuilder, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, ChannelType, PermissionFlagsBits, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createTicketChannel, getNextTicketNumber } from '../utils/ticketManager.js';
import config from '../config.json' with { type: 'json' };

const SEGURANCA_CATEGORY_ID = '1378778140528087191';

export const name = 'interactionCreate';
export const execute = async function(interaction) {
  try {
    if (!interaction.isButton()) return;
    const { customId, user, guild } = interaction;
    // Painel de segurança: abrir modal para motivo
    if (customId === 'create_ticket_panel') {
      const modal = new ModalBuilder()
        .setCustomId('modal_ticket_seguranca_motivo')
        .setTitle('Abrir Ticket de Segurança')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('motivo')
              .setLabel('Descreva o motivo do ticket')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setMaxLength(200)
          )
        );
      await interaction.showModal(modal);
      return;
    }
    // Handler do modal de motivo
    if (interaction.isModalSubmit() && interaction.customId === 'modal_ticket_seguranca_motivo') {
      const motivo = interaction.fields.getTextInputValue('motivo');
      // Verifica se já existe ticket
      const existing = guild.channels.cache.find(
        c => c.name === `seg-${user.username.toLowerCase()}`
      );
      if (existing) {
        await interaction.reply({ content: '❌ Você já possui um ticket aberto: ' + existing.toString(), flags: 64 });
        return;
      }
      // Cria o canal na categoria correta, herdando permissões
      let ticketChannel;
      try {
        const ticketNumber = await getNextTicketNumber();
        ticketChannel = await guild.channels.create({
          name: `seg-${user.username.toLowerCase()}`,
          type: ChannelType.GuildText,
          parent: SEGURANCA_CATEGORY_ID,
          topic: `Ticket de Segurança | ${user.tag} | ${motivo}`
          // Não passar permissionOverwrites nem inheritPermissions
        });
      } catch (err) {
        console.error('Erro ao criar canal do ticket de segurança:', err, 'Categoria:', SEGURANCA_CATEGORY_ID, 'Guild:', guild.id);
        await interaction.reply({ content: `❌ Erro ao criar o canal do ticket. Detalhe: ${err.message || err}`, flags: 64 });
        return;
      }
      // Notificação
      await ticketChannel.send({ content: `🔔 <@${user.id}> abriu um ticket de segurança! Equipe notificada:` });
      // Embed do painel de ticket aberto
      const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('🛡️ Ticket de Segurança Aberto')
        .setDescription(`Olá <@${user.id}>, obrigado por entrar em contato!\n\nSua solicitação foi registrada e nossa equipe de segurança irá te atender o mais breve possível.\n\n**Motivo:** ${motivo}`)
        .addFields(
          { name: 'Status', value: '⏳ Aguardando atendimento', inline: true },
          { name: 'Tempo de Resposta', value: 'Até 72h úteis', inline: true }
        )
        .setFooter({ text: 'Sistema de Segurança • Confidencialidade garantida' })
        .setTimestamp();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('close_ticket').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
      );
      await ticketChannel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: `✅ Ticket de segurança criado em <#${ticketChannel.id}>!`, flags: 64 });
      return;
    }
    // Fechar Ticket de segurança (mantém o restante do handler)
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
  } catch (error) {
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Ocorreu um erro ao processar sua interação.', flags: 64 });
      }
    } catch (e) {}
    console.error('Erro no handler de interactionCreate (segurança):', error);
  }
}; 