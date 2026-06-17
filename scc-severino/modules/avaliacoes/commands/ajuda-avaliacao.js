import { EmbedBuilder } from 'discord.js';

export default {
  data: {
    name: 'ajuda-avaliacao',
    description: 'Mostra ajuda sobre o sistema de avaliações de staff'
  },
  
  async execute(message, args, client) {
    const embed = new EmbedBuilder()
      .setColor(0xEAF207)
      .setTitle('⭐ Sistema de Avaliações de Staff - Ajuda')
      .setDescription('Como usar o sistema de avaliações de staff do **Street Car Club**')
      .addFields(
        { name: '🎯 Comandos Disponíveis', value: 
          '`!painel-avaliacao` - Cria painéis individuais para cada staff\n' +
          '`!gerenciar-paineis-staff` - Gerencia painéis no canal oficial\n' +
          '`!relatorio-avaliacoes` - Gera relatório HTML das avaliações\n' +
          '`!zerar-avaliacoes` - Zera todas as avaliações (apenas admins)\n' +
          '`!ajuda-avaliacao` - Mostra esta mensagem de ajuda', inline: false },
        { name: '📊 Como Avaliar Staff', value: 
          '1. Use `!painel-avaliacao` para criar painéis\n' +
          '2. Clique em uma das estrelas (1-5) no painel do staff\n' +
          '3. Preencha o tipo de atendimento (ticket/call)\n' +
          '4. Adicione uma justificativa para sua nota\n' +
          '5. Sua avaliação será registrada!', inline: false },
        { name: '📈 Relatório de Avaliações', value: 
          '• Use `!relatorio-avaliacoes` para gerar relatório HTML\n' +
          '• Mostra estatísticas gerais e por staff\n' +
          '• Inclui: nome, nota atual, total de avaliações, data\n' +
          '• Arquivo HTML com visual profissional\n' +
          '• Ordenado por melhor nota média', inline: false },
        { name: '⏰ Limitações', value: 
          '• Você pode avaliar cada staff apenas uma vez a cada 6 horas\n' +
          '• Staff não pode avaliar outros staff\n' +
          '• Avaliações são enviadas para canal de auditoria', inline: false },
        { name: '🔧 Permissões', value: 
          '• `!painel-avaliacao` - Requer cargo CM ou superior\n' +
          '• `!gerenciar-paineis-staff` - Requer cargo CM ou superior\n' +
          '• `!relatorio-avaliacoes` - Requer cargo CM ou superior\n' +
          '• `!zerar-avaliacoes` - Requer cargo CM ou superior\n' +
          '• Avaliar - Disponível para membros (exceto staff)', inline: false },
        { name: '📋 Hierarquia de Cargos', value: 
          'CEO → DEV → CM → MOD → CRD → SEG → MKT → SUP → AJD\n' +
          'Os painéis são criados nesta ordem de hierarquia.', inline: false }
      )
      .setFooter({ text: 'Street Car Club • Sistema de Avaliações de Staff' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
}; 