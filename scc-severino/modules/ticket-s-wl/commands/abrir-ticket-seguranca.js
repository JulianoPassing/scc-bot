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
  
  let ticketChannel;
  try {
    ticketChannel = await createTicketChannel(guild, channelName, user, reason, ticketNumber, client);
  } catch (err) {
    console.error('Erro ao criar canal do ticket de segurança:', err);
    
    // Verificar se é erro de limite de canais atingido
    if (err.code === 30013) {
      return message.reply({ 
        content: '❌ **Limite de canais atingido!**\n\nO servidor atingiu o limite máximo de 500 canais. Entre em contato com a administração para resolver esta situação.' 
      });
    }
    
    return message.reply({ content: '❌ Erro ao criar o canal do ticket. Verifique se a categoria existe, se o bot tem permissão e se o ID está correto.' });
  }

  const welcomeEmbed = new EmbedBuilder()
            .setColor('#EAF207')
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

  // Mensagem automática informando sobre o horário de atendimento
  try {
    // Enviar como mensagem simples primeiro para teste
    await ticketChannel.send('Olá. Seu ticket foi recebido e está na fila para atendimento. Nossa equipe entrará em contato em breve, lembrando que nosso horário de atendimento é de segunda a sexta-feira. Não é necessário enviar novas mensagens.');
  } catch (error) {
    console.error('[ERRO] Falha ao enviar mensagem automática:', error);
  }

  await message.reply('✅ Ticket criado com sucesso!');
} 