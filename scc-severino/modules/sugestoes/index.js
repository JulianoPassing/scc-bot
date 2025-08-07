import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs';
import path from 'path';

const SUGGESTION_CHANNEL_ID = '1395117926402756669';
const VOTES_CHANNEL_ID = '1395118049115246825';
const VOTES_FILE = './modules/sugestoes/votes.json';

const votos = new Map(); // Map<messageId, {yes: Set<userId>, no: Set<userId>}>
const logsMessages = new Map(); // Map<suggestionId, logMessageId>

// Função para salvar votos no arquivo JSON
const saveVotes = () => {
  try {
    const votesData = {};
    for (const [messageId, voteData] of votos.entries()) {
      votesData[messageId] = {
        yes: Array.from(voteData.yes),
        no: Array.from(voteData.no)
      };
    }
    fs.writeFileSync(VOTES_FILE, JSON.stringify(votesData, null, 2));
  } catch (error) {
    console.error('Erro ao salvar votos:', error);
  }
};

// Função para carregar votos do arquivo JSON
const loadVotes = () => {
  try {
    if (fs.existsSync(VOTES_FILE)) {
      const votesData = JSON.parse(fs.readFileSync(VOTES_FILE, 'utf8'));
      for (const [messageId, voteData] of Object.entries(votesData)) {
        votos.set(messageId, {
          yes: new Set(voteData.yes),
          no: new Set(voteData.no)
        });
      }
      console.log(`✅ Votos carregados: ${Object.keys(votesData).length} sugestões`);
    }
  } catch (error) {
    console.error('Erro ao carregar votos:', error);
  }
};

