import { EmbedBuilder } from 'discord.js';
import { TICKET_PERMISSIONS } from '../config.js';
import { configurarPermissoesTicket } from '../utils/ticketPermissions.js';

export const data = {
  name: 'corrigir-permissoes',
  description: 'Corrige as permissões de todos os tickets existentes.'
};

export async function execute(message, args, client) {
  // Verificar se o usuário tem permissão de administrador
  if (!message.member.permissions.has('Administrator')) {
    return message.reply('❌ Você precisa ter permissão de Administrador para usar este comando.');
  }

  const guild = message.guild;
  const embed = new EmbedBuilder()
    .setColor('#FFA500')
    .setTitle('🔧 Corrigindo Permissões dos Tickets')
    .setDescription('Iniciando correção das permissões de todos os tickets...')
    .setTimestamp();

  const statusMsg = await message.reply({ embeds: [embed] });

  let ticketsCorrigidos = 0;
  let ticketsComErro = 0;
  const categorias = Object.keys(TICKET_PERMISSIONS);

  // Buscar todos os canais que parecem ser tickets
  const ticketChannels = guild.channels.cache.filter(channel => {
    if (channel.type !== 0) return false; // Apenas canais de texto
    
    // Verificar se o nome do canal corresponde ao padrão de tickets
    return categorias.some(categoria => {
      const emoji = TICKET_PERMISSIONS[categoria].emoji;
      return channel.name.startsWith(`${emoji}${categoria}-`);
    });
  });

  embed.setDescription(`Encontrados ${ticketChannels.size} tickets para corrigir...`);
  await statusMsg.edit({ embeds: [embed] });

  for (const [channelId, channel] of ticketChannels) {
    try {
      // Determinar a categoria do ticket baseado no nome
      let categoriaEncontrada = null;
      for (const categoria of categorias) {
        const emoji = TICKET_PERMISSIONS[categoria].emoji;
        if (channel.name.startsWith(`${emoji}${categoria}-`)) {
          categoriaEncontrada = categoria;
          break;
        }
      }

      if (!categoriaEncontrada) {
        console.log(`Não foi possível determinar a categoria do ticket: ${channel.name}`);
        ticketsComErro++;
        continue;
      }

      // Extrair o nome do usuário do nome do canal
      const nomePartes = channel.name.split('-');
      if (nomePartes.length < 2) {
        console.log(`Formato de nome inválido para o ticket: ${channel.name}`);
        ticketsComErro++;
        continue;
      }

      // Buscar o usuário pelo nome (aproximado)
      const nomeUsuario = nomePartes.slice(1).join('-'); // Pega tudo após o primeiro hífen
      const usuario = guild.members.cache.find(member => 
        member.user.username.toLowerCase() === nomeUsuario.toLowerCase()
      );

      if (!usuario) {
        console.log(`Usuário não encontrado para o ticket: ${channel.name}`);
        ticketsComErro++;
        continue;
      }

      // Corrigir permissões
      await configurarPermissoesTicket(channel, categoriaEncontrada, usuario.id);
      ticketsCorrigidos++;

      // Atualizar status a cada 5 tickets
      if (ticketsCorrigidos % 5 === 0) {
        embed.setDescription(`Corrigindo permissões... ${ticketsCorrigidos}/${ticketChannels.size} tickets processados`);
        await statusMsg.edit({ embeds: [embed] });
      }

    } catch (error) {
      console.error(`Erro ao corrigir permissões do ticket ${channel.name}:`, error);
      ticketsComErro++;
    }
  }

  // Resultado final
  embed.setColor(ticketsComErro === 0 ? '#43B581' : '#FFA500')
    .setTitle('✅ Correção de Permissões Concluída')
    .setDescription(
      `**Resultado da correção:**\n` +
      `✅ Tickets corrigidos: ${ticketsCorrigidos}\n` +
      `❌ Tickets com erro: ${ticketsComErro}\n` +
      `📊 Total processado: ${ticketChannels.size}`
    )
    .setFooter({ text: 'Sistema de Tickets StreetCarClub' });

  await statusMsg.edit({ embeds: [embed] });
} 