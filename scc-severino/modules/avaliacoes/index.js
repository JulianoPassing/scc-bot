import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATABASE_PATH = path.join(__dirname, 'avaliacoes.json');

function loadDB() {
  if (!fs.existsSync(DATABASE_PATH)) return {};
  return JSON.parse(fs.readFileSync(DATABASE_PATH, 'utf8'));
}
function saveDB(db) {
  fs.writeFileSync(DATABASE_PATH, JSON.stringify(db, null, 2));
}

export default async function(client) {
  client.on('interactionCreate', async interaction => {
    try {
      // Verificar se a interação já foi processada
      if (interaction.replied || interaction.deferred) {
        return;
      }

      // Verificar se a interação pertence ao módulo de avaliações
      const isAvaliacaoInteraction = (customId) => {
        const avaliacaoPrefixes = [
          'rate_', // Botões de avaliação
          'modal_avaliacao_' // Modal de avaliação
        ];
        
        return avaliacaoPrefixes.some(prefix => customId.startsWith(prefix));
      };

      // Se não for uma interação de avaliação, não processar
      if (!isAvaliacaoInteraction(interaction.customId)) {
        return;
      }

      // Botões de avaliação (1-5 estrelas)
      if (interaction.isButton() && interaction.customId.startsWith('rate_')) {
        const rating = parseInt(interaction.customId.replace('rate_', ''));
        if (isNaN(rating) || rating < 1 || rating > 5) return;
        
        const userId = interaction.user.id;
        const db = loadDB();
        if (!db[userId]) db[userId] = { ratings: [] };
        
        // Verificar se já avaliou hoje
        const today = new Date().toDateString();
        const existingRating = db[userId].ratings.find(r => r.date === today);
        if (existingRating) {
          await interaction.reply({ content: '❌ Você já avaliou hoje! Tente novamente amanhã.', flags: 64 });
          return;
        }
        
        // Abrir modal para comentário
        const modal = new ModalBuilder()
          .setCustomId(`modal_avaliacao_${rating}`)
          .setTitle(`Avaliação - ${rating} estrela${rating > 1 ? 's' : ''}`)
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('comentario')
                .setLabel('Comentário (opcional)')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false)
                .setMaxLength(500)
                .setPlaceholder('Deixe um comentário sobre sua experiência...')
            )
          );
        
        await interaction.showModal(modal);
        return;
      }
      
      // Handler do modal de avaliação
      if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_avaliacao_')) {
        const rating = parseInt(interaction.customId.replace('modal_avaliacao_', ''));
        if (isNaN(rating) || rating < 1 || rating > 5) return;
        
        const comentario = interaction.fields.getTextInputValue('comentario');
        const userId = interaction.user.id;
        const userTag = interaction.user.tag;
        const today = new Date().toDateString();
        
        const db = loadDB();
        if (!db[userId]) db[userId] = { ratings: [] };
        
        // Adicionar avaliação
        db[userId].ratings.push({
          rating,
          comentario,
          date: today,
          userTag
        });
        saveDB(db);
        
        // Calcular média geral
        const allRatings = Object.values(db).flatMap(user => user.ratings);
        const average = allRatings.length > 0 ? 
          (allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length).toFixed(1) : 0;
        
        // Criar embed de agradecimento
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('⭐ Obrigado pela sua avaliação!')
          .setDescription(`Você avaliou o servidor com **${rating} estrela${rating > 1 ? 's' : ''}**`)
          .addFields(
            { name: 'Média Geral', value: `${average}/5 (${allRatings.length} avaliações)`, inline: true },
            { name: 'Sua Avaliação', value: `${rating}/5`, inline: true }
          )
          .setFooter({ text: 'Street Car Club • Sistema de Avaliações' })
          .setTimestamp();
        
        if (comentario) {
          embed.addFields({ name: 'Seu Comentário', value: comentario, inline: false });
        }
        
        await interaction.reply({ embeds: [embed], flags: 64 });
        
        // Enviar para canal de logs (se configurado)
        try {
          const logChannel = interaction.guild.channels.cache.get('1396911720835973160'); // Substitua pelo ID do canal de logs
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setColor(0x0099ff)
              .setTitle('⭐ Nova Avaliação Recebida')
              .setDescription(`**Usuário:** ${userTag} (<@${userId}>)`)
              .addFields(
                { name: 'Avaliação', value: `${rating}/5`, inline: true },
                { name: 'Data', value: today, inline: true },
                { name: 'Total de Avaliações', value: allRatings.length.toString(), inline: true }
              )
              .setTimestamp();
            
            if (comentario) {
              logEmbed.addFields({ name: 'Comentário', value: comentario, inline: false });
            }
            
            await logChannel.send({ embeds: [logEmbed] });
          }
        } catch (e) {
          console.error('[AVALIACOES][LOG] Erro ao enviar para canal de logs:', e);
        }
        
        return;
      }
    } catch (error) {
      console.error('[AVALIACOES][ERRO]', error);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ Ocorreu um erro ao processar sua avaliação.', flags: 64 });
        }
      } catch (e) {}
    }
  });
} 