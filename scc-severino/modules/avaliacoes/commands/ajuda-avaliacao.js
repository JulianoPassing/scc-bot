import { EmbedBuilder } from 'discord.js';

export default {
  data: {
    name: 'ajuda-avaliacao',
    description: 'Mostra ajuda sobre o sistema de avaliações'
  },
  
  async execute(message, args, client) {
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle('⭐ Sistema de Avaliações - Ajuda')
      .setDescription('Como usar o sistema de avaliações do **Street Car Club**')
      .addFields(
        { name: '🎯 Comandos Disponíveis', value: 
          '`!painel-avaliacao` - Cria um painel de avaliações\n' +
          '`!avaliacao-stats` - Mostra estatísticas das avaliações\n' +
          '`!ajuda-avaliacao` - Mostra esta mensagem de ajuda', inline: false },
        { name: '📊 Como Avaliar', value: 
          '1. Use `!painel-avaliacao` para criar um painel\n' +
          '2. Clique em uma das estrelas (1-5)\n' +
          '3. Adicione um comentário opcional\n' +
          '4. Sua avaliação será registrada!', inline: false },
        { name: '⏰ Limitações', value: 
          '• Você pode avaliar apenas uma vez por dia\n' +
          '• Avaliações são anônimas para outros usuários\n' +
          '• Comentários são opcionais mas muito bem-vindos', inline: false },
        { name: '🔧 Permissões', value: 
          '• `!painel-avaliacao` - Requer "Gerenciar Mensagens"\n' +
          '• `!avaliacao-stats` - Requer "Gerenciar Mensagens"\n' +
          '• Avaliar - Disponível para todos os membros', inline: false }
      )
      .setFooter({ text: 'Street Car Club • Sistema de Avaliações' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
}; 