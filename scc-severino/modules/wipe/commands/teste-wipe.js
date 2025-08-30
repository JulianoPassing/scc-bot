import { EmbedBuilder } from 'discord.js';

export const data = {
  name: 'teste-wipe',
  description: 'Testa o envio da mensagem de wipe para um membro específico.'
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
    const memberId = '405487427327885313';

    // Buscar o servidor
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return message.reply('❌ Servidor não encontrado.');
    }

    // Buscar o membro específico
    const member = guild.members.cache.get(memberId);
    if (!member) {
      return message.reply('❌ Membro não encontrado.');
    }

    // Criar o embed
    const embed = new EmbedBuilder()
      .setColor('#FF6B35')
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

    // Enviar mensagem para o membro específico
    try {
      await member.send({ embeds: [embed] });
      
      // Relatório de sucesso
      const reportEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Teste Realizado com Sucesso!')
        .setDescription(
          `📤 **Mensagem enviada para:** ${member.user.tag}\n` +
          `🆔 **ID do membro:** ${memberId}\n` +
          `📝 **Status:** Mensagem entregue com sucesso`
        )
        .setTimestamp();

      await message.channel.send({ embeds: [reportEmbed] });
      
    } catch (error) {
      console.error(`Erro ao enviar mensagem para ${member.user.tag}:`, error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Erro no Envio')
        .setDescription(
          `❌ **Erro ao enviar para:** ${member.user.tag}\n` +
          `🆔 **ID do membro:** ${memberId}\n` +
          `📝 **Erro:** ${error.message}`
        )
        .setTimestamp();

      await message.channel.send({ embeds: [errorEmbed] });
    }

  } catch (error) {
    console.error('Erro no comando teste-wipe:', error);
    await message.reply('❌ Ocorreu um erro ao executar o comando.');
  }
}
