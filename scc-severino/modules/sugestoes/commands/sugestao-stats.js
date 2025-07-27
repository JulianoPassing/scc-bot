import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATABASE_PATH = path.join(__dirname, '..', 'sugestoes.json');

function loadDB() {
  if (!fs.existsSync(DATABASE_PATH)) return {};
  return JSON.parse(fs.readFileSync(DATABASE_PATH, 'utf8'));
}

export default {
  data: {
    name: 'sugestao-stats',
    description: 'Mostra estatísticas das sugestões do servidor',
    defaultMemberPermissions: PermissionFlagsBits.ManageMessages
  },
  
  async execute(message, args, client) {
    try {
      const db = loadDB();
      const suggestions = Object.keys(db);
      
      if (suggestions.length === 0) {
        await message.reply('📊 **Estatísticas de Sugestões**\n\nNenhuma sugestão registrada ainda.');
        return;
      }
      
      // Calcular estatísticas
      let totalVotes = 0;
      let totalYes = 0;
      let totalNo = 0;
      
      suggestions.forEach(messageId => {
        const suggestion = db[messageId];
        totalYes += suggestion.yes.length;
        totalNo += suggestion.no.length;
        totalVotes += suggestion.yes.length + suggestion.no.length;
      });
      
      // Encontrar sugestões mais populares
      const suggestionStats = suggestions.map(messageId => {
        const suggestion = db[messageId];
        const yesCount = suggestion.yes.length;
        const noCount = suggestion.no.length;
        const total = yesCount + noCount;
        const approvalRate = total > 0 ? ((yesCount / total) * 100).toFixed(1) : 0;
        
        return {
          messageId,
          yesCount,
          noCount,
          total,
          approvalRate: parseFloat(approvalRate)
        };
      }).sort((a, b) => b.total - a.total);
      
      const embed = new EmbedBuilder()
        .setColor(0xffff00)
        .setTitle('📊 Estatísticas de Sugestões')
        .setDescription(`Estatísticas do sistema de sugestões do **Street Car Club**`)
        .addFields(
          { name: '💡 Total de Sugestões', value: suggestions.length.toString(), inline: true },
          { name: '📊 Total de Votos', value: totalVotes.toString(), inline: true },
          { name: '👍 Votos Positivos', value: totalYes.toString(), inline: true },
          { name: '👎 Votos Negativos', value: totalNo.toString(), inline: true },
          { name: '📈 Taxa de Aprovação Geral', value: totalVotes > 0 ? `${((totalYes / totalVotes) * 100).toFixed(1)}%` : '0%', inline: true }
        )
        .setFooter({ text: 'Street Car Club • Sistema de Sugestões' })
        .setTimestamp();

      // Adicionar top 5 sugestões mais votadas
      if (suggestionStats.length > 0) {
        const topSuggestions = suggestionStats.slice(0, 5);
        let topText = '';
        
        topSuggestions.forEach((suggestion, index) => {
          topText += `${index + 1}. 👍 ${suggestion.yesCount} | 👎 ${suggestion.noCount} (${suggestion.approvalRate}% aprovação)\n`;
        });
        
        embed.addFields({ name: '🏆 Top 5 Sugestões Mais Votadas', value: topText, inline: false });
      }

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('[SUGESTOES][STATS] Erro:', error);
      await message.reply('❌ Ocorreu um erro ao carregar as estatísticas.');
    }
  }
}; 