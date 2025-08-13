import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createTicketChannel, getNextTicketNumber } from '../utils/ticketManager.js';
import config from '../config.json' with { type: 'json' };

export const data = {
  name: 'abrir-ticket-seguranca',
  description: 'Abre um ticket de segurança.'
};

export async function execute(message, args, client) {
  const user = message.author;
  const guild = message.guild;
  const reason = args.join(' ') || 'Sem motivo especificado';

  // Verifica se já existe ticket em qualquer categoria de segurança
  const existing = guild.channels.cache.find(
    channel => channel.name === `seg-${user.username.toLowerCase()}` && 
               config.securityCategories.includes(channel.parentId)
  );
  if (existing) {
    return message.reply('❌ Você já possui um ticket aberto: ' + existing.toString());
  }

  const ticketNumber = await getNextTicketNumber();
  const channelName = `seg-${user.username.toLowerCase()}`;
  
  console.log('[DEBUG] Criando canal:', channelName);
  const ticketChannel = await createTicketChannel(guild, channelName, user, reason, ticketNumber, client);
  console.log('[DEBUG] Canal criado:', ticketChannel.id, ticketChannel.name);

  const welcomeEmbed = new EmbedBuilder()
    .setColor('#0099FF')
    .setTitle(`🛡️ Ticket de Segurança #${ticketNumber}`)
    .setDescription(`Olá ${user}, obrigado por abrir um ticket de segurança.`)
    .addFields(
      { name: 'Motivo', value: reason },
      { name: 'Instruções', value: 'Descreva seu problema. A equipe irá te atender em breve.' }
    )
    .setFooter({ text: 'Use o botão abaixo para fechar este ticket quando resolvido.' })
    .setTimestamp();

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

  console.log('[DEBUG] Primeira mensagem enviada com sucesso');

  // Mensagem automática informando sobre o horário de atendimento
  try {
    console.log('[DEBUG] Tentando enviar mensagem automática...');
    console.log('[DEBUG] Canal ID:', ticketChannel.id);
    console.log('[DEBUG] Canal existe:', !!ticketChannel);
    
    // Enviar como mensagem simples primeiro para teste
    const sentMessage = await ticketChannel.send('Olá. Seu ticket foi recebido e está na fila para atendimento. Nossa equipe entrará em contato em breve, lembrando que nosso horário de atendimento é de segunda a sexta-feira. Não é necessário enviar novas mensagens.');
    
    console.log('[DEBUG] Mensagem automática enviada com sucesso. ID da mensagem:', sentMessage.id);
  } catch (error) {
    console.error('[ERRO] Falha ao enviar mensagem automática:', error);
    console.error('[ERRO] Stack trace:', error.stack);
  }

  await message.reply('✅ Ticket criado com sucesso!');
} 