import { EmbedBuilder } from 'discord.js';

export default {
  data: {
    name: 'ajuda-sugestao',
    description: 'Mostra ajuda sobre o sistema de sugestões'
  },
  
  async execute(message, args, client) {
    const embed = new EmbedBuilder()
      .setColor(0xffff00)
      .setTitle('💡 Sistema de Sugestões - Ajuda')
      .setDescription('Como usar o sistema de sugestões do **Street Car Club**')
      .addFields(
        { name: '🎯 Comandos Disponíveis', value: 
          '`!painel-sugestao <sugestão>` - Cria um painel de sugestões\n' +
          '`!sugestao-stats` - Mostra estatísticas das sugestões\n' +
          '`!ajuda-sugestao` - Mostra esta mensagem de ajuda', inline: false },
        { name: '📝 Como Criar Sugestões', value: 
          '1. Use `!painel-sugestao <sua sugestão>`\n' +
          '2. Exemplo: `!painel-sugestao Adicionar mais canais de carros`\n' +
          '3. O painel será criado com botões de votação', inline: false },
        { name: '📊 Como Votar', value: 
          '• Clique em 👍 para concordar com a sugestão\n' +
          '• Clique em 👎 para discordar da sugestão\n' +
          '• Você pode mudar seu voto a qualquer momento\n' +
          '• Clique novamente no mesmo botão para remover o voto', inline: false },
        { name: '🔧 Permissões', value: 
          '• `!painel-sugestao` - Requer "Gerenciar Mensagens"\n' +
          '• `!sugestao-stats` - Requer "Gerenciar Mensagens"\n' +
          '• Votar - Disponível para todos os membros', inline: false }
      )
      .setFooter({ text: 'Street Car Club • Sistema de Sugestões' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
}; 