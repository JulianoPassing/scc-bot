import { Events } from 'discord.js';

const setupLimparchatModule = function(client) {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    // Verifica se é o comando !limparchat
    if (message.content.toLowerCase().trim() === '!limparchat') {
      // IDs dos cargos permitidos
      const allowedRoles = ['1046404063689977985', '1046404063689977984'];
      
      // Verifica se o usuário tem um dos cargos permitidos
      const hasPermission = message.member.roles.cache.some(role => 
        allowedRoles.includes(role.id)
      );
      
      if (!hasPermission) {
        await message.reply('**❌ Você não tem permissão para usar este comando.**');
        return;
      }
      
      try {
        // Confirmação antes de limpar
        const confirmMessage = await message.reply('**⚠️ Tem certeza que deseja limpar TODAS as mensagens deste canal? Digite `CONFIRMAR` em 10 segundos para prosseguir.**');
        
        // Coleta de confirmação
        const filter = (response) => {
          return response.author.id === message.author.id && 
                 response.content.toUpperCase() === 'CONFIRMAR';
        };
        
        const collector = message.channel.createMessageCollector({ 
          filter, 
          time: 10000, 
          max: 1 
        });
        
        collector.on('collect', async (response) => {
          try {
            // Deleta a mensagem de confirmação
            await confirmMessage.delete();
            await response.delete();
            
            // Mensagem de início da limpeza
            const startMessage = await message.channel.send('**🧹 Iniciando limpeza do canal...**');
            
            // VERSÃO ULTRA-AGRESSIVA - Múltiplas estratégias
            let deletedCount = 0;
            let lastMessageId = null;
            let attempts = 0;
            const maxAttempts = 500; // Aumentei drasticamente
            
            console.log('🧹 Iniciando limpeza ULTRA-AGRESSIVA do canal...');
            
            // ESTRATÉGIA 1: Deletar do mais recente para o mais antigo
            while (attempts < maxAttempts) {
              try {
                const messages = await message.channel.messages.fetch({ 
                  limit: 100, 
                  before: lastMessageId 
                });
                
                console.log(`📊 Estratégia 1 - Tentativa ${attempts + 1}: Encontradas ${messages.size} mensagens`);
                
                if (messages.size === 0) {
                  console.log('✅ Estratégia 1 concluída - Nenhuma mensagem encontrada');
                  break;
                }
                
                // Deleta em ordem reversa (mais recente primeiro)
                const sortedMessages = Array.from(messages.values()).sort((a, b) => b.createdTimestamp - a.createdTimestamp);
                
                for (const msg of sortedMessages) {
                  try {
                    await msg.delete();
                    deletedCount++;
                    console.log(`🗑️ Deletada mensagem ${msg.id} de ${new Date(msg.createdTimestamp).toLocaleDateString('pt-BR')} (${deletedCount} total)`);
                    await new Promise(resolve => setTimeout(resolve, 25)); // Pausa ainda menor
                  } catch (deleteError) {
                    console.log(`❌ Erro ao deletar mensagem ${msg.id}:`, deleteError.message);
                  }
                }
                
                lastMessageId = messages.last().id;
                attempts++;
                
                await new Promise(resolve => setTimeout(resolve, 100));
                
              } catch (fetchError) {
                console.log(`❌ Erro na estratégia 1:`, fetchError.message);
                attempts++;
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }
            
            console.log(`🏁 Estratégia 1 concluída. ${deletedCount} mensagens deletadas em ${attempts} tentativas.`);
            
            // ESTRATÉGIA 2: Buscar por ID específico e deletar
            console.log('🔄 Iniciando Estratégia 2 - Busca por ID...');
            let strategy2Count = 0;
            
            for (let i = 0; i < 50; i++) {
              try {
                const messages = await message.channel.messages.fetch({ limit: 100 });
                if (messages.size === 0) break;
                
                console.log(`📊 Estratégia 2 - Tentativa ${i + 1}: ${messages.size} mensagens restantes`);
                
                for (const msg of messages.values()) {
                  try {
                    await msg.delete();
                    strategy2Count++;
                    deletedCount++;
                    console.log(`🗑️ Estratégia 2 - Deletada ${msg.id} (${strategy2Count} nesta estratégia)`);
                    await new Promise(resolve => setTimeout(resolve, 10));
                  } catch (error) {
                    console.log(`❌ Estratégia 2 - Erro ao deletar ${msg.id}:`, error.message);
                  }
                }
                
                await new Promise(resolve => setTimeout(resolve, 50));
              } catch (error) {
                console.log(`❌ Erro na estratégia 2:`, error.message);
                await new Promise(resolve => setTimeout(resolve, 200));
              }
            }
            
            console.log(`🏁 Estratégia 2 concluída. ${strategy2Count} mensagens adicionais deletadas.`);
            
            // ESTRATÉGIA 3: Loop infinito até canal estar vazio
            console.log('🔄 Iniciando Estratégia 3 - Loop infinito...');
            let strategy3Count = 0;
            let emptyRounds = 0;
            
            while (emptyRounds < 5) { // Para se não encontrar mensagens por 5 rodadas seguidas
              try {
                const messages = await message.channel.messages.fetch({ limit: 100 });
                
                if (messages.size === 0) {
                  emptyRounds++;
                  console.log(`📊 Estratégia 3 - Rodada vazia ${emptyRounds}/5`);
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  continue;
                }
                
                emptyRounds = 0; // Reset contador
                console.log(`📊 Estratégia 3 - Encontradas ${messages.size} mensagens, continuando...`);
                
                for (const msg of messages.values()) {
                  try {
                    await msg.delete();
                    strategy3Count++;
                    deletedCount++;
                    console.log(`🗑️ Estratégia 3 - Deletada ${msg.id} (${strategy3Count} nesta estratégia)`);
                    await new Promise(resolve => setTimeout(resolve, 5)); // Pausa mínima
                  } catch (error) {
                    console.log(`❌ Estratégia 3 - Erro ao deletar ${msg.id}:`, error.message);
                  }
                }
                
                await new Promise(resolve => setTimeout(resolve, 25));
                
              } catch (error) {
                console.log(`❌ Erro na estratégia 3:`, error.message);
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }
            
            console.log(`🏁 Estratégia 3 concluída. ${strategy3Count} mensagens adicionais deletadas.`);
            
            // Deleta a mensagem de início
            await startMessage.delete();
            
            // Verificação final AGRESSIVA - múltiplas tentativas
            console.log('🔍 Iniciando verificação final...');
            
            for (let finalAttempt = 0; finalAttempt < 10; finalAttempt++) {
              try {
                const remainingMessages = await message.channel.messages.fetch({ limit: 100 });
                console.log(`🔍 Verificação ${finalAttempt + 1}: ${remainingMessages.size} mensagens restantes`);
                
                if (remainingMessages.size === 0) {
                  console.log('✅ Canal completamente limpo!');
                  break;
                }
                
                for (const msg of remainingMessages.values()) {
                  try {
                    await msg.delete();
                    deletedCount++;
                    console.log(`🗑️ Deletada mensagem restante ${msg.id}`);
                    await new Promise(resolve => setTimeout(resolve, 100));
                  } catch (error) {
                    console.log(`❌ Erro ao deletar mensagem restante ${msg.id}:`, error.message);
                  }
                }
                
                await new Promise(resolve => setTimeout(resolve, 500));
                
              } catch (error) {
                console.log(`❌ Erro na verificação final ${finalAttempt + 1}:`, error.message);
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
            
            console.log(`🏁 Verificação final concluída. Total: ${deletedCount} mensagens deletadas.`);
            
            // Mensagem final
            await message.channel.send(`**✅ Canal limpo com sucesso! ${deletedCount} mensagens foram removidas.**`);
            
          } catch (error) {
            console.error('Erro ao limpar canal:', error);
            await message.channel.send('**❌ Ocorreu um erro ao limpar o canal.**');
          }
        });
        
        collector.on('end', async (collected) => {
          if (collected.size === 0) {
            await confirmMessage.edit('**⏰ Tempo esgotado. Operação cancelada.**');
          }
        });
        
      } catch (error) {
        console.error('Erro no comando limparchat:', error);
        await message.reply('**❌ Ocorreu um erro ao processar o comando.**');
      }
    }
  });
};

export default setupLimparchatModule;
