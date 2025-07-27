import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { CATEGORY_CONFIG, LOG_CHANNEL_ID } from '../config.js';
import { createTicketPermissions, getTicketCategory, createTicketPermissionOverwrites } from '../utils/ticketPermissions.js';

export const name = 'interactionCreate';
export const execute = async function(interaction) {
  try {
    // Verificar se a interação já foi processada
    if (interaction.replied || interaction.deferred) {
      return;
    }

    // Verificar se a interação pertence ao módulo de ticket normal
    const isTicketInteraction = (customId) => {
      const ticketPrefixes = [
        'ticket_', // Botões do painel principal
        'modal_ticket_assunto_', // Modal de assunto
        'fechar_ticket',
        'assumir_ticket', 
        'adicionar_membro',
        'avisar_membro',
        'renomear_ticket',
        'timer_24h',
        'cancelar_timer_24h',
        'modal_motivo_fechamento',
        'modal_adicionar_membro',
        'modal_renomear_ticket_normal'
      ];
      
      return ticketPrefixes.some(prefix => customId.startsWith(prefix));
    };

    if (interaction.isButton()) {
      const { customId, user, guild } = interaction;
      
      // Verificar se é uma interação do módulo de ticket normal
      if (!isTicketInteraction(customId)) {
        return; // Não processar interações de outros módulos
      }
      
      // Painel principal: abrir modal para assunto
      if (customId.startsWith('ticket_')) {
        const tipo = customId.replace('ticket_', '');
        const categoria = CATEGORY_CONFIG[tipo];
        
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
      const painelTicketBotoes = [
        'fechar_ticket',
        'assumir_ticket',
        'adicionar_membro',
        'avisar_membro',
        'renomear_ticket',
        'timer_24h',
        'cancelar_timer_24h'
      ];
      
      if (painelTicketBotoes.includes(customId)) {
        if (!interaction.member.permissions.has('ManageChannels')) {
          await interaction.reply({ content: '❌ Apenas membros da equipe podem usar esta função do painel!', flags: 64 });
          return;
        }
      }
      
      if (customId === 'fechar_ticket') {
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
            .setDescription(
              'Olá! Esta é uma atualização sobre o seu ticket no Street CarClub.\n\n' +
              `Acesse seu ticket aqui: <#${channel.id}>\n\n` +
              'Se a equipe solicitou informações adicionais ou uma resposta, por favor, responda diretamente no canal do ticket para agilizar seu atendimento.\n\n' +
              'Se não for necessário, aguarde o retorno da equipe.\n\n' +
              'Atenciosamente,\nEquipe StreetCarClub'
            )
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
        try {
          const name = interaction.channel.name;
          // Melhorar detecção de ícones para tickets normais
          let emoji = '';
          if (name.startsWith('📁suporte-')) emoji = '📁';
          else if (name.startsWith('🦠bugs-')) emoji = '🦠';
          else if (name.startsWith('🚀boost-')) emoji = '🚀';
          else if (name.startsWith('🏠casas-')) emoji = '🏠';
          else if (name.startsWith('💎doacoes-')) emoji = '💎';
          else if (name.startsWith('⚠️denuncias-')) emoji = '⚠️';
          
          const modal = new ModalBuilder()
            .setCustomId('modal_renomear_ticket_normal')
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
                  .setPlaceholder(`Ex: ${emoji}suporte-novo-nome`)
              )
            );
          
          await interaction.showModal(modal);
        } catch (error) {
          console.error('[TICKET][ERRO renomear_ticket]', error);
          try {
            if (!interaction.replied && !interaction.deferred) {
              await interaction.reply({ content: '❌ Erro ao abrir modal de renomeação.', flags: 64 });
            }
          } catch (e) {}
        }
        return;
      }
      
      if (customId === 'timer_24h') {
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
        
        if (!interaction.client.timers24h) interaction.client.timers24h = {};
        const timerKey = interaction.channel.id;
        if (interaction.client.timers24h[timerKey]) clearTimeout(interaction.client.timers24h[timerKey]);
        interaction.client.timers24h[timerKey] = setTimeout(async () => {
          try {
            const motivo = 'Timer esgotado';
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
            const logChannel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
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
      const categoria = CATEGORY_CONFIG[tipo];
      
      if (!categoria) {
        await interaction.reply({ content: '❌ Categoria inválida ou não configurada.', flags: 64 });
        return;
      }
      
      const assunto = interaction.fields.getTextInputValue('assunto');
      const user = interaction.user;
      const guild = interaction.guild;
      const emoji = categoria.emoji;
      const tipoNome = tipo;
      const channelName = `${emoji}${tipoNome}-${user.username.toLowerCase()}`;
      
      // Verificar se já existe ticket para este usuário
      const existing = guild.channels.cache.find(
        channel => channel.name === channelName
      );
      if (existing) {
        await interaction.reply({ content: '❌ Você já possui um ticket aberto: ' + existing.toString(), flags: 64 });
        return;
      }
      
      let ticketChannel;
      try {
        // Obter categoria (ou null se estiver cheia)
        const parentId = await getTicketCategory(tipo, guild);
        
        // Criar permissões personalizadas usando a nova função
        const permissionOverwrites = await createTicketPermissionOverwrites(tipo, user.id, guild);
        
        ticketChannel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: parentId, // null = criar no topo do servidor
          topic: `Ticket de ${categoria.nome} | ${user.tag} | ${assunto}`,
          permissionOverwrites: permissionOverwrites
        });
        
      } catch (err) {
        console.error('Erro ao criar canal do ticket:', err, 'Categoria:', tipo, 'Guild:', guild.id);
        await interaction.reply({ content: '❌ Erro ao criar o canal do ticket. Verifique se o bot tem permissões adequadas.', flags: 64 });
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
    if (interaction.isModalSubmit() && interaction.customId === 'modal_renomear_ticket_normal') {
      try {
        if (!interaction.member.permissions.has('ManageChannels')) {
          await interaction.reply({ content: '❌ Apenas membros da equipe podem renomear tickets!', flags: 64 });
          return;
        }
        
        const novoNome = interaction.fields.getTextInputValue('novo_nome');
        const name = interaction.channel.name;
        
        // Melhorar detecção de ícones para tickets normais
        let emoji = '';
        if (name.startsWith('📁suporte-')) emoji = '📁';
        else if (name.startsWith('🦠bugs-')) emoji = '🦠';
        else if (name.startsWith('🚀boost-')) emoji = '🚀';
        else if (name.startsWith('🏠casas-')) emoji = '🏠';
        else if (name.startsWith('💎doacoes-')) emoji = '💎';
        else if (name.startsWith('⚠️denuncias-')) emoji = '⚠️';
        
        let finalName = novoNome;
        if (emoji && !finalName.startsWith(emoji)) {
          finalName = emoji + finalName;
        }
        
        await interaction.channel.setName(finalName);
        await interaction.reply({ content: `✏️ Nome do ticket alterado para: ${finalName}`, flags: 64 });
      } catch (error) {
        console.error('[TICKET][ERRO modal_renomear_ticket_normal]', error);
        try {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Erro ao renomear ticket.', flags: 64 });
          }
        } catch (e) {}
      }
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
          ReadMessageHistory: true,
          AttachFiles: true,
          EmbedLinks: true
        });
        await interaction.reply({ content: `➕ <@${userId}> adicionado ao ticket!`, flags: 0 });
      } catch (e) {
        await interaction.reply({ content: '❌ Erro ao adicionar usuário ao ticket.', flags: 64 });
      }
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
      
      // Identificar criador do ticket
      const notifyMsg = sorted.find(m => m.content && m.content.includes('abriu um ticket!'));
      let autorId = null;
      let autorTag = null;
      let autorAvatar = null;
      if (notifyMsg) {
        const match = notifyMsg.content.match(/<@!?([0-9]+)>/);
        if (match) {
          autorId = match[1];
          try {
            const userObj = await interaction.client.users.fetch(autorId);
            autorTag = userObj.tag;
            autorAvatar = userObj.displayAvatarURL();
          } catch {}
        }
      }
      
      // Staff responsável
      const staffTag = user.tag;
      const staffAvatar = user.displayAvatarURL();
      
      // HTML transcript
      let html = `<!DOCTYPE html><html lang='pt-BR'><head><meta charset='UTF-8'><title>Transcript Ticket</title><style>
      body{font-family:sans-serif;background:#18191c;color:#eee;margin:0;padding:0;}
      .header{background:#23272a;padding:20px 30px;display:flex;align-items:center;gap:20px;}
      .header img{border-radius:50%;width:64px;height:64px;}
      .info{margin:20px 30px;}
      .info strong{color:#fff;}
      .msg{background:#23272a;margin:16px 30px;padding:16px 20px;border-radius:8px;box-shadow:0 2px 8px #0002;}
      .msg.staff{border-left:4px solid #43b581;}
      .msg .meta{font-size:13px;color:#aaa;margin-bottom:6px;}
      .msg .content{font-size:15px;white-space:pre-wrap;word-break:break-word;}
      .msg .attachments img{max-width:200px;max-height:120px;margin:4px 0;display:block;}
      .msg .attachments a{color:#00b0f4;text-decoration:underline;display:block;}
      .msg .embed{background:#2f3136;padding:8px 12px;border-radius:6px;margin:8px 0;}
      .msg .reply{color:#faa61a;font-size:13px;}
      .footer{margin:30px 0 0 0;text-align:center;color:#888;font-size:13px;}
      </style></head><body>`;
      
      html += `<div class='header'>`;
      if (autorAvatar) html += `<img src='${autorAvatar}' alt='Criador'>`;
      html += `<div><div><strong>Criador:</strong> ${autorTag ? autorTag : autorId || 'Desconhecido'}</div>`;
      html += `<div><strong>Staff responsável:</strong> ${staffTag}</div>`;
      html += `<div><strong>Motivo do fechamento:</strong> ${motivo}</div></div>`;
      if (staffAvatar) html += `<img src='${staffAvatar}' alt='Staff' style='margin-left:auto;'>`;
      html += `</div><div class='info'><strong>Canal:</strong> #${channel.name} | <strong>Data de Fechamento:</strong> ${new Date().toLocaleString('pt-BR')}</div>`;
      
      for (const msg of sorted) {
        const isStaff = msg.member && msg.member.permissions.has('ManageChannels');
        html += `<div class='msg${isStaff ? ' staff' : ''}'>`;
        html += `<div class='meta'><img src='${msg.author.displayAvatarURL()}' alt='avatar' style='width:20px;height:20px;vertical-align:middle;border-radius:50%;margin-right:6px;'> <strong>${msg.author.tag}</strong> <span>(${msg.author.id})</span> • ${new Date(msg.createdTimestamp).toLocaleString('pt-BR')}</div>`;
        if (msg.reference && msg.reference.messageId) {
          html += `<div class='reply'>↪️ Em resposta a mensagem ID: ${msg.reference.messageId}</div>`;
        }
        html += `<div class='content'>${msg.content ? msg.content.replace(/</g,'&lt;').replace(/>/g,'&gt;') : ''}</div>`;
        
        // Anexos
        if (msg.attachments && msg.attachments.size > 0) {
          html += `<div class='attachments'>`;
          for (const att of msg.attachments.values()) {
            if (att.contentType && att.contentType.startsWith('image/')) {
              html += `<img src='${att.url}' alt='anexo'>`;
            } else {
              html += `<a href='${att.url}' target='_blank'>${att.name}</a>`;
            }
          }
          html += `</div>`;
        }
        
        // Embeds
        if (msg.embeds && msg.embeds.length > 0) {
          for (const emb of msg.embeds) {
            html += `<div class='embed'>`;
            if (emb.title) html += `<div><strong>${emb.title}</strong></div>`;
            if (emb.description) html += `<div>${emb.description}</div>`;
            if (emb.url) html += `<div><a href='${emb.url}' target='_blank'>${emb.url}</a></div>`;
            html += `</div>`;
          }
        }
        
        // Stickers
        if (msg.stickers && msg.stickers.size > 0) {
          for (const sticker of msg.stickers.values()) {
            html += `<div class='sticker'>[Sticker: ${sticker.name}]</div>`;
          }
        }
        html += `</div>`;
      }
      
      html += `<div class='footer'>Transcript gerado automaticamente pelo sistema de tickets StreetCarClub.</div></body></html>`;
      
      // Enviar para canal de logs
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('📑 Ticket Fechado')
        .setDescription(`Ticket fechado por <@${user.id}>\n**Motivo:** ${motivo}`)
        .addFields(
          { name: 'Canal', value: `<#${channel.id}>`, inline: true },
          { name: 'Criador', value: autorId ? `<@${autorId}>` : 'Desconhecido', inline: true },
          { name: 'Fechado por', value: `<@${user.id}>`, inline: true }
        )
        .setTimestamp();
      
      const logChannel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
      if (logChannel) {
        await logChannel.send({ embeds: [embed], files: [{ attachment: Buffer.from(html, 'utf-8'), name: `transcript-${channel.name}.html` }] });
      }
      
      await interaction.reply({ content: '✅ Ticket fechado e transcript HTML enviado para a staff!', flags: 64 });
      
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