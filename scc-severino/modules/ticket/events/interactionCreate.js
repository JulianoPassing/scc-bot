import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { createTicketChannelWithCategoryCheck } from '../utils/ticketUtils.js';
import { hasActiveTicketInCategory, registerActiveTicket, removeActiveTicket, loadTicketsData } from '../utils/ticketManager.js';
import { CATEGORY_CONFIG } from '../config.js';

function extractCreatorIdFromTopic(topic) {
  if (!topic) return null;
  const match = topic.match(/creatorId\s*=\s*(\d{17,19})/i);
  return match ? match[1] : null;
}

async function findCreatorIdFromTicketsData(channelId) {
  const data = await loadTicketsData();
  for (const [userId, userTickets] of Object.entries(data.activeTickets || {})) {
    for (const ticketData of Object.values(userTickets || {})) {
      if (ticketData?.channelId === channelId) return userId;
    }
  }
  return null;
}

async function findCreatorIdFromNotifyMessage(channel) {
  let lastId;
  for (let i = 0; i < 25; i++) { // até 2500 mensagens (25x100)
    const options = { limit: 100 };
    if (lastId) options.before = lastId;

    const messages = await channel.messages.fetch(options);
    if (!messages.size) break;

    const notifyMsg = messages.find(m => m.content && m.content.includes('abriu um ticket!'));
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
    const excludedIds = new Set([
      guild.roles.everyone.id,
      client.user.id
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

async function getTicketCreatorId({ channel, client, guild }) {
  // 1) topic (persistente e rápido)
  const fromTopic = extractCreatorIdFromTopic(channel.topic);
  if (fromTopic) return fromTopic;

  // 2) tickets.json (registro do bot)
  const fromData = await findCreatorIdFromTicketsData(channel.id).catch(() => null);
  if (fromData) return fromData;

  // 3) mensagem de abertura (com paginação)
  const fromNotify = await findCreatorIdFromNotifyMessage(channel).catch(() => null);
  if (fromNotify) return fromNotify;

  // 4) último recurso: heurística pelas permissões do canal
  return await findCreatorIdFromChannelPermissions(channel, client, guild).catch(() => null);
}

/**
 * Verifica se um usuário tem cargo de staff
 * @param {GuildMember} member - Membro do servidor
 * @returns {boolean} True se o membro tem cargo de staff
 */
function hasStaffRole(member) {
  const staffRoles = [
    '1204393192284229692', // Cargo de Suporte
    '1046404063673192542', // Cargo de Staff
    '1277638402019430501', // Cargo de Moderador
    '1226903187055972484', // Cargo de Admin
    '1226907937117569128', // Cargo de Gerente
    '1230131375965737044', // Cargo de Supervisor
    '1046404063522197521', // Cargo de Owner
    '1311023008495698081'  // Cargo específico de Casas
  ];
  
  return staffRoles.some(roleId => member.roles.cache.has(roleId));
}

/**
 * Verifica se um usuário é o criador do ticket
 * @param {TextChannel} channel - Canal do ticket
 * @param {string} userId - ID do usuário a verificar
 * @param {Client} client - Client do discord.js
 * @param {Guild} guild - Guild do Discord
 * @returns {boolean} True se o usuário é o criador do ticket
 */
async function isTicketCreator(channel, userId, client, guild) {
  try {
    const creatorId = await getTicketCreatorId({ channel, client, guild });
    return creatorId === userId;
  } catch (error) {
    console.error('Erro ao verificar criador do ticket:', error);
    return false;
  }
}

const CATEGORY_IDS = {
  suporte: '1386490182085382294',
  bugs: '1386490279384846418',
  boost: '1386490600353828884',
  casas: '1386490752485294150',
  doacoes: '1386490511606419578',
  denuncias: '1386490428404138054',
  revisao: '1402054800933392565'
};
const CATEGORY_INFO = {
  suporte: { emoji: '📁', nome: 'Suporte', desc: 'Suporte técnico e ajuda geral' },
  bugs: { emoji: '🦠', nome: 'Reportar Bugs', desc: 'Reportar erros e problemas técnicos' },
  boost: { emoji: '🚀', nome: 'Boost', desc: 'Suporte para membros boosters' },
  casas: { emoji: '🏠', nome: 'Casas', desc: 'Questões relacionadas a casas e propriedades' },
  doacoes: { emoji: '💎', nome: 'Doações', desc: 'Assuntos relacionados a doações' },
  denuncias: { emoji: '⚠️', nome: 'Denúncias', desc: 'Reportar infrações e problemas de conduta' },
  revisao: { emoji: '🔍', nome: 'Revisão', desc: 'Solicitar revisão de decisões e processos' }
};

export const name = 'interactionCreate';
export const execute = async function(interaction) {
  try {
    // Verificar se é um ticket de segurança (começa com 'seg-')
    const channelName = interaction.channel?.name;
    const isSecurityTicket = channelName && channelName.startsWith('seg-');
    
    // Se for um ticket de segurança, ignorar (deixar o módulo ticket-s-wl processar)
    if (isSecurityTicket) {
      return;
    }
    
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
        const isStaff = hasStaffRole(interaction.member);
        
        if (!isStaff) {
          // Permitir acesso
        } else {
          await interaction.reply({ content: '❌ Apenas membros da equipe podem fechar tickets!', flags: 64 });
          return;
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
        const isStaff = hasStaffRole(interaction.member);
        
        if (!isStaff) {
          // Permitir acesso
        } else {
          await interaction.reply({ content: '❌ Apenas membros da equipe podem assumir tickets!', flags: 64 });
          return;
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
        const isStaff = hasStaffRole(interaction.member);
        
        if (!isStaff) {
          // Permitir acesso
        } else {
          await interaction.reply({ content: '❌ Apenas membros da equipe podem adicionar membros!', flags: 64 });
          return;
        }
        
        await interaction.showModal(
          new ModalBuilder()
            .setCustomId('modal_adicionar_membro')
            .setTitle('Adicionar Membro ao Ticket')
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('membro')
                  .setLabel('Discord ID do usuário')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(true)
                  .setPlaceholder('Ex: 123456789012345678')
              )
            )
        );
        return;
      }
      if (customId === 'avisar_membro') {
        const isStaff = hasStaffRole(interaction.member);
        
        if (!isStaff) {
          // Permitir acesso
        } else {
          await interaction.reply({ content: '❌ Apenas membros da equipe podem avisar membros!', flags: 64 });
          return;
        }
        
        console.log(`[DEBUG] Permitindo acesso ao avisar membro para ${interaction.user.tag}`);
        
        const channel = interaction.channel;
        const autorId = await getTicketCreatorId({ channel, client: interaction.client, guild });
        if (autorId) {
          const embed = new EmbedBuilder()
            .setColor('#EAF207')
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
        const isStaff = hasStaffRole(interaction.member);
        
        if (!isStaff) {
          // Permitir acesso
        } else {
          await interaction.reply({ content: '❌ Apenas membros da equipe podem renomear tickets!', flags: 64 });
          return;
        }
        
        const name = interaction.channel.name;
        
        // Verificar se é um ticket de segurança (começa com 'seg-') - se for, ignorar
        if (name.startsWith('seg-')) {
          return; // É um ticket de segurança, deixar o módulo ticket-s-wl processar
        }
        
        // Melhor lógica para detectar o emoji - verifica se o nome começa com qualquer emoji conhecido
        let emoji = '';
        if (name.startsWith('📁')) emoji = '📁';
        else if (name.startsWith('🦠')) emoji = '🦠';
        else if (name.startsWith('🚀')) emoji = '🚀';
        else if (name.startsWith('🏠')) emoji = '🏠';
        else if (name.startsWith('💎')) emoji = '💎';
        else if (name.startsWith('⚠️')) emoji = '⚠️';
        
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
        const isStaff = hasStaffRole(interaction.member);
        
        if (!isStaff) {
          // Permitir acesso
        } else {
          await interaction.reply({ content: '❌ Apenas membros da equipe podem usar timer!', flags: 64 });
          return;
        }
        
        console.log(`[DEBUG] Permitindo acesso ao timer para ${interaction.user.tag}`);
        
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
            
            // Identificar o criador do ticket antes de fechar
            let ticketCreatorId = null;
            let ticketCategory = null;
            const data = await loadTicketsData();
            const channelId = interaction.channel.id;
            
            // Encontrar o usuário que possui este ticket
            for (const [userId, userTickets] of Object.entries(data.activeTickets)) {
              for (const [category, ticketData] of Object.entries(userTickets)) {
                if (ticketData.channelId === channelId) {
                  ticketCreatorId = userId;
                  ticketCategory = category;
                  await removeActiveTicket(userId, category);
                  break;
                }
              }
            }

            // Enviar mensagem privada ao criador do ticket solicitando avaliação
            if (ticketCreatorId) {
              try {
                const ticketCreator = await interaction.client.users.fetch(ticketCreatorId);
                const evaluationEmbed = new EmbedBuilder()
                  .setColor('#FF6B6B')
                  .setTitle('🎫 Ticket Fechado - Avalie seu Atendimento')
                  .setDescription(
                    'Olá! Seu ticket foi fechado automaticamente após 24h de inatividade.\n\n' +
                    '**Não se esqueça de avaliar seu último atendimento!**\n\n' +
                    'Sua opinião é muito importante para continuarmos melhorando nossos serviços.\n\n' +
                    '📝 **Avalie aqui:** https://discord.com/channels/1046404063287332936/1394727160991842324'
                  )
                  .addFields(
                    { name: 'Categoria do Ticket', value: ticketCategory ? ticketCategory.charAt(0).toUpperCase() + ticketCategory.slice(1) : 'Suporte', inline: true },
                    { name: 'Motivo do Fechamento', value: 'Timer de 24h esgotado', inline: true }
                  )
                  .setFooter({ text: 'StreetCarClub • Atendimento de Qualidade' })
                  .setTimestamp();

                await ticketCreator.send({ embeds: [evaluationEmbed] });
              } catch (error) {
                console.error('Erro ao enviar mensagem privada para avaliação (Timer):', error);
              }
            }
            
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
        // Verificar se é staff OU é o criador do ticket
        const isStaff = hasStaffRole(interaction.member);
        const isCreator = await isTicketCreator(interaction.channel, interaction.user.id, interaction.client, interaction.guild);
        
        // Permitir se é staff OU é o criador do ticket
        if (isStaff || isCreator) {
          // Permitir acesso
        } else {
          await interaction.reply({ content: '❌ Apenas membros da equipe ou o criador do ticket podem cancelar timer!', flags: 64 });
          return;
        }
        
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
      // Deferir a resposta imediatamente para evitar timeout
      await interaction.deferReply({ flags: 64 });
      
      const tipo = interaction.customId.replace('modal_ticket_assunto_', '');
      const categoria = CATEGORY_INFO[tipo];
      const categoriaId = CATEGORY_IDS[tipo];
      if (!categoria || !categoriaId) {
        await interaction.editReply({ content: '❌ Categoria inválida ou não configurada.' });
        return;
      }
      
      const user = interaction.user;
      
      // Verificar se o usuário já tem ticket ativo nesta categoria
      const hasActiveTicket = await hasActiveTicketInCategory(user.id, tipo);
      if (hasActiveTicket) {
        const categoriaConfig = CATEGORY_CONFIG[tipo];
        const categoriaName = categoriaConfig ? categoriaConfig.name : tipo;
        await interaction.editReply({ content: `❌ Você já possui um ticket ativo na categoria **${categoriaName}**. Você só pode ter 1 ticket por categoria.` });
        return;
      }
      
      const assunto = interaction.fields.getTextInputValue('assunto');
      const guild = interaction.guild;
      const emoji = categoria.emoji;
      const tipoNome = tipo;
      const channelName = `${emoji}${tipoNome}-${user.username.toLowerCase()}`;
      let ticketResult;
      try {
        // Usar a nova função que verifica se a categoria está cheia
        ticketResult = await createTicketChannelWithCategoryCheck(
          guild,
          channelName,
          categoriaId,
          user.id,
          `Ticket de ${categoria.nome} | creatorId=${user.id} | ${user.tag}`
        );
      } catch (err) {
        console.error('Erro ao criar canal do ticket:', err, 'Categoria:', categoriaId, 'Guild:', guild.id);
        
        // Verificar se é erro de limite de canais atingido
        if (err.code === 30013) {
          await interaction.editReply({ 
            content: '❌ **Limite de canais atingido!**\n\nO servidor atingiu o limite máximo de canais. Entre em contato com a administração para resolver esta situação.' 
          });
          return;
        }
        
        await interaction.editReply({ content: '❌ Erro ao criar o canal do ticket. Verifique se a categoria existe, se o bot tem permissão e se o ID está correto.' });
        return;
      }
      
      const ticketChannel = ticketResult.channel;
      const categoryFull = ticketResult.categoryFull;
      
      // Registrar o ticket ativo
      await registerActiveTicket(user.id, tipo, ticketChannel.id, ticketChannel.name);
      
      const notifyMsg = await ticketChannel.send({ content: `🔔 <@${user.id}> abriu um ticket! Equipe notificada:` });
      await notifyMsg.pin().catch(() => {});
      
      // Verificar se é um ticket de doações e enviar mensagem privada para usuários específicos
      if (categoriaId === '1386490511606419578') {
        const usuariosNotificar = ['384772320918765580', '405487427327885313', '411224920085889024'];
        
        for (const userId of usuariosNotificar) {
          try {
            const userToNotify = await interaction.client.users.fetch(userId);
            const embedNotificacao = new EmbedBuilder()
              .setColor('#FF6B6B')
              .setTitle('💎 Novo Ticket de Doação')
              .setDescription(`Um novo ticket de doação foi aberto no servidor StreetCarClub.`)
              .addFields(
                { name: 'Criador', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Assunto', value: assunto, inline: true },
                { name: 'Canal', value: `<#${ticketChannel.id}>`, inline: true },
                { name: 'Data', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
              )
              .setFooter({ text: 'StreetCarClub • Sistema de Notificações' })
              .setTimestamp();
            
            await userToNotify.send({ embeds: [embedNotificacao] });
          } catch (error) {
            console.error(`Erro ao enviar notificação para ${userId}:`, error);
          }
        }
      }
      
      const embed = new EmbedBuilder()
        .setColor(categoryFull ? '#FFA500' : '#EAF207')
        .setTitle(`📑 Ticket Aberto - ${categoria.emoji} ${categoria.nome}`)
        .setDescription(`Olá <@${user.id}>, obrigado por entrar em contato!\n\nSua solicitação foi registrada e nossa equipe irá te atender o mais breve possível. Acompanhe o status do seu ticket por aqui.`)
        .addFields(
          { name: 'Categoria', value: `${categoria.emoji} ${categoria.nome}`, inline: true },
          { name: 'Status', value: '⏳ Aguardando atendimento', inline: true },
          { name: 'Tempo de Resposta', value: 'Até 72h úteis', inline: true },
          { name: 'Assunto', value: assunto, inline: false },
          { name: 'Descrição', value: categoria.desc, inline: false }
        )
        .setImage('https://i.imgur.com/kHvmXj6.png')
        .setFooter({ text: 'StreetCarClub • Atendimento de Qualidade | ™ Street CarClub © All rights reserved', iconURL: null })
        .setTimestamp();

      // Adicionar aviso se a categoria estiver cheia
      if (categoryFull) {
        embed.addFields({
          name: '⚠️ Aviso',
          value: 'A categoria está cheia. Este ticket foi criado fora da categoria organizacional.',
          inline: false
        });
      }
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar Ticket').setStyle(ButtonStyle.Secondary).setEmoji('🔒'),
        new ButtonBuilder().setCustomId('assumir_ticket').setLabel('Assumir Ticket').setStyle(ButtonStyle.Secondary).setEmoji('🫡'),
        new ButtonBuilder().setCustomId('adicionar_membro').setLabel('Adicionar Membro').setStyle(ButtonStyle.Secondary).setEmoji('➕')
      );
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('avisar_membro').setLabel('Avisar Membro').setStyle(ButtonStyle.Secondary).setEmoji('🔔'),
        new ButtonBuilder().setCustomId('renomear_ticket').setLabel('Renomear Ticket').setStyle(ButtonStyle.Secondary).setEmoji('✏️'),
        new ButtonBuilder().setCustomId('timer_24h').setLabel('Timer 24h').setStyle(ButtonStyle.Secondary).setEmoji('⏰')
      );
      await ticketChannel.send({ embeds: [embed], components: [row1, row2] });
      await interaction.editReply({ content: `✅ Ticket criado em <#${ticketChannel.id}>!` });
      return;
    }
    // Handler do modal de renomear
    if (interaction.isModalSubmit() && interaction.customId === 'modal_renomear_ticket') {
      const isStaff = hasStaffRole(interaction.member);
      
      if (!isStaff) {
        // Permitir acesso
      } else {
        await interaction.reply({ content: '❌ Apenas membros da equipe podem renomear tickets!', flags: 64 });
        return;
      }
      
      const name = interaction.channel.name;
      
      // Verificar se é um ticket de segurança (começa com 'seg-') - se for, ignorar
      if (name.startsWith('seg-')) {
        return; // É um ticket de segurança, deixar o módulo ticket-s-wl processar
      }
      
      await interaction.deferReply({ flags: 64 });
      const novoNome = interaction.fields.getTextInputValue('novo_nome');
      
      // Debug: log do nome atual do canal
      console.log('[DEBUG] Nome atual do canal:', name);
      
              // Lógica melhorada para detectar o emoji - verifica se o nome começa com qualquer emoji conhecido
        let emoji = '';
        if (name.startsWith('📁')) emoji = '📁';
        else if (name.startsWith('🦠')) emoji = '🦠';
        else if (name.startsWith('🚀')) emoji = '🚀';
        else if (name.startsWith('🏠')) emoji = '🏠';
        else if (name.startsWith('💎')) emoji = '💎';
        else if (name.startsWith('⚠️')) emoji = '⚠️';
        else if (name.startsWith('🔍')) emoji = '🔍';
      
      // Debug: log do emoji detectado
      console.log('[DEBUG] Emoji detectado:', emoji);
      
      let finalName = novoNome;
      if (emoji && !finalName.startsWith(emoji)) {
        finalName = emoji + finalName;
      }
      
      console.log('[DEBUG] Nome final:', finalName);
      
      await interaction.channel.setName(finalName);
      await interaction.editReply({ content: `✏️ Nome do ticket alterado para: ${finalName}` });
      return;
    }
    // Handler do modal de adicionar membro
    if (interaction.isModalSubmit() && interaction.customId === 'modal_adicionar_membro') {
      const isStaff = hasStaffRole(interaction.member);
      
      if (!isStaff) {
        // Permitir acesso
      } else {
        await interaction.reply({ content: '❌ Apenas membros da equipe podem adicionar membros!', flags: 64 });
        return;
      }
      
      await interaction.deferReply({ flags: 64 });
      const membro = interaction.fields.getTextInputValue('membro');
      
      // Validar se é um Discord ID válido (apenas números)
      if (!/^\d{17,19}$/.test(membro)) {
        await interaction.editReply({ content: '❌ Discord ID inválido. Digite apenas os números do ID do usuário.' });
        return;
      }
      
      const userId = membro;
      
      try {
        // Verificar se o usuário existe
        const user = await interaction.client.users.fetch(userId);
        
        // Adicionar permissões ao canal
        await interaction.channel.permissionOverwrites.create(userId, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
          AttachFiles: true,
          EmbedLinks: true
        });
        
        await interaction.editReply({ content: `➕ <@${userId}> adicionado ao ticket com todas as permissões necessárias!` });
      } catch (e) {
        if (e.code === 10013) {
          await interaction.editReply({ content: '❌ Usuário não encontrado. Verifique se o Discord ID está correto.' });
        } else {
          await interaction.editReply({ content: '❌ Erro ao adicionar usuário ao ticket.' });
        }
      }
      return;
    }

    // Handler do modal de motivo de fechamento
    if (interaction.isModalSubmit() && interaction.customId === 'modal_motivo_fechamento') {
      const isStaff = hasStaffRole(interaction.member);
      
      if (!isStaff) {
        // Permitir acesso
      } else {
        await interaction.reply({ content: '❌ Apenas membros da equipe podem fechar tickets!', flags: 64 });
        return;
      }
      
      await interaction.deferReply({ flags: 64 });
      const motivo = interaction.fields.getTextInputValue('motivo');
      const user = interaction.user;
      const channel = interaction.channel;
      
      // Remover ticket do registro
      const data = await loadTicketsData();
      const channelId = channel.id;
      let ticketCreatorId = null;
      let ticketCategory = null;
      
      // Encontrar o usuário que possui este ticket
      for (const [userId, userTickets] of Object.entries(data.activeTickets)) {
        for (const [category, ticketData] of Object.entries(userTickets)) {
          if (ticketData.channelId === channelId) {
            ticketCreatorId = userId;
            ticketCategory = category;
            await removeActiveTicket(userId, category);
            break;
          }
        }
      }

      // Enviar mensagem privada ao criador do ticket solicitando avaliação
      if (ticketCreatorId) {
        try {
          const ticketCreator = await interaction.client.users.fetch(ticketCreatorId);
          const evaluationEmbed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('🎫 Ticket Fechado - Avalie seu Atendimento')
            .setDescription(
              'Olá! Seu ticket foi fechado pela nossa equipe.\n\n' +
              '**Não se esqueça de avaliar seu último atendimento!**\n\n' +
              'Sua opinião é muito importante para continuarmos melhorando nossos serviços.\n\n' +
              '📝 **Avalie aqui:** https://discord.com/channels/1046404063287332936/1394727160991842324'
            )
            .addFields(
              { name: 'Categoria do Ticket', value: ticketCategory ? ticketCategory.charAt(0).toUpperCase() + ticketCategory.slice(1) : 'Suporte', inline: true },
              { name: 'Fechado por', value: user.tag, inline: true }
            )
            .setFooter({ text: 'StreetCarClub • Atendimento de Qualidade' })
            .setTimestamp();

          await ticketCreator.send({ embeds: [evaluationEmbed] });
        } catch (error) {
          console.error('Erro ao enviar mensagem privada para avaliação:', error);
        }
      }
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
      let html = `<!DOCTYPE html><html lang='pt-BR'><head><meta charset='UTF-8'><title>Transcript Ticket - Street Car Club</title>
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
          <h1><i class="fas fa-ticket-alt"></i> Transcript do Ticket</h1>
          <p>Street Car Club • Sistema de Atendimento</p>
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
        .setTitle('📑 Ticket Fechado')
        .setDescription(`Ticket fechado por <@${user.id}>\n**Motivo:** ${motivo}`)
        .addFields(
          { name: 'Canal', value: `<#${channel.id}>`, inline: true },
          { name: 'Criador', value: autorId ? `<@${autorId}>` : 'Desconhecido', inline: true },
          { name: 'Fechado por', value: `<@${user.id}>`, inline: true }
        )
        .setTimestamp();
      const logChannel = await interaction.guild.channels.fetch('1386491920313745418').catch(() => null);
      if (logChannel) {
        await logChannel.send({ embeds: [embed], files: [{ attachment: Buffer.from(html, 'utf-8'), name: `transcript-${channel.name}.html` }] });
      }
      await interaction.editReply({ content: '✅ Ticket fechado e transcript HTML enviado para a staff!' });
      setTimeout(async () => {
        try {
          await channel.delete(`Ticket fechado por ${user.tag}`);
        } catch (error) {}
      }, 5000);
      return;
    }
  } catch (error) {
    try {
      if (interaction.deferred) {
        await interaction.editReply({ content: '❌ Ocorreu um erro ao processar sua interação.' });
      } else if (!interaction.replied) {
        await interaction.reply({ content: '❌ Ocorreu um erro ao processar sua interação.', flags: 64 });
      }
    } catch (e) {}
    console.error('Erro no handler de interactionCreate:', error);
  }
}; 