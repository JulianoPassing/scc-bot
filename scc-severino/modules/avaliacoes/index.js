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
  // Registrar comando de painel de avaliações
  client.commands.set('painel-avaliacao', {
    name: 'painel-avaliacao',
    description: 'Cria o painel de avaliações do servidor',
    execute: async (message, args, client) => {
      // Verificar permissões
      if (!message.member.permissions.has('Administrator')) {
        return message.reply('❌ Você não tem permissão para usar este comando.');
      }

      try {
        // Carregar dados existentes
        const db = loadDB();
        const allRatings = Object.values(db).flatMap(user => user.ratings);
        const average = allRatings.length > 0 ? 
          (allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length).toFixed(1) : 0;

        // Criar embed do painel
        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('⭐ Avalie Nosso Servidor!')
          .setDescription('Sua opinião é muito importante para nós! Clique em uma das estrelas abaixo para avaliar sua experiência no servidor.')
          .addFields(
            { name: '📊 Estatísticas', value: `Média Geral: **${average}/5**\nTotal de Avaliações: **${allRatings.length}**`, inline: true },
            { name: '⏰ Limite', value: 'Você pode avaliar **uma vez por dia**', inline: true }
          )
          .setFooter({ text: 'Street Car Club • Sistema de Avaliações' })
          .setTimestamp();

        // Criar botões de avaliação
        const buttons = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('rate_1')
              .setLabel('1 ⭐')
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId('rate_2')
              .setLabel('2 ⭐')
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId('rate_3')
              .setLabel('3 ⭐')
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId('rate_4')
              .setLabel('4 ⭐')
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId('rate_5')
              .setLabel('5 ⭐')
              .setStyle(ButtonStyle.Secondary)
          );

        await message.channel.send({ embeds: [embed], components: [buttons] });
        await message.delete().catch(() => {}); // Deletar comando

      } catch (error) {
        console.error('[AVALIACOES][PAINEL] Erro ao criar painel:', error);
        await message.reply('❌ Ocorreu um erro ao criar o painel de avaliações.');
      }
    }
  });

  // Registrar comando de estatísticas de avaliações
  client.commands.set('stats-avaliacao', {
    name: 'stats-avaliacao',
    description: 'Mostra estatísticas detalhadas das avaliações',
    execute: async (message, args, client) => {
      // Verificar permissões
      if (!message.member.permissions.has('Administrator')) {
        return message.reply('❌ Você não tem permissão para usar este comando.');
      }

      try {
        const db = loadDB();
        const allRatings = Object.values(db).flatMap(user => user.ratings);
        
        if (allRatings.length === 0) {
          return message.reply('📊 Nenhuma avaliação registrada ainda.');
        }

        const average = (allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length).toFixed(1);
        
        // Contar avaliações por estrela
        const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        allRatings.forEach(r => ratingCounts[r.rating]++);

        // Calcular porcentagens
        const percentages = {};
        Object.keys(ratingCounts).forEach(rating => {
          percentages[rating] = ((ratingCounts[rating] / allRatings.length) * 100).toFixed(1);
        });

        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('📊 Estatísticas de Avaliações')
          .addFields(
            { name: '📈 Geral', value: `Média: **${average}/5**\nTotal: **${allRatings.length}** avaliações`, inline: true },
            { name: '⭐ 5 Estrelas', value: `${ratingCounts[5]} (${percentages[5]}%)`, inline: true },
            { name: '⭐ 4 Estrelas', value: `${ratingCounts[4]} (${percentages[4]}%)`, inline: true },
            { name: '⭐ 3 Estrelas', value: `${ratingCounts[3]} (${percentages[3]}%)`, inline: true },
            { name: '⭐ 2 Estrelas', value: `${ratingCounts[2]} (${percentages[2]}%)`, inline: true },
            { name: '⭐ 1 Estrela', value: `${ratingCounts[1]} (${percentages[1]}%)`, inline: true }
          )
          .setFooter({ text: 'Street Car Club • Sistema de Avaliações' })
          .setTimestamp();

        await message.reply({ embeds: [embed] });

      } catch (error) {
        console.error('[AVALIACOES][STATS] Erro ao mostrar estatísticas:', error);
        await message.reply('❌ Ocorreu um erro ao mostrar as estatísticas.');
      }
    }
  });

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