import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATABASE_PATH = path.join(__dirname, 'sugestoes.json');

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

      // Verificar se a interação pertence ao módulo de sugestões
      const isSugestaoInteraction = (customId) => {
        const sugestaoPrefixes = [
          'vote_yes', // Voto positivo
          'vote_no'   // Voto negativo
        ];
        
        return sugestaoPrefixes.some(prefix => customId === prefix || customId.startsWith(prefix));
      };

      // Se não for uma interação de sugestão, não processar
      if (!isSugestaoInteraction(interaction.customId)) {
        return;
      }

      // Botões de votação
      if (interaction.isButton() && (interaction.customId === 'vote_yes' || interaction.customId === 'vote_no')) {
        const userId = interaction.user.id;
        const messageId = interaction.message.id;
        const vote = interaction.customId === 'vote_yes' ? 'yes' : 'no';
        
        const db = loadDB();
        if (!db[messageId]) {
          db[messageId] = { yes: [], no: [] };
      }
        
        // Verificar se já votou
        const hasVotedYes = db[messageId].yes.includes(userId);
        const hasVotedNo = db[messageId].no.includes(userId);
        
        if (vote === 'yes') {
          if (hasVotedYes) {
            // Remover voto
            db[messageId].yes = db[messageId].yes.filter(id => id !== userId);
            await interaction.reply({ content: '❌ Voto positivo removido!', flags: 64 });
          } else {
            // Adicionar voto positivo e remover negativo se existir
            if (!hasVotedYes) db[messageId].yes.push(userId);
            if (hasVotedNo) db[messageId].no = db[messageId].no.filter(id => id !== userId);
            await interaction.reply({ content: '✅ Voto positivo registrado!', flags: 64 });
          }
        } else {
          if (hasVotedNo) {
            // Remover voto
            db[messageId].no = db[messageId].no.filter(id => id !== userId);
            await interaction.reply({ content: '❌ Voto negativo removido!', flags: 64 });
          } else {
            // Adicionar voto negativo e remover positivo se existir
            if (!hasVotedNo) db[messageId].no.push(userId);
            if (hasVotedYes) db[messageId].yes = db[messageId].yes.filter(id => id !== userId);
            await interaction.reply({ content: '✅ Voto negativo registrado!', flags: 64 });
          }
        }
        
        saveDB(db);
        
        // Atualizar embed com novos votos
        try {
          const embed = EmbedBuilder.from(interaction.message.embeds[0]);
          const yesCount = db[messageId].yes.length;
          const noCount = db[messageId].no.length;
          const totalVotes = yesCount + noCount;
          
          // Atualizar campo de votos
          const voteField = embed.data.fields?.find(field => field.name === 'Votos');
          if (voteField) {
            voteField.value = `👍 **${yesCount}** | 👎 **${noCount}** (Total: ${totalVotes})`;
        }
          
          // Atualizar cor baseada no resultado
          if (yesCount > noCount) {
            embed.setColor(0x00ff00); // Verde
          } else if (noCount > yesCount) {
            embed.setColor(0xff0000); // Vermelho
          } else {
            embed.setColor(0xffff00); // Amarelo
          }
          
          await interaction.message.edit({ embeds: [embed] });
        } catch (e) {
          console.error('[SUGESTOES][UPDATE] Erro ao atualizar embed:', e);
        }
        
        return;
      }
    } catch (error) {
      console.error('[SUGESTOES][ERRO]', error);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ Ocorreu um erro ao processar seu voto.', flags: 64 });
        }
      } catch (e) {}
    }
  });
} 