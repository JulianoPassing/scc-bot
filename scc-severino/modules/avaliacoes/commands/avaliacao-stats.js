import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATABASE_PATH = path.join(__dirname, '..', 'avaliacoes.json');

function loadDB() {
  if (!fs.existsSync(DATABASE_PATH)) return {};
  return JSON.parse(fs.readFileSync(DATABASE_PATH, 'utf8'));
}

export default {
  data: {
    name: 'avaliacao-stats',
    description: 'Mostra estatísticas das avaliações do servidor',
    defaultMemberPermissions: PermissionFlagsBits.ManageMessages
  },
  
  async execute(message, args, client) {
    try {
      const db = loadDB();
      const allRatings = Object.values(db).flatMap(user => user.ratings);
      
      if (allRatings.length === 0) {
        await message.reply('📊 **Estatísticas de Avaliações**\n\nNenhuma avaliação registrada ainda.');
        return;
      }
      
      // Calcular estatísticas
      const totalRatings = allRatings.length;
      const average = (allRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings).toFixed(1);
      
      // Contar por estrela
      const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      allRatings.forEach(r => ratingCounts[r.rating]++);
      
      // Avaliações de hoje
      const today = new Date().toDateString();
      const todayRatings = allRatings.filter(r => r.date === today);
      
      // Avaliações da semana
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekRatings = allRatings.filter(r => new Date(r.date) >= weekAgo);
      
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('📊 Estatísticas de Avaliações')
        .setDescription(`Estatísticas do sistema de avaliações do **Street Car Club**`)
        .addFields(
          { name: '⭐ Média Geral', value: `${average}/5`, inline: true },
          { name: '📈 Total de Avaliações', value: totalRatings.toString(), inline: true },
          { name: '📅 Avaliações Hoje', value: todayRatings.length.toString(), inline: true },
          { name: '📊 Distribuição por Estrelas', value: 
            `1⭐: ${ratingCounts[1]} (${((ratingCounts[1]/totalRatings)*100).toFixed(1)}%)\n` +
            `2⭐: ${ratingCounts[2]} (${((ratingCounts[2]/totalRatings)*100).toFixed(1)}%)\n` +
            `3⭐: ${ratingCounts[3]} (${((ratingCounts[3]/totalRatings)*100).toFixed(1)}%)\n` +
            `4⭐: ${ratingCounts[4]} (${((ratingCounts[4]/totalRatings)*100).toFixed(1)}%)\n` +
            `5⭐: ${ratingCounts[5]} (${((ratingCounts[5]/totalRatings)*100).toFixed(1)}%)`, inline: false },
          { name: '📅 Última Semana', value: `${weekRatings.length} avaliações`, inline: true }
        )
        .setFooter({ text: 'Street Car Club • Sistema de Avaliações' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('[AVALIACOES][STATS] Erro:', error);
      await message.reply('❌ Ocorreu um erro ao carregar as estatísticas.');
    }
  }
}; 