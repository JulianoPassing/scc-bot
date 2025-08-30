import { EmbedBuilder } from 'discord.js';

export const data = {
  name: 'wipe',
  description: 'Envia mensagem de wipe para todos os membros com cargo específico.'
};

export async function execute(message, args, client) {
  try {
    // Verificar se o usuário tem um dos cargos permitidos
    const allowedRoles = ['1046404063689977984', '1046404063689977986'];
    const hasAllowedRole = message.member.roles.cache.some(role => allowedRoles.includes(role.id));
    
    if (!hasAllowedRole) {
      return message.reply('❌ Você não tem permissão para usar este comando. Apenas membros com cargos específicos podem utilizá-lo.');
    }

    const guildId = '1046404063287332936';
    const roleId = '1317086939555434557';

    // Buscar o servidor
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return message.reply('❌ Servidor não encontrado.');
    }

    // Buscar o cargo
    const role = guild.roles.cache.get(roleId);
    if (!role) {
      return message.reply('❌ Cargo não encontrado.');
    }

    // Buscar todos os membros com o cargo
    const members = guild.members.cache.filter(member => member.roles.cache.has(roleId));
    
    if (members.size === 0) {
      return message.reply('❌ Nenhum membro encontrado com este cargo.');
    }

    // Criar o embed
    const embed = new EmbedBuilder()
      .setColor('#EAF207')
      .setTitle('🎉 A contagem regressiva começou!')
      .setDescription(
        'Em uma semana, a **SEASON 5** vai revolucionar tudo que você conhece! 💥 Novas áreas, novas mecânicas e um mundo de novidades te esperando.\n\n' +
        'Prepare-se para um mapa cheio de oportunidades, com o novíssimo **Distrito 69** se tornando o centro de toda a inovação! 🗺️\n\n' +
        'Você já viu o que estamos preparando? 👀 Se liga no teaser:\n' +
        'https://www.youtube.com/watch?v=GGCUmlH4zVA\n\n' +
        'Quer ser o primeiro a saber de tudo? As novidades mais quentes já estão esperando por você no canal **#spoilers** do nosso Discord. Vem com a gente! 👉'
      )
      .setFooter({ text: 'StreetCarClub • Season 5 | ™ Street CarClub © All rights reserved' })
      .setTimestamp();

    // Contador para acompanhar o progresso
    let successCount = 0;
    let errorCount = 0;

    // Enviar mensagem para cada membro
    for (const [memberId, member] of members) {
      try {
        await member.send({ embeds: [embed] });
        successCount++;
        
        // Pequena pausa para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Erro ao enviar mensagem para ${member.user.tag}:`, error);
        errorCount++;
      }
    }

    // Relatório final
    const reportEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('📊 Relatório de Envio')
      .setDescription(
        `✅ **Mensagens enviadas com sucesso:** ${successCount}\n` +
        `❌ **Erros:** ${errorCount}\n` +
        `📝 **Total de membros:** ${members.size}`
      )
      .setTimestamp();

    await message.channel.send({ embeds: [reportEmbed] });

  } catch (error) {
    console.error('Erro no comando wipe:', error);
    await message.reply('❌ Ocorreu um erro ao executar o comando.');
  }
}
