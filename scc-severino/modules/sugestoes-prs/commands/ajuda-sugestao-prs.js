import { EmbedBuilder } from 'discord.js';

export default {
  data: {
    name: 'ajuda-sugestao-prs',
    description: 'Mostra ajuda sobre o sistema de sugestões PRS automático'
  },
  
  async execute(message, args, client) {
    const embed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle('🏁 Sistema de Sugestões PRS Automático - Ajuda')
      .setDescription('Como usar o sistema de sugestões PRS automático do **Street Car Club**')
      .addFields(
        { name: '🎯 Como Funciona', value: 
          'O sistema é **automático**! Basta enviar uma mensagem no canal de sugestões PRS e ela será convertida automaticamente em uma sugestão com votação.', inline: false },
        { name: '📝 Como Criar Sugestões PRS', value: 
          '1. Vá para o canal de sugestões PRS\n' +
          '2. Digite sua sugestão normalmente\n' +
          '3. A mensagem será automaticamente convertida\n' +
          '4. Um thread será criado para debate\n' +
          '5. Os membros podem votar com 👍 ou 👎', inline: false },
        { name: '📊 Como Votar', value: 
          '• Clique em 👍 para concordar com a sugestão\n' +
          '• Clique em 👎 para discordar da sugestão\n' +
          '• Você pode mudar seu voto a qualquer momento\n' +
          '• Os percentuais são atualizados automaticamente', inline: false },
        { name: '💬 Threads de Debate', value: 
          '• Cada sugestão cria automaticamente um thread\n' +
          '• Use o thread para discutir a sugestão\n' +
          '• Threads são arquivados após 60 minutos de inatividade', inline: false },
        { name: '📈 Sistema de Logs', value: 
          '• Todas as votações são registradas em canal separado\n' +
          '• Administradores podem acompanhar o progresso\n' +
          '• Lista completa de votantes é mantida', inline: false },
        { name: '🔧 Comandos Disponíveis', value: 
          '`!ajuda-sugestao-prs` - Mostra esta mensagem de ajuda', inline: false }
      )
      .setFooter({ text: 'Street Car Club • Sistema de Sugestões PRS Automático' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};

