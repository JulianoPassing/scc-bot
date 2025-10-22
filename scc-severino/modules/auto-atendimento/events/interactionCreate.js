const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const config = require('../config.json');
const conversationManager = require('../utils/conversationManager');

module.exports = {
  async execute(interaction, client) {
    // Ignora se não for um botão
    if (!interaction.isButton()) return;

    // Verifica se é uma interação do auto-atendimento
    if (!interaction.customId.startsWith('autoatend_')) return;

    // Trata abertura de novo ticket
    if (interaction.customId === 'autoatend_limbo' || interaction.customId === 'autoatend_guincho') {
      await handleTicketCreation(interaction, client);
      return;
    }

    // Trata botões de verificação (Sim/Não)
    if (interaction.customId.startsWith('autoatend_verify_')) {
      await handleVerification(interaction, client);
      return;
    }
  }
};

/**
 * Cria um novo ticket de auto-atendimento
 */
async function handleTicketCreation(interaction, client) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const type = interaction.customId.replace('autoatend_', '');
    const categoryConfig = config.categories[type];

    if (!categoryConfig) {
      return interaction.editReply('❌ Tipo de atendimento inválido.');
    }

    const guild = client.guilds.cache.get(config.serverId);
    if (!guild) {
      return interaction.editReply('❌ Servidor não encontrado.');
    }

    const category = guild.channels.cache.get(config.categoryId);
    if (!category) {
      return interaction.editReply('❌ Categoria não encontrada.');
    }

    // Cria o canal do ticket
    const username = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
    const channelName = `${categoryConfig.channelPrefix}${username}`;

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        {
          id: client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageChannels,
          ],
        },
      ],
    });

    // Cria a conversação
    conversationManager.createConversation(ticketChannel.id, interaction.user.id, type);

    // Envia mensagem inicial
    const initialEmbed = new EmbedBuilder()
      .setTitle(`${categoryConfig.emoji} Auto-Atendimento: ${categoryConfig.name}`)
      .setDescription(
        `Olá <@${interaction.user.id}>, boa tarde! Espero que possa lhe ajudar.\n\n` +
        '**Por favor, me conte o que aconteceu com o máximo de detalhes possível.**'
      )
      .setColor('#00FF00')
      .setTimestamp();

    await ticketChannel.send({
      content: `<@${interaction.user.id}>`,
      embeds: [initialEmbed]
    });

    // Atualiza o estado da conversação
    conversationManager.updateStep(ticketChannel.id, 'waiting_description');

    await interaction.editReply({
      content: `✅ Ticket de auto-atendimento criado: <#${ticketChannel.id}>`
    });

  } catch (error) {
    console.error('[Auto-Atendimento] Erro ao criar ticket:', error);
    await interaction.editReply('❌ Erro ao criar o ticket de auto-atendimento.');
  }
}

/**
 * Lida com as respostas de verificação (Sim/Não)
 */
async function handleVerification(interaction, client) {
  try {
    await interaction.deferUpdate();

    const conversation = conversationManager.getConversation(interaction.channel.id);
    if (!conversation) {
      return;
    }

    // Verifica se é o usuário correto
    if (conversation.userId !== interaction.user.id) {
      return interaction.followUp({
        content: '❌ Apenas o usuário que abriu o ticket pode responder.',
        ephemeral: true
      });
    }

    const answer = interaction.customId.replace('autoatend_verify_', ''); // 'yes' ou 'no'

    if (answer === 'yes') {
      // Problema resolvido
      const embed = new EmbedBuilder()
        .setTitle('✅ Atendimento Concluído')
        .setDescription(
          'Fico feliz em ter ajudado! Seu problema foi resolvido.\n\n' +
          '**Este ticket ficará aberto para análise da nossa equipe.**'
        )
        .setColor('#00FF00')
        .setTimestamp();

      await interaction.channel.send({ embeds: [embed] });

      // Remove a conversação
      conversationManager.removeConversation(interaction.channel.id);

    } else {
      // Problema não resolvido - marca suporte
      const embed = new EmbedBuilder()
        .setTitle('⚠️ Suporte Humano Necessário')
        .setDescription(
          'Entendo, vou chamar nossa equipe de suporte para ajudá-lo.\n\n' +
          `<@&${config.supportRoleId}>, este usuário precisa de assistência adicional.`
        )
        .setColor('#FFA500')
        .setTimestamp();

      await interaction.channel.send({
        content: `<@&${config.supportRoleId}>`,
        embeds: [embed]
      });

      // Remove a conversação
      conversationManager.removeConversation(interaction.channel.id);
    }

    // Desabilita os botões da mensagem anterior
    const message = interaction.message;
    const disabledRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('autoatend_verify_yes_disabled')
          .setLabel('Sim')
          .setStyle(ButtonStyle.Success)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('autoatend_verify_no_disabled')
          .setLabel('Não')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(true)
      );

    await message.edit({ components: [disabledRow] });

  } catch (error) {
    console.error('[Auto-Atendimento] Erro ao processar verificação:', error);
  }
}

