import { EmbedBuilder, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, ChannelType, PermissionFlagsBits, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createTicketChannel, getNextTicketNumber } from '../utils/ticketManager.js';
import config from '../config.json' with { type: 'json' };

const SEGURANCA_CATEGORY_ID = '1378778140528087191';

export const name = 'interactionCreate';
export const execute = async function(interaction) {
  try {
    const { customId, user, guild } = interaction;
    // Painel de segurança: abrir modal para motivo
    if (interaction.isButton() && customId === 'create_ticket_panel') {
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
      console.log('[DEBUG] Handler do modal_ticket_seguranca_motivo chamado para', interaction.user.tag, 'Guild:', interaction.guild.id);
      const motivo = interaction.fields.getTextInputValue('motivo');
      const user = interaction.user;
      const guild = interaction.guild;
      // Verifica se já existe ticket
      const existing = guild.channels.cache.find(
        c => c.name === `seg-${user.username.toLowerCase()}`
      );
      if (existing) {
        console.log('[DEBUG] Usuário já possui ticket aberto:', existing.name);
        await interaction.reply({ content: '❌ Você já possui um ticket aberto: ' + existing.toString(), flags: 64 });
        return;
      }
      // Cria o canal na categoria correta com permissões específicas
      let ticketChannel;
      try {
        const ticketNumber = await getNextTicketNumber();
        console.log('[DEBUG] Tentando criar canal:', `seg-${user.username.toLowerCase()}`, 'na categoria', SEGURANCA_CATEGORY_ID);
        
        // Permissões específicas para o canal
        const permissionOverwrites = [
          { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
          { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
          { id: config.staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageChannels] }
        ];
        
        console.log('[DEBUG] Permissões configuradas para usuário:', user.id, 'Staff Role:', config.staffRoleId);
        
        // Adicionar permissões para roles de suporte
        for (const roleName of config.supportRoles || []) {
          const role = guild.roles.cache.find(r => r.name === roleName);
          if (role) {
            permissionOverwrites.push({
              id: role.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageChannels]
            });
          }
        }
        
        ticketChannel = await guild.channels.create({
          name: `seg-${user.username.toLowerCase()}`,
          type: ChannelType.GuildText,
          parent: SEGURANCA_CATEGORY_ID,
          topic: `Ticket de Segurança | ${user.tag} | ${motivo}`,
          permissionOverwrites
        });
        console.log('[DEBUG] Canal criado com sucesso:', ticketChannel.id);
        console.log('[DEBUG] Permissões do canal:', ticketChannel.permissionOverwrites.cache.size, 'overwrites');
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
      return;
    }
    // Fechar Ticket de segurança (com motivo e transcript)
    if (interaction.isButton() && customId === 'close_ticket') {
      // Permissão: apenas staff
      const member = guild.members.cache.get(user.id);
      const hasStaffRole = member.roles.cache.has(config.staffRoleId);
      if (!hasStaffRole) {
        return interaction.reply({ content: '❌ Apenas membros da equipe podem fechar tickets de segurança!', ephemeral: true });
      }
      // Abrir modal para motivo do fechamento
      await interaction.showModal(
        new ModalBuilder()
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
          )
      );
      return;
    }
    // Handler do modal de motivo de fechamento
    if (interaction.isModalSubmit() && interaction.customId === 'modal_motivo_fechamento_seguranca') {
      await interaction.deferReply({ ephemeral: true });
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
        .setDescription(`Ticket de segurança fechado por <@${user.id}>
**Motivo:** ${motivo}`)
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
      await interaction.editReply({ content: '✅ Ticket fechado e transcript HTML enviado para a staff!', flags: 64 });
      setTimeout(async () => {
        try { await channel.delete(`Ticket fechado por ${interaction.user.tag}`); } catch (e) {}
      }, 5000);
      return;
    }
    // Handler do botão Avisar Membro (segurança)
    if (interaction.isButton() && customId === 'avisar_membro_seguranca') {
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
      return;
    }
    // Assumir Ticket
    if (customId === 'assumir_ticket') {
      const member = guild.members.cache.get(user.id);
      if (!member.roles.cache.has(config.staffRoleId)) {
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
      // Verificar se é um ticket de segurança (começa com 'seg-')
      const name = interaction.channel.name;
      if (!name.startsWith('seg-')) {
        return; // Não é um ticket de segurança, ignorar
      }
      
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
      // Verificar se é um ticket de segurança (começa com 'seg-')
      const name = interaction.channel.name;
      if (!name.startsWith('seg-')) {
        return; // Não é um ticket de segurança, ignorar
      }
      
      const novoNome = interaction.fields.getTextInputValue('novo_nome');
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