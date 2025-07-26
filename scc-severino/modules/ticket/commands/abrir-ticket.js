import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { TICKET_PERMISSIONS, CREATOR_PERMISSIONS, STAFF_PERMISSIONS } from '../config.js';
import { configurarPermissoesTicket } from '../utils/ticketPermissions.js';
import { cooldownManager } from '../utils/cooldownManager.js';

export const data = {
  name: 'abrir-ticket',
  description: 'Abre um ticket de suporte.'
};

export async function execute(message, args, client) {
  const user = message.author;
  const guild = message.guild;
  const reason = args.join(' ') || 'Sem motivo especificado';

  // Verifica se já existe ticket
  const existing = guild.channels.cache.find(channel => {
    const categorias = Object.keys(TICKET_PERMISSIONS);
    return categorias.some(categoria => {
      const emoji = TICKET_PERMISSIONS[categoria].emoji;
      return channel.name.startsWith(`${emoji}${categoria}-`) && 
             channel.name.includes(user.username.toLowerCase());
    });
  });
  
  if (existing) {
    return message.reply('❌ Você já possui um ticket aberto: ' + existing.toString());
  }

  // Verificar cooldown do usuário (5 segundos)
  const timeLeft = cooldownManager.checkCooldown(user.id, 5000);
  if (timeLeft !== null) {
    return message.reply(`⏳ Aguarde ${timeLeft} segundos antes de abrir outro ticket.`);
  }

  // Definir cooldown
  cooldownManager.setCooldown(user.id, 5000);

  // Usar categoria de suporte como padrão
  const categoria = TICKET_PERMISSIONS.suporte;
  
  // Verificar se a categoria está cheia (máximo 50 canais por categoria)
  const categoriaChannel = guild.channels.cache.get(categoria.categoriaId);
  let parentId = categoria.categoriaId;
  
  if (categoriaChannel && categoriaChannel.children?.cache.size >= 50) {
    // Categoria cheia, criar no topo do servidor
    parentId = null;
    console.log(`Categoria ${categoria.nome} está cheia, criando ticket no topo do servidor`);
  }

  // Cria o canal do ticket SEM herdar permissões da categoria
  const channelName = `📁suporte-${user.username.toLowerCase()}`;
  const ticketChannel = await guild.channels.create({
    name: channelName,
    type: 0, // GuildText
    parent: parentId,
    topic: `Ticket de Suporte | ${user.tag} | ${reason}`,
    position: parentId ? undefined : 0 // Posicionar no topo se não estiver em categoria
  });
  
  // Configurar permissões usando o utilitário
  await configurarPermissoesTicket(ticketChannel, 'suporte', user.id);

  const welcomeEmbed = new EmbedBuilder()
    .setColor('#0099FF')
    .setTitle(`🎫 Ticket de Suporte`)
    .setDescription(`Olá ${user}, obrigado por abrir um ticket de suporte.`)
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
  
  // Determinar onde o ticket foi criado
  const foiCriadoNoTopo = categoriaChannel && categoriaChannel.children?.cache.size >= 50;
  
  let mensagemConfirmacao = '✅ Ticket criado com sucesso!';
  if (foiCriadoNoTopo) {
    mensagemConfirmacao += '\n⚠️ **Nota:** Ticket criado no topo do servidor devido à categoria estar cheia.';
  }
  
  await message.reply(mensagemConfirmacao);
} 