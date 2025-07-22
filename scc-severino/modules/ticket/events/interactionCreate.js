import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

const CATEGORY_IDS = {
  suporte: '1386490182085382294',
  bugs: '1386490279384846418',
  boost: '1386490600353828884',
  casas: '1386490752485294150',
  doacoes: '1386490511606419578',
  denuncias: '1386490428404138054'
};
const CATEGORY_INFO = {
  suporte: { emoji: '📁', nome: 'Suporte', desc: 'Suporte técnico e ajuda geral' },
  bugs: { emoji: '🦠', nome: 'Reportar Bugs', desc: 'Reportar erros e problemas técnicos' },
  boost: { emoji: '🚀', nome: 'Boost', desc: 'Suporte para membros boosters' },
  casas: { emoji: '🏠', nome: 'Casas', desc: 'Questões relacionadas a casas e propriedades' },
  doacoes: { emoji: '💎', nome: 'Doações', desc: 'Assuntos relacionados a doações' },
  denuncias: { emoji: '⚠️', nome: 'Denúncias', desc: 'Reportar infrações e problemas de conduta' }
};

export const name = 'interactionCreate';
export const execute = async function(interaction) {
  try {
    if (interaction.isButton()) {
      const { customId, user, guild } = interaction;
      // Painel principal: abrir modal para assunto
      if (customId.startsWith('ticket_')) {
        const tipo = customId.replace('ticket_', '');
        const categoria = CATEGORY_INFO[tipo];
        if (!categoria) {
          await interaction.reply({ content: '❌ Categoria inválida ou não configurada.', flags: 64 });
          return;
        }
        const modal = new ModalBuilder()
          .setCustomId(`modal_ticket_assunto_${tipo}`)
          .setTitle(`Abrir Ticket - ${categoria.nome}`)
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('assunto')
                .setLabel('Assunto do ticket')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(64)
            )
          );
        await interaction.showModal(modal);
        return;
      }
      // Botões do painel de ticket aberto
      if (customId === 'fechar_ticket') {
        if (!interaction.member.permissions.has('ManageChannels')) {
          return interaction.reply({ content: '❌ Apenas membros da equipe podem fechar tickets!', flags: 64 });
        }
        const confirmEmbed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('🔒 Fechando Ticket')
          .setDescription('Este ticket será deletado em 5 segundos...')
          .setFooter({ text: `Fechado por ${user.tag}` })
          .setTimestamp();
        await interaction.reply({ embeds: [confirmEmbed], flags: 64 });
        setTimeout(async () => {
          try {
            await interaction.channel.delete(`Ticket fechado por ${user.tag}`);
          } catch (error) {}
        }, 5000);
        return;
      }
      if (customId === 'assumir_ticket') {
        if (!interaction.member.permissions.has('ManageChannels')) {
          return interaction.reply({ content: '❌ Apenas membros da equipe podem assumir tickets!', flags: 64 });
        }
        // Atualiza embed para status 'Assumido'
        const msg = await interaction.channel.messages.fetch({ limit: 10 }).then(msgs => msgs.find(m => m.embeds.length));
        if (msg) {
          const embed = EmbedBuilder.from(msg.embeds[0]);
          embed.spliceFields(1, 1, { name: 'Status', value: `🫡 Assumido por <@${user.id}>`, inline: true });
          await msg.edit({ embeds: [embed] });
        }
        await interaction.reply({ content: `🫡 <@${user.id}> assumiu o ticket!`, flags: 0 });
        return;
      }
      if (customId === 'adicionar_membro') {
        await interaction.showModal(
          new ModalBuilder()
            .setCustomId('modal_adicionar_membro')
            .setTitle('Adicionar Membro ao Ticket')
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('membro')
                  .setLabel('Mencione o usuário (@usuario)')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(true)
              )
            )
        );
        return;
      }
      if (customId === 'avisar_membro') {
        await interaction.showModal(
          new ModalBuilder()
            .setCustomId('modal_avisar_membro')
            .setTitle('Avisar Membro')
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('membro')
                  .setLabel('Mencione o usuário (@usuario)')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(true)
              )
            )
        );
        return;
      }
      if (customId === 'renomear_ticket') {
        const name = interaction.channel.name;
        const emoji = name.startsWith('📁suporte-') ? '📁' :
          name.startsWith('🦠bugs-') ? '🦠' :
          name.startsWith('🚀boost-') ? '🚀' :
          name.startsWith('🏠casas-') ? '🏠' :
          name.startsWith('💎doacoes-') ? '💎' :
          name.startsWith('⚠️denuncias-') ? '⚠️' : '';
        await interaction.showModal(
          new ModalBuilder()
            .setCustomId('modal_renomear_ticket')
            .setTitle('Renomear Ticket')
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('novo_nome')
                  .setLabel('Novo nome do ticket')
                  .setStyle(TextInputStyle.Short)
                  .setMinLength(1)
                  .setMaxLength(32)
                  .setRequired(true)
              )
            )
        );
        return;
      }
      if (customId === 'timer_24h') {
        await interaction.reply({ content: '⏰ Timer de 24h iniciado para este ticket. Você será avisado ao final do período.', flags: 0 });
        setTimeout(async () => {
          try {
            await interaction.channel.send('⏰ 24h se passaram desde o início do timer neste ticket!');
          } catch (e) {}
        }, 24 * 60 * 60 * 1000);
        return;
      }
    }
    // Handler do modal de assunto ao abrir ticket
    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_ticket_assunto_')) {
      const tipo = interaction.customId.replace('modal_ticket_assunto_', '');
      const categoria = CATEGORY_INFO[tipo];
      const categoriaId = CATEGORY_IDS[tipo];
      if (!categoria || !categoriaId) {
        await interaction.reply({ content: '❌ Categoria inválida ou não configurada.', flags: 64 });
        return;
      }
      const assunto = interaction.fields.getTextInputValue('assunto');
      const user = interaction.user;
      const guild = interaction.guild;
      const emoji = categoria.emoji;
      const tipoNome = tipo;
      const channelName = `${emoji}${tipoNome}-${user.username.toLowerCase()}`;
      let ticketChannel;
      try {
        ticketChannel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: categoriaId,
          topic: `Ticket de ${categoria.nome} | ${user.tag}`,
          permissionOverwrites: [
            { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
            { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] }
          ]
        });
      } catch (err) {
        console.error('Erro ao criar canal do ticket:', err, 'Categoria:', categoriaId, 'Guild:', guild.id);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ Erro ao criar o canal do ticket. Verifique se a categoria existe, se o bot tem permissão e se o ID está correto.', flags: 64 });
        }
        return;
      }
      await ticketChannel.send({ content: `🔔 <@${user.id}> abriu um ticket! Equipe notificada:` });
      const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle(`📑 Ticket Aberto - ${categoria.emoji} ${categoria.nome}`)
        .setDescription(`Olá <@${user.id}>, obrigado por entrar em contato!\n\nSua solicitação foi registrada e nossa equipe irá te atender o mais breve possível. Acompanhe o status do seu ticket por aqui.`)
        .addFields(
          { name: 'Categoria', value: `${categoria.emoji} ${categoria.nome}`, inline: true },
          { name: 'Status', value: '⏳ Aguardando atendimento', inline: true },
          { name: 'Tempo de Resposta', value: 'Até 72h úteis', inline: true },
          { name: 'Assunto', value: assunto, inline: false },
          { name: 'Descrição', value: categoria.desc, inline: false }
        )
        .setImage('https://i.imgur.com/ShgYL6s.png')
        .setFooter({ text: 'StreetCarClub • Atendimento de Qualidade | ™ Street CarClub © All rights reserved', iconURL: null })
        .setTimestamp();
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar Ticket').setStyle(ButtonStyle.Secondary).setEmoji('🔒'),
        new ButtonBuilder().setCustomId('assumir_ticket').setLabel('Assumir Ticket').setStyle(ButtonStyle.Primary).setEmoji('🫡'),
        new ButtonBuilder().setCustomId('adicionar_membro').setLabel('Adicionar Membro').setStyle(ButtonStyle.Primary).setEmoji('➕')
      );
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('avisar_membro').setLabel('Avisar Membro').setStyle(ButtonStyle.Primary).setEmoji('🔔'),
        new ButtonBuilder().setCustomId('renomear_ticket').setLabel('Renomear Ticket').setStyle(ButtonStyle.Primary).setEmoji('✏️'),
        new ButtonBuilder().setCustomId('timer_24h').setLabel('Timer 24h').setStyle(ButtonStyle.Primary).setEmoji('⏰')
      );
      await ticketChannel.send({ embeds: [embed], components: [row1, row2] });
      await interaction.reply({ content: `✅ Ticket criado em <#${ticketChannel.id}>!`, flags: 64 });
      return;
    }
    // Handler do modal de renomear
    if (interaction.isModalSubmit() && interaction.customId === 'modal_renomear_ticket') {
      const novoNome = interaction.fields.getTextInputValue('novo_nome');
      const name = interaction.channel.name;
      const emoji = name.startsWith('📁suporte-') ? '📁' :
        name.startsWith('🦠bugs-') ? '🦠' :
        name.startsWith('🚀boost-') ? '🚀' :
        name.startsWith('🏠casas-') ? '🏠' :
        name.startsWith('💎doacoes-') ? '💎' :
        name.startsWith('⚠️denuncias-') ? '⚠️' : '';
      let finalName = novoNome;
      if (!finalName.startsWith(emoji)) finalName = emoji + finalName;
      await interaction.channel.setName(finalName);
      await interaction.reply({ content: `✏️ Nome do ticket alterado para: ${finalName}`, flags: 64 });
      return;
    }
    // Handler do modal de adicionar membro
    if (interaction.isModalSubmit() && interaction.customId === 'modal_adicionar_membro') {
      const membro = interaction.fields.getTextInputValue('membro');
      const match = membro.match(/<@!?([0-9]+)>/);
      if (!match) {
        await interaction.reply({ content: '❌ Mencione um usuário válido.', flags: 64 });
        return;
      }
      const userId = match[1];
      try {
        await interaction.channel.permissionOverwrites.create(userId, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        });
        await interaction.reply({ content: `➕ <@${userId}> adicionado ao ticket!`, flags: 0 });
      } catch (e) {
        await interaction.reply({ content: '❌ Erro ao adicionar usuário ao ticket.', flags: 64 });
      }
      return;
    }
    // Handler do modal de avisar membro
    if (interaction.isModalSubmit() && interaction.customId === 'modal_avisar_membro') {
      const membro = interaction.fields.getTextInputValue('membro');
      const match = membro.match(/<@!?([0-9]+)>/);
      if (!match) {
        await interaction.reply({ content: '❌ Mencione um usuário válido.', flags: 64 });
        return;
      }
      const userId = match[1];
      await interaction.channel.send(`🔔 <@${userId}>, você foi avisado neste ticket!`);
      await interaction.reply({ content: `🔔 <@${userId}> foi avisado.`, flags: 0 });
      return;
    }
  } catch (error) {
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Ocorreu um erro ao processar sua interação.', flags: 64 });
      }
    } catch (e) {}
    console.error('Erro no handler de interactionCreate:', error);
  }
}; 