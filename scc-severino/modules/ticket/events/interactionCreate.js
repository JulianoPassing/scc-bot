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
        // Abrir modal para motivo do fechamento
        await interaction.showModal(
          new ModalBuilder()
            .setCustomId('modal_motivo_fechamento')
            .setTitle('Fechar Ticket - Motivo')
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('motivo')
                  .setLabel('Motivo do fechamento')
                  .setStyle(TextInputStyle.Paragraph)
                  .setRequired(true)
                  .setMaxLength(200)
              )
            )
        );
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
        // Busca a menção na mensagem de notificação de abertura do ticket
        const channel = interaction.channel;
        const messages = await channel.messages.fetch({ limit: 10 });
        const notifyMsg = messages.find(m => m.content && m.content.includes('abriu um ticket!'));
        let autorId = null;
        if (notifyMsg) {
          const match = notifyMsg.content.match(/<@!?([0-9]+)>/);
          if (match) autorId = match[1];
        }
        if (autorId) {
          const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('🔔 Atualização do seu Ticket')
            .setDescription('Olá! A equipe foi avisada sobre o seu ticket e em breve alguém irá te atender. Fique atento às mensagens no canal do ticket!')
            .setFooter({ text: 'StreetCarClub • Atendimento de Qualidade' })
            .setTimestamp();
          try {
            const userObj = await interaction.client.users.fetch(autorId);
            await userObj.send({ embeds: [embed] });
            await interaction.reply({ content: '🔔 O criador do ticket foi avisado com uma mensagem profissional no privado.', flags: 64 });
          } catch (e) {
            await interaction.reply({ content: '❌ Não foi possível enviar DM para o criador do ticket.', flags: 64 });
          }
        } else {
          await interaction.reply({ content: '❌ Não foi possível identificar o criador do ticket.', flags: 64 });
        }
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
        // Cria embed com botão de cancelar
        const embed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('⏰ Timer de 24h Iniciado')
          .setDescription('Um timer de 24h foi iniciado para este ticket. Se não for cancelado, o ticket será fechado automaticamente com o motivo "Timer esgotado".')
          .setFooter({ text: 'StreetCarClub • Atendimento de Qualidade' })
          .setTimestamp();
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('cancelar_timer_24h').setLabel('Cancelar Timer').setStyle(ButtonStyle.Danger).setEmoji('❌')
        );
        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: '⏰ Timer de 24h iniciado para este ticket.', flags: 64 });
        // Salva o timer no client para poder cancelar
        if (!interaction.client.timers24h) interaction.client.timers24h = {};
        const timerKey = interaction.channel.id;
        if (interaction.client.timers24h[timerKey]) clearTimeout(interaction.client.timers24h[timerKey]);
        interaction.client.timers24h[timerKey] = setTimeout(async () => {
          try {
            // Fecha o ticket automaticamente
            const motivo = 'Timer esgotado';
            // Gerar transcript visual
            let allMessages = [];
            let lastId;
            while (true) {
              const options = { limit: 100 };
              if (lastId) options.before = lastId;
              const messages = await interaction.channel.messages.fetch(options);
              allMessages = allMessages.concat(Array.from(messages.values()));
              if (messages.size < 100) break;
              lastId = messages.last().id;
            }
            const sorted = allMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
            let transcript = '';
            for (const msg of sorted) {
              const time = `<t:${Math.floor(msg.createdTimestamp/1000)}:t>`;
              let line = `**${msg.author.tag}** [${time}]: ${msg.content}`;
              if (msg.attachments && msg.attachments.size > 0) {
                for (const att of msg.attachments.values()) {
                  line += `\n[Anexo: ${att.name}](${att.url})`;
                }
              }
              if (msg.embeds && msg.embeds.length > 0) {
                for (const emb of msg.embeds) {
                  if (emb.url) line += `\n[Embed: ${emb.url}]`;
                  if (emb.title) line += `\nTítulo do Embed: ${emb.title}`;
                  if (emb.description) line += `\nDescrição do Embed: ${emb.description}`;
                }
              }
              if (msg.stickers && msg.stickers.size > 0) {
                for (const sticker of msg.stickers.values()) {
                  line += `\n[Sticker: ${sticker.name}]`;
                }
              }
              if (msg.reference && msg.reference.messageId) {
                line += `\n↪️ Em resposta a mensagem ID: ${msg.reference.messageId}`;
              }
              transcript += line + '\n';
            }
            const embedLog = new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('📑 Ticket Fechado (Timer)')
              .setDescription(`Ticket fechado automaticamente após 24h.\n**Motivo:** ${motivo}`)
              .addFields({ name: 'Canal', value: `<#${interaction.channel.id}>`, inline: true })
              .setTimestamp();
            const logChannel = await interaction.guild.channels.fetch('1386491920313745418').catch(() => null);
            if (logChannel) {
              await logChannel.send({ embeds: [embedLog] });
              if (transcript.length > 1900) {
                for (let i = 0; i < transcript.length; i += 1900) {
                  await logChannel.send('```markdown\n' + transcript.slice(i, i + 1900) + '\n```');
                }
              } else {
                await logChannel.send('```markdown\n' + transcript + '\n```');
              }
            }
            await interaction.channel.send('⏰ Timer de 24h esgotado. O ticket será fechado automaticamente.');
            setTimeout(async () => {
              try {
                await interaction.channel.delete('Ticket fechado automaticamente (Timer esgotado)');
              } catch (error) {}
            }, 5000);
          } catch (e) {}
        }, 24 * 60 * 60 * 1000);
        return;
      }
      if (customId === 'cancelar_timer_24h') {
        if (interaction.client.timers24h && interaction.client.timers24h[interaction.channel.id]) {
          clearTimeout(interaction.client.timers24h[interaction.channel.id]);
          delete interaction.client.timers24h[interaction.channel.id];
          // Editar a mensagem do timer para mostrar cancelamento e remover botão
          const msgs = await interaction.channel.messages.fetch({ limit: 10 });
          const timerMsg = msgs.find(m => m.embeds.length && m.embeds[0].title && m.embeds[0].title.includes('Timer de 24h Iniciado'));
          if (timerMsg) {
            const embed = EmbedBuilder.from(timerMsg.embeds[0])
              .setColor('#43B581')
              .setTitle('⏹️ Timer de 24h Cancelado')
              .setDescription('O timer de 24h foi cancelado para este ticket. O ticket não será fechado automaticamente.');
            await timerMsg.edit({ embeds: [embed], components: [] });
          }
          await interaction.reply({ content: '❌ Timer de 24h cancelado para este ticket.', flags: 64 });
        } else {
          await interaction.reply({ content: '❌ Não há timer ativo para este ticket.', flags: 64 });
        }
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
    // Handler do modal de motivo de fechamento
    if (interaction.isModalSubmit() && interaction.customId === 'modal_motivo_fechamento') {
      const motivo = interaction.fields.getTextInputValue('motivo');
      const user = interaction.user;
      const channel = interaction.channel;
      // Buscar todas as mensagens do canal (transcript completo)
      let allMessages = [];
      let lastId;
      while (true) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;
        const messages = await channel.messages.fetch(options);
        allMessages = allMessages.concat(Array.from(messages.values()));
        if (messages.size < 100) break;
        lastId = messages.last().id;
      }
      const sorted = allMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
      let transcript = '';
      for (const msg of sorted) {
        const time = `<t:${Math.floor(msg.createdTimestamp/1000)}:t>`;
        let line = `**${msg.author.tag}** [${time}]: ${msg.content}`;
        // Anexos
        if (msg.attachments && msg.attachments.size > 0) {
          for (const att of msg.attachments.values()) {
            line += `\n[Anexo: ${att.name}](${att.url})`;
          }
        }
        // Embeds
        if (msg.embeds && msg.embeds.length > 0) {
          for (const emb of msg.embeds) {
            if (emb.url) line += `\n[Embed: ${emb.url}]`;
            if (emb.title) line += `\nTítulo do Embed: ${emb.title}`;
            if (emb.description) line += `\nDescrição do Embed: ${emb.description}`;
          }
        }
        // Stickers
        if (msg.stickers && msg.stickers.size > 0) {
          for (const sticker of msg.stickers.values()) {
            line += `\n[Sticker: ${sticker.name}]`;
          }
        }
        // Reply
        if (msg.reference && msg.reference.messageId) {
          line += `\n↪️ Em resposta a mensagem ID: ${msg.reference.messageId}`;
        }
        transcript += line + '\n';
      }
      // Embed visual para o log
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('📑 Ticket Fechado')
        .setDescription(`Ticket fechado por <@${user.id}>\n**Motivo:** ${motivo}`)
        .addFields({ name: 'Canal', value: `<#${channel.id}>`, inline: true })
        .setTimestamp();
      // Enviar para canal de logs
      const logChannel = await interaction.guild.channels.fetch('1386491920313745418').catch(() => null);
      if (logChannel) {
        await logChannel.send({ embeds: [embed] });
        if (transcript.length > 1900) {
          for (let i = 0; i < transcript.length; i += 1900) {
            await logChannel.send('```markdown\n' + transcript.slice(i, i + 1900) + '\n```');
          }
        } else {
          await logChannel.send('```markdown\n' + transcript + '\n```');
        }
      }
      await interaction.reply({ content: '✅ Ticket fechado e transcript enviado para a staff!', flags: 64 });
      setTimeout(async () => {
        try {
          await channel.delete(`Ticket fechado por ${user.tag}`);
        } catch (error) {}
      }, 5000);
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