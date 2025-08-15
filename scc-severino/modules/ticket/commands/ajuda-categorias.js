import { EmbedBuilder } from 'discord.js';

export const data = {
  name: 'ajuda-categorias',
  description: 'Mostra ajuda sobre os comandos de gerenciamento de categorias de ticket.'
};

export async function execute(message, args, client) {
  const embed = new EmbedBuilder()
            .setColor('#EAF207')
    .setTitle('📊 Comandos de Gerenciamento de Categorias')
    .setDescription('Comandos para gerenciar categorias de ticket quando estão cheias')
    .addFields(
      {
        name: '!status-categorias',
        value: 'Verifica o status de todas as categorias de ticket\n• Mostra quantos tickets cada categoria tem\n• Indica quais categorias estão cheias\n• Exibe estatísticas gerais',
        inline: false
      },
      {
        name: '!limpar-tickets [dias]',
        value: 'Remove tickets antigos e inativos\n• Padrão: 7 dias\n• Máximo: 30 dias\n• Apenas para administradores\n• Remove tickets com mais de X dias sem atividade',
        inline: false
      },
      {
        name: '📋 Informações Importantes',
        value: '• **Limite do Discord**: 50 canais por categoria\n• **Comportamento**: Tickets são criados no topo quando categoria está cheia\n• **Permissões**: Mantidas mesmo fora da categoria\n• **Organização**: Staff pode mover tickets manualmente',
        inline: false
      },
      {
        name: '⚠️ O que fazer quando categoria está cheia',
        value: '1. Use `!status-categorias` para verificar\n2. Use `!limpar-tickets` para remover antigos\n3. Feche tickets resolvidos manualmente\n4. Considere criar nova categoria se necessário\n5. Os novos tickets funcionam normalmente',
        inline: false
      }
    )
    .setFooter({ text: 'Sistema de Tickets • StreetCarClub' })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
} 