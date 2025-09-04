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
            
            // ESTRATÉGIA ULTRA-SIMPLES: Força re-lê do canal a cada operação
            while (attempts < maxAttempts) {
              try {
                // FORÇA re-lê do canal - limpa cache e busca dados frescos
                message.channel.messages.cache.clear();
                const messages = await message.channel.messages.fetch({ 
                  limit: 1, 
                  cache: false,
                  force: true 
                });
                
                console.log(`🔍 Tentativa ${attempts + 1}: Buscando mensagens no canal...`);
                console.log(`📊 Mensagens encontradas: ${messages.size}`);
                
                if (messages.size === 0) {
                  console.log('✅ Nenhuma mensagem encontrada - canal limpo!');
                  break;
                }
                
                // Pega a primeira (mais recente) mensagem
                const firstMessage = messages.first();
                console.log(`📝 Mensagem encontrada: ${firstMessage.id} de ${firstMessage.author.tag}`);
                
                if (firstMessage) {
                  try {
                    console.log(`🗑️ Tentando deletar mensagem ${firstMessage.id}...`);
                    await firstMessage.delete();
                    deletedCount++;
                    attempts++;
                    console.log(`✅ SUCESSO! Deletada mensagem ${firstMessage.id} (${deletedCount} total, tentativa ${attempts})`);
                    
                    // Pausa pequena para evitar rate limit
                    await new Promise(resolve => setTimeout(resolve, 200));
                  } catch (deleteError) {
                    console.log(`❌ ERRO ao deletar mensagem ${firstMessage.id}:`, deleteError.message);
                    console.log(`❌ Código do erro:`, deleteError.code);
                    attempts++;
                    
                    // Se não conseguiu deletar, tenta a próxima
                    await new Promise(resolve => setTimeout(resolve, 1000));
                  }
                } else {
                  console.log('⚠️ Nenhuma mensagem válida encontrada');
                  attempts++;
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
                // Log de progresso a cada 10 tentativas
                if (attempts % 10 === 0) {
                  console.log(`📊 Progresso: ${attempts} tentativas, ${deletedCount} mensagens deletadas`);
                }
                
              } catch (fetchError) {
                console.log(`❌ ERRO ao buscar mensagens (tentativa ${attempts + 1}):`, fetchError.message);
                console.log(`❌ Código do erro:`, fetchError.code);
                attempts++;
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }
            
            console.log(`🏁 Limpeza simples concluída. ${deletedCount} mensagens deletadas em ${attempts} tentativas.`);
            
            // Deleta a mensagem de início
            await startMessage.delete();
            
            // Verificação final ULTRA-SIMPLES - força re-lê do canal
            console.log('🔍 Iniciando verificação final ULTRA-SIMPLES...');
            let finalAttempts = 0;
            const maxFinalAttempts = 1000;
            
            while (finalAttempts < maxFinalAttempts) {
              try {
                // FORÇA re-lê do canal - limpa cache e busca dados frescos
                message.channel.messages.cache.clear();
                const remainingMessages = await message.channel.messages.fetch({ 
                  limit: 1, 
                  cache: false,
                  force: true 
                });
                
                console.log(`🔍 Verificação final ${finalAttempts + 1}: ${remainingMessages.size} mensagens encontradas`);
                
                if (remainingMessages.size === 0) {
                  console.log('✅ Canal completamente limpo!');
                  break;
                }
                
                const firstMessage = remainingMessages.first();
                console.log(`📝 Verificação final - Mensagem encontrada: ${firstMessage.id} de ${firstMessage.author.tag}`);
                
                if (firstMessage) {
                  try {
                    console.log(`🗑️ Verificação final - Tentando deletar ${firstMessage.id}...`);
                    await firstMessage.delete();
                    deletedCount++;
                    finalAttempts++;
                    console.log(`✅ Verificação final - SUCESSO! Deletada ${firstMessage.id} (${deletedCount} total)`);
                    await new Promise(resolve => setTimeout(resolve, 200));
                  } catch (error) {
                    console.log(`❌ Verificação final - ERRO ao deletar ${firstMessage.id}:`, error.message);
                    console.log(`❌ Código do erro:`, error.code);
                    finalAttempts++;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                  }
                } else {
                  console.log('⚠️ Verificação final - Nenhuma mensagem válida encontrada');
                  finalAttempts++;
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
              } catch (error) {
                console.log(`❌ Verificação final - ERRO ao buscar mensagens:`, error.message);
                console.log(`❌ Código do erro:`, error.code);
                finalAttempts++;
                await new Promise(resolve => setTimeout(resolve, 2000));
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
