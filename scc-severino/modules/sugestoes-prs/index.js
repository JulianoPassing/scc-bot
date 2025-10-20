import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs';

const GUILD_ID = '1328895149392265287'; // Servidor específico
const SUGGESTION_CHANNEL_ID = '1429874270644731945'; // Canal de sugestões PRS
const VOTES_CHANNEL_ID = '1429874311635795998'; // Canal de logs
const VOTES_FILE = './modules/sugestoes-prs/votes.json';

const votos = new Map();
const logsMessages = new Map();

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
    console.error('Erro ao salvar votos (PRS):', error);
  }
};

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
      console.log(`✅ Votos carregados (PRS): ${Object.keys(votesData).length} sugestões`);
    }
  } catch (error) {
    console.error('Erro ao carregar votos (PRS):', error);
  }
};

const setupSugestoesPRSModule = function(client) {
  console.log('🏁 Iniciando módulo sugestoes-prs...');
  
  // Carregar votos existentes
  loadVotes();
  
  // Evento para mensagens no canal de sugestões PRS
  client.on('messageCreate', async (message) => {
    // Verificar se é bot, não é o servidor correto ou não é o canal correto
    if (message.author.bot) return;
    if (message.guild?.id !== GUILD_ID) return;
    if (message.channel.id !== SUGGESTION_CHANNEL_ID) return;
    
    console.log(`🏁 Nova mensagem no canal de sugestões PRS: ${message.content}`);
    
    try {
      const conteudo = message.content;
      
      // Deletar a mensagem original
      await message.delete();
      
      // Criar embed da sugestão PRS
      const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setAuthor({
          name: `${message.author.username} - ${message.author.id}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true, size: 64 })
        })
        .setTitle('🏁 Sugestão PRS')
        .setDescription(`
\`\`\`sugestao-prs
${conteudo}
\`\`\`
`)
        .addFields(
          { name: '👤 Autor', value: `<@${message.author.id}>`, inline: true },
          { name: '📅 Data', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setFooter({ 
          text: 'Sistema de Sugestões PRS • SCC', 
          iconURL: message.guild.iconURL({ dynamic: true }) 
        })
        .setTimestamp();
      
      // Criar botões de votação
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('vote_yes_prs')
          .setLabel('👍 (0) - 0%')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅'),
        new ButtonBuilder()
          .setCustomId('vote_no_prs')
          .setLabel('👎 (0) - 0%')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('❌')
      );
      
      // Enviar a sugestão com botões
      const sentMessage = await message.channel.send({ embeds: [embed], components: [row] });
      
      // Inicializar votos para esta mensagem
      votos.set(sentMessage.id, { yes: new Set(), no: new Set() });
      saveVotes();
      
      console.log(`✅ Sugestão PRS criada com sucesso: ${sentMessage.id}`);
      
      // Criar thread para debate
      try {
        await sentMessage.startThread({
          name: `💬 Debate: ${conteudo.substring(0, 50)}${conteudo.length > 50 ? '...' : ''}`,
          autoArchiveDuration: 60,
          reason: 'Tópico de debate criado automaticamente para a sugestão PRS'
        });
        console.log(`✅ Thread criado para a sugestão PRS`);
      } catch (threadError) {
        console.error('❌ Erro ao criar thread (PRS):', threadError);
      }
      
    } catch (error) {
      console.error('❌ Erro ao processar sugestão PRS:', error);
    }
  });
  
  // Evento para interações com botões
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    
    const { customId, message, user } = interaction;
    if (!['vote_yes_prs', 'vote_no_prs'].includes(customId)) return;
    
    // Verificar se é do servidor correto e do canal de sugestões PRS
    if (interaction.guild?.id !== GUILD_ID) return;
    if (message.channel.id !== SUGGESTION_CHANNEL_ID) return;
    
    console.log(`🗳️ Voto registrado (PRS): ${customId} na sugestão ${message.id} por ${user.username}`);
    
    try {
      // Inicializar votos se não existir
      if (!votos.has(message.id)) {
        votos.set(message.id, { yes: new Set(), no: new Set() });
      }
      
      const voto = votos.get(message.id);
      
      // Remover voto anterior do usuário
      voto.yes.delete(user.id);
      voto.no.delete(user.id);
      
      // Adicionar novo voto
      if (customId === 'vote_yes_prs') voto.yes.add(user.id);
      if (customId === 'vote_no_prs') voto.no.add(user.id);
      
      // Salvar votos
      saveVotes();
      
      // Calcular contadores
      const totalVotos = voto.yes.size + voto.no.size;
      const porcentagemSim = totalVotos > 0 ? Math.round((voto.yes.size / totalVotos) * 100) : 0;
      const porcentagemNao = totalVotos > 0 ? Math.round((voto.no.size / totalVotos) * 100) : 0;
      
      // Atualizar botões com novos contadores
      const row = ActionRowBuilder.from(message.components[0]);
      row.components[0].setLabel(`👍 (${voto.yes.size}) - ${porcentagemSim}%`);
      row.components[1].setLabel(`👎 (${voto.no.size}) - ${porcentagemNao}%`);
      
      // Atualizar a interação PRIMEIRO
      await interaction.update({ components: [row] });
      
      // Enviar log para canal de logs (após atualizar a interação)
      try {
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
            .setColor('#9B59B6')
            .setTitle('📊 Votação da Sugestão PRS')
            .setDescription(`**Sugestão:** ${message.embeds[0].description}`)
            .addFields(
              { name: '👤 Autor Original', value: message.embeds[0].fields.find(f => f.name.includes('Autor'))?.value || 'N/A', inline: true },
              { name: '📅 Data', value: message.embeds[0].fields.find(f => f.name.includes('Data'))?.value || 'N/A', inline: true },
              { name: '📈 Total de Votos', value: `${totalVotos}`, inline: true }
            )
            .setFooter({ text: `Sugestão PRS ID: ${message.id}` })
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
      } catch (logError) {
        console.error('❌ Erro ao enviar log de votação (PRS):', logError);
        // Não re-lançar o erro para não interferir na interação
      }
      
    } catch (error) {
      console.error('❌ Erro ao processar voto (PRS):', error);
      // Não enviar mensagem de erro para o usuário para evitar problemas de interação
    }
  });
  
  console.log('🏁 Módulo sugestoes-prs configurado com sucesso!');
};

export default setupSugestoesPRSModule;

