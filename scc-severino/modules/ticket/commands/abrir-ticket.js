import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createTicketChannelWithCategoryCheck } from '../utils/ticketUtils.js';
import { hasActiveTicketInCategory, registerActiveTicket, getUserActiveTicket } from '../utils/ticketManager.js';
import { hasCategoryPermission } from '../utils/ticketPermissions.js';
import { CATEGORY_CONFIG } from '../config.js';

export const data = {
  name: 'abrir-ticket',
  description: 'Abre um ticket de suporte (apenas staff).'
};

export async function execute(message, args, client) {
  const user = message.author;
  const guild = message.guild;
  const member = message.member;
  const reason = args.join(' ') || 'Sem motivo especificado';

  // Apenas staff pode usar este comando
  if (!member || !hasCategoryPermission(member, 'suporte')) {
    return message.reply('❌ Apenas a equipe de staff pode usar este comando.');
  }

  // Verifica se o usuário já tem tickets ativos
  const activeTickets = await getUserActiveTicket(user.id);
  if (activeTickets) {
    const ticketList = Object.entries(activeTickets).map(([category, ticket]) => {
      const categoryConfig = CATEGORY_CONFIG[category];
      const categoryName = categoryConfig ? categoryConfig.name : category;
      return `• **${categoryName}**: <#${ticket.channelId}>`;
    }).join('\n');
    
    return message.reply(`❌ Você já possui tickets ativos:\n${ticketList}\n\nVocê só pode ter 1 ticket por categoria. Feche os tickets existentes antes de abrir novos.`);
  }

  // Cria o canal do ticket com verificação de categoria cheia
  const channelName = `ticket-${user.id}`;
  
  // Usar categoria de suporte por padrão
  const categoriaId = '1386490182085382294'; // ID da categoria de suporte
  const categoryName = 'suporte'; // Nome da categoria para registro
  
  let ticketResult;
  try {
    ticketResult = await createTicketChannelWithCategoryCheck(
      guild,
      channelName,
      categoriaId,
      user.id,
      `Ticket de Suporte | creatorId=${user.id} | ${user.tag} | ${reason}`
    );
  } catch (err) {
    console.error('Erro ao criar canal do ticket:', err, 'Categoria:', categoriaId, 'Guild:', guild.id);
    
    // Verificar se é erro de limite de canais atingido
    if (err.code === 30013) {
      return message.reply({ 
        content: '❌ **Limite de canais atingido!**\n\nO servidor atingiu o limite máximo de canais. Entre em contato com a administração para resolver esta situação.' 
      });
    }
    
    return message.reply({ content: '❌ Erro ao criar o canal do ticket. Verifique se a categoria existe, se o bot tem permissão e se o ID está correto.' });
  }
  
  const ticketChannel = ticketResult.channel;
  const categoryFull = ticketResult.categoryFull;
  
  // Registrar o ticket ativo
  await registerActiveTicket(user.id, categoryName, ticketChannel.id, ticketChannel.name);

  const welcomeEmbed = new EmbedBuilder()
            .setColor(categoryFull ? '#FFA500' : '#EAF207')
    .setTitle(`🎫 Ticket de Suporte`)
    .setDescription(`Olá ${user}, obrigado por abrir um ticket de suporte.`)
    .addFields(
      { name: 'Motivo', value: reason },
      { name: 'Instruções', value: 'Descreva seu problema. A equipe irá te atender em breve.' }
    )
    .setFooter({ text: 'Use o botão abaixo para fechar este ticket quando resolvido.' })
    .setTimestamp();

  // Adicionar aviso se a categoria estiver cheia
  if (categoryFull) {
    welcomeEmbed.addFields({
      name: '⚠️ Aviso',
      value: 'A categoria de suporte está cheia. Este ticket foi criado fora da categoria organizacional.'
    });
  }

  const closeButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('Fechar Ticket')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒')
  );

  await ticketChannel.send({
    content: `${user}`,
    embeds: [welcomeEmbed],
    components: [closeButton]
  });
  await message.reply('✅ Ticket criado com sucesso!');
} 