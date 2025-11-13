import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } from 'discord.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import conversationManager from '../utils/conversationManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const config = JSON.parse(readFileSync(join(__dirname, '../config.json'), 'utf8'));

export default {
  async execute(interaction, client) {
    // Ignora se não for um botão
    if (!interaction.isButton()) return;

    // Verifica se é uma interação do auto-atendimento
    if (!interaction.customId.startsWith('autoatend_')) return;

    // Trata abertura de novo ticket
    if (interaction.customId === 'autoatend_limbo' || interaction.customId === 'autoatend_guincho' || interaction.customId === 'autoatend_boost') {
      await handleTicketCreation(interaction, client);
      return;
    }

    // Trata botões de verificação (Sim/Não)
    if (interaction.customId.startsWith('autoatend_verify_')) {
      await handleVerification(interaction, client);
      return;
    }

    // Trata botão de fechar ticket
    if (interaction.customId === 'autoatend_close_ticket') {
      await handleCloseTicket(interaction, client);
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

    // Verifica se o usuário está na blacklist
    const hasBlacklistRole = interaction.member.roles.cache.has(config.blacklistRoleId);
    
    if (hasBlacklistRole) {
      return interaction.editReply({
        content: '❌ **Você não tem permissão para usar o sistema de Auto-Atendimento.**\n\n' +
          'Você deve abrir um ticket normal, sem ser o de Auto-Atendimento.'
      });
    }

    const type = interaction.customId.replace('autoatend_', '');
    const categoryConfig = config.categories[type];

    if (!categoryConfig) {
      return interaction.editReply('❌ Tipo de atendimento inválido.');
    }

    // Verifica se é categoria boost e se o usuário tem o cargo Server Booster
    if (type === 'boost') {
      const hasBoosterRole = interaction.member.roles.cache.has('1055575365784977458');
      
      if (!hasBoosterRole) {
        return interaction.editReply({
          content: '❌ **Você não tem permissão para usar o Auto-Atendimento de Boost.**\n\n' +
            'Apenas membros com o cargo Server Booster podem abrir tickets nesta categoria.'
        });
      }
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
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
          ],
        },
        {
          id: '1046404063673192546', // Cargo Staff
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.ManageChannels,
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
    let descriptionText = `Olá <@${interaction.user.id}>, boa tarde! Espero que possa lhe ajudar.\n\n`;
    
    // Adiciona aviso para guincho
    if (type === 'guincho') {
      descriptionText += '```diff\n- ⛔ SISTEMA EXCLUSIVO PARA CARROS NO LIMBO, QUALQUER OUTRO PROBLEMA, DEVE SER CHAMADO O MECANICO!\n```\n';
    }
    
    descriptionText += '**Por favor, me conte o que aconteceu com o máximo de detalhes possível.**';

    const initialEmbed = new EmbedBuilder()
      .setTitle(`${categoryConfig.emoji} Auto-Atendimento: ${categoryConfig.name}`)
      .setDescription(descriptionText)
      .setColor('#00FF00')
      .setTimestamp();

    // Botão de fechar ticket (apenas para staff)
    const closeButton = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('autoatend_close_ticket')
          .setLabel('Fechar Ticket')
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger)
      );

    await ticketChannel.send({
      content: `<@${interaction.user.id}>`,
      embeds: [initialEmbed],
      components: [closeButton]
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
          `**Este ticket ficará aberto para análise da nossa equipe.**\n\n` +
          `<@&${config.supportRoleId}>, atendimento concluído. Por favor, analisem se não houve uso indevido.`
        )
        .setColor('#00FF00')
        .setTimestamp();

      await interaction.channel.send({
        content: `<@&${config.supportRoleId}>`,
        embeds: [embed]
      });

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

/**
 * Fecha o ticket e gera transcript
 */
async function handleCloseTicket(interaction, client) {
  try {
    // Verifica se o usuário tem o cargo staff
    const hasStaffRole = interaction.member.roles.cache.has(config.supportRoleId);
    
    if (!hasStaffRole) {
      return interaction.reply({
        content: '❌ Apenas membros da equipe staff podem fechar tickets!',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.channel;
    const guild = interaction.guild;
    const user = interaction.user;

    // Remove a conversação ativa
    conversationManager.removeConversation(channel.id);

    // Buscar todas as mensagens do canal (transcript completo)
    console.log('[Auto-Atendimento] Coletando mensagens para transcript...');
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

    // Identificar criador do ticket pela primeira mensagem do bot que menciona um usuário
    const notifyMsg = sorted.find(m => m.author.bot && m.content && (m.content.includes('Olá') || m.content.includes('Auto-Atendimento')));
    let autorId = null;
    let autorTag = null;
    let autorAvatar = null;

    if (notifyMsg) {
      const match = notifyMsg.content.match(/<@!?([0-9]+)>/);
      if (match) {
        autorId = match[1];
        try {
          const userObj = await client.users.fetch(autorId);
          autorTag = userObj.tag;
          autorAvatar = userObj.displayAvatarURL();
        } catch (e) {
          console.error('[Auto-Atendimento] Erro ao buscar usuário:', e);
        }
      }
    }

    // Se não encontrou pela mensagem, tentar identificar pelas permissões do canal
    if (!autorId) {
      console.log('[Auto-Atendimento] Tentando identificar criador pelas permissões do canal...');
      const permissions = channel.permissionOverwrites.cache;
      for (const [id, perm] of permissions) {
        if (id !== guild.id && id !== client.user.id && id !== config.supportRoleId) {
          // Este deve ser o usuário criador
          try {
            const userObj = await client.users.fetch(id);
            if (!userObj.bot) {
              autorId = id;
              autorTag = userObj.tag;
              autorAvatar = userObj.displayAvatarURL();
              console.log('[Auto-Atendimento] Criador identificado pelas permissões:', autorTag);
              break;
            }
          } catch (e) {
            console.error('[Auto-Atendimento] Erro ao buscar usuário por permissão:', e);
          }
        }
      }
    }

    // Staff responsável
    const staffTag = user.tag;
    const staffAvatar = user.displayAvatarURL();

    // Tipo de atendimento (limbo/guincho)
    const categoryType = channel.name.includes('limbo') ? '🌫️ Limbo' : '🚗 Guincho';

    // HTML transcript
    console.log('[Auto-Atendimento] Gerando HTML transcript...');
    let html = `<!DOCTYPE html><html lang='pt-BR'><head><meta charset='UTF-8'><title>Transcript Auto-Atendimento - Street Car Club</title>
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
        <h1><i class="fas fa-robot"></i> Transcript Auto-Atendimento</h1>
        <p>Street Car Club • Sistema de Auto-Atendimento</p>
      </div>`;
    
    html += `<div class='info'>
      <div style='display: flex; align-items: center; gap: 15px; margin-bottom: 15px;'>
        ${autorAvatar ? `<img src='${autorAvatar}' alt='Criador' style='width: 48px; height: 48px; border-radius: 50%; border: 2px solid var(--primary-color);'>` : ''}
        <div>
          <div><strong><i class="fas fa-user"></i> Criador:</strong> ${autorTag ? autorTag : autorId || 'Desconhecido'}</div>
          <div><strong><i class="fas fa-ticket-alt"></i> Tipo:</strong> ${categoryType}</div>
          <div><strong><i class="fas fa-shield-alt"></i> Staff responsável pelo fechamento:</strong> ${staffTag}</div>
        </div>
        ${staffAvatar ? `<img src='${staffAvatar}' alt='Staff' style='width: 48px; height: 48px; border-radius: 50%; border: 2px solid var(--primary-color); margin-left: auto;'>` : ''}
      </div>
      <div><strong><i class="fas fa-hashtag"></i> Canal:</strong> #${channel.name} | <strong><i class="fas fa-calendar-alt"></i> Data de Fechamento:</strong> ${new Date().toLocaleString('pt-BR')}</div>
    </div>`;

    for (const msg of sorted) {
      const isStaff = msg.member && msg.member.roles.cache.has(config.supportRoleId);
      html += `<div class='msg${isStaff ? ' staff' : ''}'>`;
      html += `<div class='meta'><img src='${msg.author.displayAvatarURL()}' alt='avatar'> <strong>${msg.author.tag}</strong> <span>(${msg.author.id})</span> • ${new Date(msg.createdTimestamp).toLocaleString('pt-BR')}</div>`;
      
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
    
    html += `<div class='footer'><i class="fas fa-robot"></i> Transcript gerado automaticamente pelo sistema de Auto-Atendimento Street Car Club.</div>
    </div>
    </body></html>`;

    // Enviar para canal de logs
    console.log('[Auto-Atendimento] Enviando transcript para canal de logs...');
    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('📑 Auto-Atendimento Fechado')
      .setDescription(`Ticket de auto-atendimento fechado por <@${user.id}>`)
      .addFields(
        { name: 'Canal', value: `${channel.name}`, inline: true },
        { name: 'Criador', value: autorId ? `<@${autorId}>` : 'Desconhecido', inline: true },
        { name: 'Tipo', value: categoryType, inline: true },
        { name: 'Fechado por', value: `<@${user.id}>`, inline: true }
      )
      .setTimestamp();

    const logChannel = await guild.channels.fetch(config.transcriptChannelId).catch(() => null);
    if (logChannel) {
      await logChannel.send({ 
        embeds: [embed], 
        files: [{ attachment: Buffer.from(html, 'utf-8'), name: `transcript-${channel.name}.html` }] 
      });
      console.log('[Auto-Atendimento] Transcript enviado com sucesso!');
    } else {
      console.error('[Auto-Atendimento] Canal de logs não encontrado!');
    }

    await interaction.editReply({ content: '✅ Ticket fechado e transcript enviado para a staff!' });

    // Deletar o canal após 5 segundos
    setTimeout(async () => {
      try {
        await channel.delete(`Auto-atendimento fechado por ${user.tag}`);
        console.log('[Auto-Atendimento] Canal deletado com sucesso!');
      } catch (error) {
        console.error('[Auto-Atendimento] Erro ao deletar canal:', error);
      }
    }, 5000);

  } catch (error) {
    console.error('[Auto-Atendimento] Erro ao fechar ticket:', error);
    await interaction.editReply({ content: '❌ Erro ao fechar o ticket.' }).catch(() => {});
  }
}

