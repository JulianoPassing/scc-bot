import { EmbedBuilder, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, ChannelType, PermissionFlagsBits, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import config from '../config.json' with { type: 'json' };

const SEGURANCA_CATEGORY_ID = '1378778140528087191';

function extractCreatorIdFromTopic(topic) {
  if (!topic) return null;
  const match = topic.match(/creatorId\s*=\s*(\d{17,19})/i);
  return match ? match[1] : null;
}

async function findCreatorIdFromSecurityNotifyMessage(channel) {
  // Busca paginando para trás até achar a mensagem de abertura
  let lastId;
  for (let i = 0; i < 25; i++) { // até 2500 mensagens (25x100)
    const options = { limit: 100 };
    if (lastId) options.before = lastId;

    const messages = await channel.messages.fetch(options);
    if (!messages.size) break;

    const notifyMsg = messages.find(m => m.content && m.content.includes('abriu um ticket de segurança!'));
    if (notifyMsg) {
      const match = notifyMsg.content.match(/<@!?([0-9]+)>/);
      if (match) return match[1];
    }

    lastId = messages.last().id;
    if (messages.size < 100) break;
  }
  return null;
}

async function findCreatorIdFromChannelPermissions(channel, client, guild) {
  try {
    const supportRoleIds = new Set();
    for (const roleName of config.supportRoles || []) {
      const role = guild.roles.cache.find(r => r.name === roleName);
      if (role) supportRoleIds.add(role.id);
    }

    const excludedIds = new Set([
      guild.roles.everyone.id,
      client.user.id,
      config.staffRoleId,
      ...supportRoleIds
    ]);

    const candidateMemberIds = [];
    for (const [id, overwrite] of channel.permissionOverwrites.cache) {
      if (excludedIds.has(id)) continue;
      // OverwriteType.Member é 1 no discord.js v14
      if (overwrite?.type !== 1 && overwrite?.type !== 'member') continue;
      candidateMemberIds.push(id);
    }

    for (const id of candidateMemberIds) {
      const u = await client.users.fetch(id).catch(() => null);
      if (u && !u.bot) return id;
    }
  } catch (e) {}
  return null;
}

async function getSecurityTicketCreatorId({ channel, client, guild }) {
  // 1) Preferir topic (persistente e rápido)
  const fromTopic = extractCreatorIdFromTopic(channel.topic);
  if (fromTopic) return fromTopic;

  // 2) Fallback: procurar na mensagem de abertura (com paginação)
  const fromNotify = await findCreatorIdFromSecurityNotifyMessage(channel).catch(() => null);
  if (fromNotify) return fromNotify;

  // 3) Último recurso: heurística via permissões do canal
  return await findCreatorIdFromChannelPermissions(channel, client, guild).catch(() => null);
}

export const name = 'interactionCreate';
export const execute = async function(interaction) {
  try {
    console.log('[DEBUG] ticket-s-wl: execute chamado para', interaction.type, interaction.customId);
    const { customId, user, guild } = interaction;
    
    // Permitir sempre o botão create_ticket_panel (criação de ticket)
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
    
    // Verificar se é um ticket de segurança (começa com 'seg-' e está em categoria de segurança)
    const channelName = interaction.channel?.name;
    const channelCategory = interaction.channel?.parentId;
    const isSecurityCategory = config.securityCategories.includes(channelCategory);
    const isSecurityTicket = channelName && channelName.startsWith('seg-') && isSecurityCategory;
    
    console.log('[DEBUG] Canal atual:', channelName, 'Categoria:', channelCategory, 'É categoria de segurança:', isSecurityCategory, 'É ticket de segurança:', isSecurityTicket);
    
    // Se não for um ticket de segurança E não for um modal, ignorar (deixar o módulo ticket processar)
    if (!isSecurityTicket && !interaction.isModalSubmit()) {
      console.log('[DEBUG] Não é ticket de segurança nem modal, saindo...');
      return;
    }

    // Handler do modal de motivo
    console.log('[DEBUG] Verificando modal:', interaction.isModalSubmit(), interaction.customId);
    if (interaction.isModalSubmit() && interaction.customId === 'modal_ticket_seguranca_motivo') {
      console.log('[DEBUG] ===== INÍCIO DO PROCESSAMENTO DO MODAL =====');
      console.log('[DEBUG] Handler do modal_ticket_seguranca_motivo chamado para', interaction.user.tag, 'Guild:', interaction.guild.id);
      console.log('[DEBUG] Modal customId:', interaction.customId);
      console.log('[DEBUG] Modal fields:', interaction.fields);
      
      const motivo = interaction.fields.getTextInputValue('motivo');
      console.log('[DEBUG] Motivo recebido:', motivo);
      
      const user = interaction.user;
      const guild = interaction.guild;
      console.log('[DEBUG] Verificando se já existe ticket para:', user.username);
      // Verifica se já existe ticket em qualquer categoria de segurança
      const existing = guild.channels.cache.find(
        c => c.name === `seg-${user.username.toLowerCase()}` && 
             config.securityCategories.includes(c.parentId)
      );
      if (existing) {
        console.log('[DEBUG] Usuário já possui ticket aberto:', existing.name);
        await interaction.reply({ content: '❌ Você já possui um ticket aberto: ' + existing.toString(), flags: 64 });
        return;
      }
      console.log('[DEBUG] Nenhum ticket existente encontrado, prosseguindo com criação');
      // Cria o canal na categoria correta com permissões específicas
      let ticketChannel;
      try {
        console.log('[DEBUG] Iniciando criação do canal de segurança');
        console.log('[DEBUG] Tentando criar canal:', `seg-${user.username.toLowerCase()}`, 'na categoria', SEGURANCA_CATEGORY_ID);
        
        // Usar sempre a categoria padrão para criação
        const selectedCategoryId = SEGURANCA_CATEGORY_ID; // Sempre usar a categoria padrão
        const category = guild.channels.cache.get(selectedCategoryId);
        console.log('[DEBUG] Categoria padrão selecionada:', category ? category.name : 'NÃO ENCONTRADA', 'ID:', selectedCategoryId);
        
        // Permissões específicas para o canal
        const permissionOverwrites = [
          { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
          { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
          { id: config.staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageChannels] }
        ];
        
        console.log('[DEBUG] Permissões configuradas:', permissionOverwrites.length, 'overwrites');
        
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
        
        console.log('[DEBUG] Tentando criar o canal agora...');
        ticketChannel = await guild.channels.create({
          name: `seg-${user.username.toLowerCase()}`,
          type: ChannelType.GuildText,
          parent: selectedCategoryId,
          topic: `Ticket de Segurança | creatorId=${user.id} | ${user.tag} | ${motivo}`,
          permissionOverwrites
        });
        console.log('[DEBUG] Canal criado com sucesso:', ticketChannel.id);
        console.log('[DEBUG] Permissões do canal:', ticketChannel.permissionOverwrites.cache.size, 'overwrites');
      } catch (err) {
        console.error('[ERRO] Falha ao criar canal do ticket de segurança:', err);
        console.error('[ERRO] Stack trace:', err.stack);
        console.error('[ERRO] Categoria:', SEGURANCA_CATEGORY_ID, 'Guild:', guild.id);
        
        // Verificar se é erro de limite de canais atingido
        if (err.code === 30013) {
          await interaction.reply({ 
            content: '❌ **Limite de canais atingido!**\n\nO servidor atingiu o limite máximo de canais. Entre em contato com a administração para resolver esta situação.', 
            flags: 64 
          });
          return;
        }
        
        await interaction.reply({ content: `❌ Erro ao criar o canal do ticket. Detalhe: ${err.message}`, flags: 64 });
        return;
      }
      // Notificação
      const notifyMsg = await ticketChannel.send({ content: `🔔 <@${user.id}> abriu um ticket de segurança! Equipe notificada:` });
      // Fix: manter referência fácil ao criador mesmo com muitas mensagens
      await notifyMsg.pin().catch(() => {});
      // Embed do painel de ticket aberto
      const embed = new EmbedBuilder()
        .setColor('#EAF207')
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
        new ButtonBuilder().setCustomId('avisar_membro_seguranca').setLabel('Avisar Membro').setStyle(ButtonStyle.Secondary).setEmoji('🔔')
      );
      await ticketChannel.send({ embeds: [embed], components: [row] });
      
      // Mensagem automática informando sobre o horário de atendimento
      const autoMessage = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('📋 Informações Importantes')
        .setDescription('Olá. Seu ticket foi recebido e está na fila para atendimento. Nossa equipe entrará em contato em breve, lembrando que nosso horário de atendimento é de segunda a sexta-feira. Não é necessário enviar novas mensagens.')
        .setFooter({ text: 'Aguarde o atendimento da equipe' })
        .setTimestamp();

      await ticketChannel.send({ embeds: [autoMessage] });
      
      console.log('[DEBUG] ===== FIM DO PROCESSAMENTO DO MODAL =====');
      await interaction.reply({ content: `✅ Ticket de segurança criado em <#${ticketChannel.id}>!`, flags: 64 });
      return;
    }
    // Fechar Ticket de segurança (com motivo e transcript)
    if (interaction.isButton() && customId === 'close_ticket') {
      // Permissão: apenas staff
      const member = guild.members.cache.get(user.id);
      const hasStaffRole = member.roles.cache.has(config.staffRoleId);
      if (!hasStaffRole) {
        return interaction.reply({ content: '❌ Apenas membros da equipe podem fechar tickets de segurança!', flags: MessageFlags.Ephemeral });
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
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
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
      autorId = extractCreatorIdFromTopic(channel.topic);
      if (!autorId && notifyMsg) {
        const match = notifyMsg.content.match(/<@!?([0-9]+)>/);
        if (match) autorId = match[1];
      }
      if (!autorId) {
        autorId = await findCreatorIdFromChannelPermissions(channel, interaction.client, guild).catch(() => null);
      }
      if (autorId) {
        try {
          const userObj = await interaction.client.users.fetch(autorId);
          autorTag = userObj.tag;
          autorAvatar = userObj.displayAvatarURL();
        } catch {}
      }
      // Staff responsável
      const staffTag = user.tag;
      const staffAvatar = user.displayAvatarURL();
      // HTML transcript igual ao ticket normal
      let html = `<!DOCTYPE html><html lang='pt-BR'><head><meta charset='UTF-8'><title>Transcript Ticket Segurança - Street Car Club</title>
      <link rel="icon" href="https://i.imgur.com/YULctuK.png" type="image/png">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A==" crossorigin="anonymous" referrerpolicy="no-referrer" />
      <style>
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
      
      :root {
        --primary-color: #EAF207;
        --secondary-color: #F4F740;
        --accent-color: #C6C403;
        --background-color: #0D0D0D;
        --card-background: linear-gradient(135deg, #0D0D0D 0%, #0D0D0D 100%);
        --text-color: #FFFFFF;
        --text-secondary: #B0B0B0;
        --border-color: #30363D;
        --shadow-color: rgba(0, 0, 0, 0.4);
        --gradient-primary: linear-gradient(135deg, #EAF207 0%, #F4F740 100%);
      }
      
      * { margin: 0; padding: 0; box-sizing: border-box; }
      
      body {
        font-family: 'Poppins', sans-serif;
        background: var(--background-color);
        background-image: url('https://i.imgur.com/Wf7bGAO.png');
        background-size: cover;
        background-position: center;
        background-attachment: fixed;
        color: var(--text-color);
        line-height: 1.7;
        min-height: 100vh;
        padding: 20px;
      }
      
      .container {
        max-width: 1200px;
        margin: 0 auto;
        background: var(--card-background);
        border-radius: 20px;
        box-shadow: 0 20px 40px var(--shadow-color);
        overflow: hidden;
        border: 1px solid var(--border-color);
      }
      
      .header {
        background: var(--card-background);
        padding: 40px;
        text-align: center;
        position: relative;
        overflow: hidden;
        box-shadow: 0 10px 30px var(--shadow-color);
      }
      
      .header::after {
        content: '';
        position: absolute;
        top: 50%;
        right: 30px;
        width: 10px;
        height: 10px;
        background: radial-gradient(circle, #ff4d4d 60%, #ffb347 100%);
        border-radius: 50%;
        transform: translateY(-50%);
        box-shadow: 0 0 8px 2px #ff4d4d99;
        z-index: 3;
      }
      
      .logo {
        position: relative;
        z-index: 2;
        margin-bottom: 20px;
      }
      
      .logo img {
        max-width: 300px;
        height: auto;
        filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3));
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      
      .header h1 {
        font-size: 2.5em;
        font-weight: 700;
        background: var(--gradient-primary);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 10px;
        position: relative;
        padding-bottom: 20px;
      }
      
      .header h1::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 80px;
        height: 3px;
        background: var(--gradient-primary);
        border-radius: 2px;
      }
      
      .header p {
        font-size: 1.2em;
        color: var(--text-secondary);
        opacity: 0.9;
      }
      
      .info {
        margin: 20px 30px;
        padding: 20px;
        background: rgba(234, 242, 7, 0.1);
        border-radius: 15px;
        border: 1px solid rgba(234, 242, 7, 0.3);
      }
      
      .info strong {
        color: var(--primary-color);
        font-weight: 600;
      }
      
      .msg {
        background: var(--card-background);
        margin: 16px 30px;
        padding: 20px;
        border-radius: 15px;
        box-shadow: 0 5px 15px var(--shadow-color);
        border: 1px solid var(--border-color);
        position: relative;
        overflow: hidden;
        transition: all 0.3s ease;
      }
      
      .msg::before {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        width: 1px;
        height: 100%;
        background: linear-gradient(to bottom, var(--primary-color), transparent);
      }
      
      .msg:hover {
        transform: translateX(5px);
        box-shadow: 0 10px 25px var(--shadow-color);
      }
      
      .msg.staff {
        border-left: 5px solid var(--primary-color);
        background: rgba(234, 242, 7, 0.05);
      }
      
      .msg .meta {
        font-size: 13px;
        color: var(--text-secondary);
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .msg .meta img {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid var(--primary-color);
      }
      
      .msg .content {
        font-size: 15px;
        white-space: pre-wrap;
        word-break: break-word;
        color: var(--text-color);
        line-height: 1.6;
      }
      
      .msg .attachments img {
        max-width: 200px;
        max-height: 120px;
        margin: 8px 0;
        display: block;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      }
      
      .msg .attachments a {
        color: var(--primary-color);
        text-decoration: none;
        display: block;
        padding: 8px 12px;
        background: rgba(234, 242, 7, 0.1);
        border-radius: 8px;
        margin: 4px 0;
        transition: all 0.3s ease;
      }
      
      .msg .attachments a:hover {
        background: rgba(234, 242, 7, 0.2);
        transform: translateX(5px);
      }
      
      .msg .embed {
        background: rgba(234, 242, 7, 0.1);
        padding: 12px 16px;
        border-radius: 10px;
        margin: 12px 0;
        border: 1px solid rgba(234, 242, 7, 0.3);
      }
      
      .msg .reply {
        color: var(--accent-color);
        font-size: 13px;
        font-style: italic;
        margin-bottom: 8px;
        padding: 8px 12px;
        background: rgba(198, 196, 3, 0.1);
        border-radius: 8px;
        border-left: 3px solid var(--accent-color);
      }
      
      .footer {
        margin: 30px 0 0 0;
        text-align: center;
        color: var(--text-secondary);
        font-size: 13px;
        padding: 20px;
        background: var(--card-background);
        border-top: 1px solid var(--border-color);
      }
      
      .footer i {
        color: var(--primary-color);
        margin-right: 8px;
      }
      </style></head><body>
      <div class="container">
        <div class="header">
          <div class="logo">
            <img src="https://i.imgur.com/kHvmXj6.png" alt="Street Car Club Roleplay Logo" />
          </div>
          <h1><i class="fas fa-shield-alt"></i> Transcript de Segurança</h1>
          <p>Street Car Club • Sistema de Atendimento de Segurança</p>
        </div>`;
      html += `<div class='info'>
        <div style='display: flex; align-items: center; gap: 15px; margin-bottom: 15px;'>
          ${autorAvatar ? `<img src='${autorAvatar}' alt='Criador' style='width: 48px; height: 48px; border-radius: 50%; border: 2px solid var(--primary-color);'>` : ''}
          <div>
            <div><strong><i class="fas fa-user"></i> Criador:</strong> ${autorTag ? autorTag : autorId || 'Desconhecido'}</div>
            <div><strong><i class="fas fa-shield-alt"></i> Staff responsável:</strong> ${staffTag}</div>
            <div><strong><i class="fas fa-comment"></i> Motivo do fechamento:</strong> ${motivo}</div>
          </div>
          ${staffAvatar ? `<img src='${staffAvatar}' alt='Staff' style='width: 48px; height: 48px; border-radius: 50%; border: 2px solid var(--primary-color); margin-left: auto;'>` : ''}
        </div>
        <div><strong><i class="fas fa-hashtag"></i> Canal:</strong> #${channel.name} | <strong><i class="fas fa-calendar-alt"></i> Data de Fechamento:</strong> ${new Date().toLocaleString('pt-BR')}</div>
      </div>`;
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
      html += `<div class='footer'><i class="fas fa-robot"></i> Transcript gerado automaticamente pelo sistema de tickets Street Car Club.</div>
      </div>
      </body></html>`;
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
      const channel = interaction.channel;
      const autorId = await getSecurityTicketCreatorId({ channel, client: interaction.client, guild });
      if (autorId) {
        const embed = new EmbedBuilder()
          .setColor('#EAF207')
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
        return interaction.reply({ content: '❌ Apenas membros da equipe podem assumir tickets!', flags: MessageFlags.Ephemeral });
      }
      await interaction.reply({ content: `🫡 <@${user.id}> assumiu o ticket!` });
      return;
    }
    // Adicionar Membro
    if (customId === 'adicionar_membro') {
      await interaction.reply({ content: 'Mencione o usuário a ser adicionado ao ticket.', flags: MessageFlags.Ephemeral });
      return;
    }
    // Avisar Membro
    if (customId === 'avisar_membro') {
      await interaction.reply({ content: 'A equipe foi avisada sobre este ticket.' });
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
      await interaction.reply({ content: '⏰ Timer de 24h iniciado para este ticket.' });
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
      await interaction.reply({ content: `✏️ Nome do ticket alterado para: ${finalName}`, flags: MessageFlags.Ephemeral });
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