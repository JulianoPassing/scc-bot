import { EmbedBuilder, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, ChannelType, PermissionFlagsBits, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createTicketChannel, getNextTicketNumber } from '../utils/ticketManager.js';
import config from '../config.json' with { type: 'json' };

const SEGURANCA_CATEGORY_ID = '1378778140528087191';

export const name = 'interactionCreate';
export const execute = async function(interaction) {
  try {
    // Verificar se a interação já foi processada
    if (interaction.replied || interaction.deferred) {
      return;
    }

    const { customId, user, guild } = interaction;
    
    // Verificar se a interação pertence ao módulo de segurança
    const isSecurityInteraction = (customId) => {
      const securityPrefixes = [
        'create_ticket_panel', // Botão do painel de segurança
        'modal_ticket_seguranca_motivo', // Modal de motivo de segurança
        'close_ticket', // Fechar ticket de segurança
        'modal_motivo_fechamento_seguranca', // Modal de motivo de fechamento de segurança
        'avisar_membro_seguranca', // Avisar membro de segurança
        'assumir_ticket', // Assumir ticket (segurança)
        'adicionar_membro', // Adicionar membro (segurança)
        'avisar_membro', // Avisar membro (segurança)
        'renomear_ticket', // Renomear ticket (segurança)
        'timer_24h', // Timer 24h (segurança)
        'modal_renomear_ticket' // Modal de renomear (segurança)
      ];
      
      return securityPrefixes.some(prefix => customId === prefix || customId.startsWith(prefix));
    };
    
    // Painel de segurança: abrir modal para motivo
    if (interaction.isButton() && customId === 'create_ticket_panel') {
      try {
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
      } catch (error) {
        console.error('[SEGURANCA][ERRO showModal]', error);
      }
      return;
    }
    
    // Handler do modal de motivo
    if (interaction.isModalSubmit() && interaction.customId === 'modal_ticket_seguranca_motivo') {
      try {
        console.log('[DEBUG] Handler do modal_ticket_seguranca_motivo chamado para', interaction.user.tag, 'Guild:', interaction.guild.id);
        const motivo = interaction.fields.getTextInputValue('motivo');
        // Verifica se já existe ticket
        const existing = guild.channels.cache.find(
          c => c.name === `seg-${user.username.toLowerCase()}`
        );
        if (existing) {
          console.log('[DEBUG] Usuário já possui ticket aberto:', existing.name);
          await interaction.reply({ content: '❌ Você já possui um ticket aberto: ' + existing.toString(), flags: 64 });
          return;
        }
        // Cria o canal na categoria correta, herdando permissões
        let ticketChannel;
        try {
          const ticketNumber = await getNextTicketNumber();
          console.log('[DEBUG] Tentando criar canal:', `seg-${user.username.toLowerCase()}`, 'na categoria', SEGURANCA_CATEGORY_ID);
          ticketChannel = await guild.channels.create({
            name: `seg-${user.username.toLowerCase()}`,
            type: ChannelType.GuildText,
            parent: SEGURANCA_CATEGORY_ID,
            topic: `Ticket de Segurança | ${user.tag} | ${motivo}`,
            permissionOverwrites: [
              {
                id: guild.id, // everyone
                deny: [PermissionFlagsBits.ViewChannel],
              },
              {
                id: user.id, // criador
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks],
              },
              {
                id: config.staffRoleId, // staff
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks],
              },
            ],
          });
          console.log('[DEBUG] Canal criado com sucesso:', ticketChannel.id);
        } catch (err) {
          console.error('[ERRO] Falha ao criar canal do ticket de segurança:', err, 'Categoria:', SEGURANCA_CATEGORY_ID, 'Guild:', guild.id);
          await interaction.reply({ content: `❌ Erro ao criar o canal do ticket. Detalhe: ${err && (err.stack || JSON.stringify(err))}`, flags: 64 });
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
          new ButtonBuilder().setCustomId('close_ticket').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
          new ButtonBuilder().setCustomId('avisar_membro_seguranca').setLabel('Avisar Membro').setStyle(ButtonStyle.Primary).setEmoji('🔔')
        );
        await ticketChannel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: `✅ Ticket de segurança criado em <#${ticketChannel.id}>!`, flags: 64 });
      } catch (error) {
        console.error('[SEGURANCA][ERRO modal_ticket_seguranca_motivo]', error);
        try {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Erro ao processar solicitação de ticket de segurança.', flags: 64 });
          }
        } catch (e) {}
      }
      return;
    }
    
    // Fechar Ticket de segurança (com motivo e transcript)
    if (interaction.isButton() && customId === 'close_ticket') {
      try {
        // Permissão: apenas staff
        const member = guild.members.cache.get(user.id);
        const hasStaffRole = member.roles.cache.has(config.staffRoleId);
        if (!hasStaffRole) {
          await interaction.reply({ content: '❌ Apenas membros da equipe podem fechar tickets de segurança!', flags: 64 });
          return;
        }
        // Abrir modal para motivo do fechamento
        const modal = new ModalBuilder()
          .setCustomId('modal_motivo_fechamento_seguranca')
          .setTitle('Fechar Ticket de Segurança - Motivo')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('motivo')
                .setLabel('Motivo do fechamento')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(200)
            )
          );
        await interaction.showModal(modal);
      } catch (error) {
        console.error('[SEGURANCA][ERRO close_ticket]', error);
      }
      return;
    }
    
    // Handler do modal de motivo de fechamento
    if (interaction.isModalSubmit() && interaction.customId === 'modal_motivo_fechamento_seguranca') {
      try {
        await interaction.deferReply({ flags: 64 });
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
        const notifyMsg = sorted.find(m => m.content && m.content.includes('abriu um ticket de segurança!'));
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
        
        // HTML transcript igual ao ticket normal
        let html = `<!DOCTYPE html><html lang='pt-BR'><head><meta charset='UTF-8'><title>Transcript Ticket Segurança</title><style>
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
          .setTitle('📑 Ticket de Segurança Fechado')
          .setDescription(`Ticket de segurança fechado por <@${user.id}>\n**Motivo:** ${motivo}`)
          .addFields(
            { name: 'Canal', value: `<#${channel.id}>`, inline: true },
            { name: 'Criador', value: autorId ? `<@${autorId}>` : 'Desconhecido', inline: true },
            { name: 'Fechado por', value: `<@${user.id}>`, inline: true }
          )
          .setTimestamp();
        
        const logChannel = guild.channels.cache.get('1309235378317951158');
        if (logChannel) {
          const { AttachmentBuilder } = await import('discord.js');
          const buffer = Buffer.from(html, 'utf-8');
          const attachment = new AttachmentBuilder(buffer, { name: `transcript-${channel.name}.html` });
          await logChannel.send({ embeds: [embed], files: [attachment] });
        }
        
        await interaction.editReply({ content: '✅ Ticket fechado e transcript HTML enviado para a staff!' });
        
        setTimeout(async () => {
          try { 
            await channel.delete(`Ticket fechado por ${interaction.user.tag}`); 
          } catch (e) {}
        }, 5000);
      } catch (error) {
        console.error('[SEGURANCA][ERRO modal_motivo_fechamento_seguranca]', error);
        try {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Erro ao processar fechamento do ticket.', flags: 64 });
          } else if (interaction.deferred) {
            await interaction.editReply({ content: '❌ Erro ao processar fechamento do ticket.' });
          }
        } catch (e) {}
      }
      return;
    }
    
    // Handler do botão Avisar Membro (segurança)
    if (interaction.isButton() && customId === 'avisar_membro_seguranca') {
      try {
        // Buscar criador do ticket pela mensagem de notificação
        const channel = interaction.channel;
        const messages = await channel.messages.fetch({ limit: 10 });
        const notifyMsg = messages.find(m => m.content && m.content.includes('abriu um ticket de segurança!'));
        let autorId = null;
        if (notifyMsg) {
          const match = notifyMsg.content.match(/<@!?([0-9]+)>/);
          if (match) autorId = match[1];
        }
        if (autorId) {
          const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('🔔 Atualização do seu Ticket de Segurança')
            .setDescription(
              'Olá! Esta é uma atualização sobre o seu ticket de segurança no Street CarClub.\n\n' +
              `Acesse seu ticket aqui: <#${channel.id}>\n\n` +
              'Se a equipe solicitou informações adicionais ou uma resposta, por favor, responda diretamente no canal do ticket para agilizar seu atendimento.\n\n' +
              'Se não for necessário, aguarde o retorno da equipe.\n\n' +
              'Atenciosamente,\nEquipe de Segurança StreetCarClub'
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
      } catch (error) {
        console.error('[SEGURANCA][ERRO avisar_membro_seguranca]', error);
        try {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Erro ao avisar membro.', flags: 64 });
          }
        } catch (e) {}
      }
      return;
    }
    
    // Verificar se é uma interação do módulo de segurança antes de processar os outros handlers
    if (!isSecurityInteraction(customId)) {
      return; // Não processar interações de outros módulos
    }
    
    // Assumir Ticket
    if (customId === 'assumir_ticket') {
      try {
        const member = guild.members.cache.get(user.id);
        if (!member.roles.cache.has(config.staffRoleId)) {
          await interaction.reply({ content: '❌ Apenas membros da equipe podem assumir tickets!', flags: 64 });
          return;
        }
        await interaction.reply({ content: `🫡 <@${user.id}> assumiu o ticket!`, flags: 0 });
      } catch (error) {
        console.error('[SEGURANCA][ERRO assumir_ticket]', error);
      }
      return;
    }
    
    // Adicionar Membro
    if (customId === 'adicionar_membro') {
      try {
        await interaction.reply({ content: 'Mencione o usuário a ser adicionado ao ticket.', flags: 64 });
      } catch (error) {
        console.error('[SEGURANCA][ERRO adicionar_membro]', error);
      }
      return;
    }
    
    // Avisar Membro
    if (customId === 'avisar_membro') {
      try {
        await interaction.reply({ content: 'O usuário foi avisado sobre este ticket.', flags: 0 });
      } catch (error) {
        console.error('[SEGURANCA][ERRO avisar_membro]', error);
      }
      return;
    }
    
    // Renomear Ticket mantendo emoji da categoria
    if (customId === 'renomear_ticket') {
      try {
        const name = interaction.channel.name;
        const emoji = name.startsWith('seg-') ? '🛡️' : '';
        const modal = new ModalBuilder()
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
          );
        await interaction.showModal(modal);
      } catch (error) {
        console.error('[SEGURANCA][ERRO renomear_ticket]', error);
      }
      return;
    }
    
    // Timer 24h
    if (customId === 'timer_24h') {
      try {
        await interaction.reply({ content: '⏰ Timer de 24h iniciado para este ticket.', flags: 0 });
      } catch (error) {
        console.error('[SEGURANCA][ERRO timer_24h]', error);
      }
      return;
    }
    
    // Handler do modal de renomear
    if (interaction.isModalSubmit() && interaction.customId === 'modal_renomear_ticket') {
      try {
        const novoNome = interaction.fields.getTextInputValue('novo_nome');
        const name = interaction.channel.name;
        const emoji = name.startsWith('seg-') ? '🛡️' : '';
        let finalName = novoNome;
        if (!finalName.startsWith(emoji)) finalName = emoji + finalName;
        await interaction.channel.setName(finalName);
        await interaction.reply({ content: `✏️ Nome do ticket alterado para: ${finalName}`, flags: 64 });
      } catch (error) {
        console.error('[SEGURANCA][ERRO modal_renomear_ticket]', error);
        try {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Erro ao renomear ticket.', flags: 64 });
          }
        } catch (e) {}
      }
      return;
    }
  } catch (error) {
    console.error('Erro no handler de interactionCreate (segurança):', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Ocorreu um erro ao processar sua interação.', flags: 64 });
      }
    } catch (e) {}
  }
}; 