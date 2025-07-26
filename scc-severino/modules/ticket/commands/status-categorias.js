import { EmbedBuilder } from 'discord.js';
import { TICKET_PERMISSIONS } from '../config.js';

export const data = {
  name: 'status-categorias',
  description: 'Verifica o status das categorias de tickets.'
};

export async function execute(message, args, client) {
  // Verificar se o usuário tem permissão de gerenciar canais
  if (!message.member.permissions.has('ManageChannels')) {
    return message.reply('❌ Você precisa ter permissão de Gerenciar Canais para usar este comando.');
  }

  const guild = message.guild;
  const embed = new EmbedBuilder()
    .setColor('#0099FF')
    .setTitle('📊 Status das Categorias de Tickets')
    .setDescription('Informações sobre o uso das categorias de tickets')
    .setTimestamp();

  const categorias = Object.keys(TICKET_PERMISSIONS);
  const maxCanais = 50; // Máximo de canais por categoria

  for (const categoriaTipo of categorias) {
    const categoria = TICKET_PERMISSIONS[categoriaTipo];
    const categoriaChannel = guild.channels.cache.get(categoria.categoriaId);
    
    if (categoriaChannel) {
      const numCanais = categoriaChannel.children?.cache.size || 0;
      const porcentagem = Math.round((numCanais / maxCanais) * 100);
      const status = numCanais >= maxCanais ? '🔴 CHEIA' : 
                     numCanais >= maxCanais * 0.8 ? '🟡 ALTA' : 
                     numCanais >= maxCanais * 0.5 ? '🟠 MÉDIA' : '🟢 BAIXA';
      
      embed.addFields({
        name: `${categoria.emoji} ${categoria.nome}`,
        value: `**Canais:** ${numCanais}/${maxCanais} (${porcentagem}%)\n**Status:** ${status}\n**ID:** ${categoria.categoriaId}`,
        inline: true
      });
    } else {
      embed.addFields({
        name: `${categoria.emoji} ${categoria.nome}`,
        value: `❌ Categoria não encontrada\n**ID:** ${categoria.categoriaId}`,
        inline: true
      });
    }
  }

  // Adicionar informações gerais
  const totalTickets = guild.channels.cache.filter(channel => {
    if (channel.type !== 0) return false; // Apenas canais de texto
    return categorias.some(categoria => {
      const emoji = TICKET_PERMISSIONS[categoria].emoji;
      return channel.name.startsWith(`${emoji}${categoria}-`);
    });
  }).size;

  embed.addFields({
    name: '📈 Estatísticas Gerais',
    value: `**Total de Tickets:** ${totalTickets}\n**Categorias:** ${categorias.length}\n**Limite por Categoria:** ${maxCanais} canais`,
    inline: false
  });

  embed.setFooter({ text: 'Sistema de Tickets StreetCarClub' });

  await message.reply({ embeds: [embed] });
} 