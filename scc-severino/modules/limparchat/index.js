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
            
            // VERSÃO ULTRA-SIMPLES - Re-lê canal a cada mensagem
            let deletedCount = 0;
            let attempts = 0;
            const maxAttempts = 10000; // Aumentei drasticamente
            
            console.log('🧹 Iniciando limpeza ULTRA-SIMPLES - Re-lendo canal a cada mensagem...');
            
            // ESTRATÉGIA SIMPLES: Re-lê canal e deleta uma mensagem por vez
            while (attempts < maxAttempts) {
              try {
                // SEMPRE re-lê o canal do zero
                const messages = await message.channel.messages.fetch({ limit: 1 });
                
                if (messages.size === 0) {
                  console.log('✅ Nenhuma mensagem encontrada - canal limpo!');
                  break;
                }
                
                // Pega a primeira (mais recente) mensagem
                const firstMessage = messages.first();
                
                if (firstMessage) {
                  try {
                    await firstMessage.delete();
                    deletedCount++;
                    attempts++;
                    console.log(`🗑️ Deletada mensagem ${firstMessage.id} (${deletedCount} total, tentativa ${attempts})`);
                    
                    // Pausa pequena para evitar rate limit
                    await new Promise(resolve => setTimeout(resolve, 100));
                  } catch (deleteError) {
                    console.log(`❌ Erro ao deletar mensagem ${firstMessage.id}:`, deleteError.message);
                    attempts++;
                    
                    // Se não conseguiu deletar, tenta a próxima
                    await new Promise(resolve => setTimeout(resolve, 500));
                  }
                } else {
                  console.log('⚠️ Nenhuma mensagem válida encontrada');
                  attempts++;
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
                // Log de progresso a cada 100 tentativas
                if (attempts % 100 === 0) {
                  console.log(`📊 Progresso: ${attempts} tentativas, ${deletedCount} mensagens deletadas`);
                }
                
              } catch (fetchError) {
                console.log(`❌ Erro ao buscar mensagens (tentativa ${attempts + 1}):`, fetchError.message);
                attempts++;
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
            
            console.log(`🏁 Limpeza simples concluída. ${deletedCount} mensagens deletadas em ${attempts} tentativas.`);
            
            // Deleta a mensagem de início
            await startMessage.delete();
            
            // Verificação final SIMPLES - re-lê canal e deleta uma por vez
            console.log('🔍 Iniciando verificação final simples...');
            let finalAttempts = 0;
            const maxFinalAttempts = 1000;
            
            while (finalAttempts < maxFinalAttempts) {
              try {
                // Re-lê o canal do zero
                const remainingMessages = await message.channel.messages.fetch({ limit: 1 });
                
                if (remainingMessages.size === 0) {
                  console.log('✅ Canal completamente limpo!');
                  break;
                }
                
                const firstMessage = remainingMessages.first();
                if (firstMessage) {
                  try {
                    await firstMessage.delete();
                    deletedCount++;
                    finalAttempts++;
                    console.log(`🗑️ Verificação final - Deletada ${firstMessage.id} (${deletedCount} total)`);
                    await new Promise(resolve => setTimeout(resolve, 100));
                  } catch (error) {
                    console.log(`❌ Erro ao deletar na verificação final:`, error.message);
                    finalAttempts++;
                    await new Promise(resolve => setTimeout(resolve, 500));
                  }
                } else {
                  finalAttempts++;
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
              } catch (error) {
                console.log(`❌ Erro na verificação final:`, error.message);
                finalAttempts++;
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