// Função para atualizar botões com votos carregados
const updateButtonsWithVotes = async (client) => {
  try {
    const suggestionChannel = client.channels.cache.get(SUGGESTION_CHANNEL_ID);
    if (!suggestionChannel) return;

    const messages = await suggestionChannel.messages.fetch({ limit: 100 });
    
    for (const [messageId, message] of messages) {
      if (votos.has(messageId) && message.components.length > 0) {
        const voto = votos.get(messageId);
        const totalVotos = voto.yes.size + voto.no.size;
        const porcentagemSim = totalVotos > 0 ? Math.round((voto.yes.size / totalVotos) * 100) : 0;
        const porcentagemNao = totalVotos > 0 ? Math.round((voto.no.size / totalVotos) * 100) : 0;
        
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('vote_yes')
            .setLabel(`👍 (${voto.yes.size}) - ${porcentagemSim}%`)
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),
          new ButtonBuilder()
            .setCustomId('vote_no')
            .setLabel(`👎 (${voto.no.size}) - ${porcentagemNao}%`)
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌')
        );
        
        try {
          await message.edit({ components: [row] });
        } catch (error) {
          console.error(`Erro ao atualizar botões da mensagem ${messageId}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Erro ao atualizar botões com votos:', error);
  }
};

const setupSugestoesModule = function(client) {
  // Carregar votos existentes ao inicializar
  loadVotes();
  
  // Atualizar botões com votos carregados após um pequeno delay
  setTimeout(() => {
    updateButtonsWithVotes(client);
  }, 2000);

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== SUGGESTION_CHANNEL_ID) return;
    try {
      const conteudo = message.content;
      await message.delete();
      const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setAuthor({
          name: `${message.author.username} - ${message.author.id}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true, size: 64 })
        })
        .setTitle('💡 Sugestão')
        .setDescription(`
\`\`\`sugestao
${conteudo}
\`\`\`
`)
        .addFields(
          { name: '👤 Autor', value: `<@${message.author.id}>`, inline: true },
          { name: '📅 Data', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setFooter({ 
          text: 'Sistema de Sugestões • SCC', 
          iconURL: message.guild.iconURL({ dynamic: true }) 
        })
        .setTimestamp();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('vote_yes')
          .setLabel('👍 (0) - 0%')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅'),
        new ButtonBuilder()
          .setCustomId('vote_no')
          .setLabel('👎 (0) - 0%')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('❌')
      );
      const sentMessage = await message.channel.send({ embeds: [embed], components: [row] });
      votos.set(sentMessage.id, { yes: new Set(), no: new Set() });
      saveVotes(); // Salvar após criar nova sugestão
      try {
        await sentMessage.startThread({
          name: `💬 Debate: ${conteudo.substring(0, 50)}${conteudo.length > 50 ? '...' : ''}`,
          autoArchiveDuration: 60,
          reason: 'Tópico de debate criado automaticamente para a sugestão'
        });
      } catch (threadError) {}
    } catch (error) {}
  });
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    const { customId, message, user } = interaction;
    if (!['vote_yes', 'vote_no'].includes(customId)) return;
    try {
      if (!votos.has(message.id)) {
        votos.set(message.id, { yes: new Set(), no: new Set() });
      }
      const voto = votos.get(message.id);
      voto.yes.delete(user.id);
      voto.no.delete(user.id);
      if (customId === 'vote_yes') voto.yes.add(user.id);
      if (customId === 'vote_no') voto.no.add(user.id);
      
      // Salvar votos após cada voto
      saveVotes();
      
      const row = ActionRowBuilder.from(message.components[0]);
      const totalVotos = voto.yes.size + voto.no.size;
      const porcentagemSim = totalVotos > 0 ? Math.round((voto.yes.size / totalVotos) * 100) : 0;
      const porcentagemNao = totalVotos > 0 ? Math.round((voto.no.size / totalVotos) * 100) : 0;
      row.components[0].setLabel(`👍 (${voto.yes.size}) - ${porcentagemSim}%`);
      row.components[1].setLabel(`👎 (${voto.no.size}) - ${porcentagemNao}%`);
      await interaction.update({ components: [row] });
      const votesChannel = interaction.guild.channels.cache.get(VOTES_CHANNEL_ID);
      if (votesChannel) {
        let logMessageId = logsMessages.get(message.id);
        let logMessage = null;
        if (logMessageId) {
          try {
            logMessage = await votesChannel.messages.fetch(logMessageId);
          } catch (error) {
            logsMessages.delete(message.id);
            logMessageId = null;
          }
        }
        const votesEmbed = new EmbedBuilder()
          .setColor('#0099FF')
          .setTitle('📊 Votação da Sugestão')
          .setDescription(`**Sugestão:** ${message.embeds[0].description}`)
          .addFields(
            { name: '👤 Autor Original', value: message.embeds[0].fields.find(f => f.name.includes('Autor'))?.value || 'N/A', inline: true },
            { name: '📅 Data', value: message.embeds[0].fields.find(f => f.name.includes('Data'))?.value || 'N/A', inline: true },
            { name: '📈 Total de Votos', value: `${totalVotos}`, inline: true }
          )
          .setFooter({ text: `Sugestão ID: ${message.id}` })
          .setTimestamp();
        if (voto.yes.size > 0) {
          const votantesSim = Array.from(voto.yes).map(id => `<@${id}>`).join(', ');
          votesEmbed.addFields({ 
            name: `✅ Votaram Sim (${voto.yes.size}) - ${porcentagemSim}%`, 
            value: votantesSim, 
            inline: false 
          });
        }
        if (voto.no.size > 0) {
          const votantesNao = Array.from(voto.no).map(id => `<@${id}>`).join(', ');
          votesEmbed.addFields({ 
            name: `❌ Votaram Não (${voto.no.size}) - ${porcentagemNao}%`, 
            value: votantesNao, 
            inline: false 
          });
        }
        if (logMessage) {
          await logMessage.edit({ embeds: [votesEmbed] });
        } else {
          const newLogMessage = await votesChannel.send({ embeds: [votesEmbed] });
          logsMessages.set(message.id, newLogMessage.id);
        }
      }
    } catch (error) {
      await interaction.reply({ content: 'Erro ao processar seu voto. Tente novamente.', ephemeral: true });
    }
  });
};
export default setupSugestoesModule; 