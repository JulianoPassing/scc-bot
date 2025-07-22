import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } from 'discord.js';

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

export default async function(client) {
  client.on('interactionCreate', async (interaction) => {
    try {
      if (!interaction.isButton()) return;
      const { customId, user, guild } = interaction;
      if (!customId.startsWith('ticket_')) return;
      const tipo = customId.replace('ticket_', '');
      const categoria = CATEGORY_INFO[tipo];
      const categoriaId = CATEGORY_IDS[tipo];
      if (!categoria || !categoriaId) {
        console.error('Categoria inválida:', tipo, categoria, categoriaId);
        await interaction.reply({ content: '❌ Categoria inválida ou não configurada.', ephemeral: true });
        return;
      }
      // Cria canal do ticket
      const channelName = `${tipo}-${user.username.toLowerCase()}-${Date.now().toString().slice(-4)}`;
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
          await interaction.reply({ content: '❌ Erro ao criar o canal do ticket. Verifique se a categoria existe, se o bot tem permissão e se o ID está correto.', ephemeral: true });
        }
        return;
      }
      // Notificação
      await ticketChannel.send({ content: `🔔 <@${user.id}> abriu um ticket! Equipe notificada:` });
      // Embed do painel de ticket aberto
      const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle(`📑 Ticket Aberto - ${categoria.emoji} ${categoria.nome}`)
        .setDescription(`Olá <@${user.id}>, obrigado por entrar em contato!\n\nSua solicitação foi registrada e nossa equipe irá te atender o mais breve possível. Acompanhe o status do seu ticket por aqui.`)
        .addFields(
          { name: 'Categoria', value: `${categoria.emoji} ${categoria.nome}`, inline: true },
          { name: 'Status', value: '⏳ Aguardando atendimento', inline: true },
          { name: 'Tempo de Resposta', value: 'Até 72h úteis', inline: true },
          { name: 'Assunto', value: '-', inline: false },
          { name: 'Descrição', value: categoria.desc, inline: false }
        )
        .setImage('https://i.imgur.com/ShgYL6s.png')
        .setFooter({ text: 'StreetCarClub • Atendimento de Qualidade | ™ Street CarClub © All rights reserved', iconURL: null })
        .setTimestamp();
      // Botões do ticket aberto
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
      await interaction.reply({ content: `✅ Ticket criado em <#${ticketChannel.id}>!`, ephemeral: true });

      // Fechar Ticket
      if (customId === 'fechar_ticket') {
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
            await interaction.channel.delete(`Ticket fechado por ${user.tag}`);
          } catch (error) {}
        }, 5000);
        return;
      }
      // Assumir Ticket
      if (customId === 'assumir_ticket') {
        if (!interaction.member.permissions.has('ManageChannels')) {
          return interaction.reply({ content: '❌ Apenas membros da equipe podem assumir tickets!', ephemeral: true });
        }
        await interaction.reply({ content: `🫡 <@${user.id}> assumiu o ticket!`, ephemeral: false });
        return;
      }
      // Adicionar Membro
      if (customId === 'adicionar_membro') {
        await interaction.reply({ content: 'Mencione o usuário a ser adicionado ao ticket.', ephemeral: true });
        // Lógica de adicionar membro pode ser implementada via comando ou modal.
        return;
      }
      // Avisar Membro
      if (customId === 'avisar_membro') {
        await interaction.reply({ content: 'A equipe foi avisada sobre este ticket.', ephemeral: false });
        return;
      }
      // Renomear Ticket mantendo emoji da categoria
      if (customId === 'renomear_ticket') {
        // Detecta emoji da categoria pelo nome do canal
        const name = interaction.channel.name;
        const emoji = name.startsWith('suporte-') ? '📁' :
          name.startsWith('bugs-') ? '🦠' :
          name.startsWith('boost-') ? '🚀' :
          name.startsWith('casas-') ? '🏠' :
          name.startsWith('doacoes-') ? '💎' :
          name.startsWith('denuncias-') ? '⚠️' : '';
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
        // Detecta emoji da categoria pelo nome antigo
        const name = interaction.channel.name;
        const emoji = name.startsWith('suporte-') ? '📁' :
          name.startsWith('bugs-') ? '🦠' :
          name.startsWith('boost-') ? '🚀' :
          name.startsWith('casas-') ? '🏠' :
          name.startsWith('doacoes-') ? '💎' :
          name.startsWith('denuncias-') ? '⚠️' : '';
        let finalName = novoNome;
        if (!finalName.startsWith(emoji)) finalName = emoji + finalName;
        await interaction.channel.setName(finalName);
        await interaction.reply({ content: `✏️ Nome do ticket alterado para: ${finalName}`, ephemeral: true });
        return;
      }
    } catch (error) {
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ Ocorreu um erro ao processar sua interação.', ephemeral: true });
        }
      } catch (e) {}
      console.error('Erro no handler de interactionCreate:', error);
    }
  });
} 