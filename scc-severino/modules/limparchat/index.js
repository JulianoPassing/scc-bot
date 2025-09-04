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
            
            // Busca e deleta TODAS as mensagens do canal - VERSÃO AGRESSIVA
            let deletedCount = 0;
            let lastMessageId = null;
            let attempts = 0;
            const maxAttempts = 200; // Aumentei o limite
            
            console.log('🧹 Iniciando limpeza agressiva do canal...');
            
            while (attempts < maxAttempts) {
              try {
                const messages = await message.channel.messages.fetch({ 
                  limit: 100, 
                  before: lastMessageId 
                });
                
                console.log(`📊 Tentativa ${attempts + 1}: Encontradas ${messages.size} mensagens`);
                
                if (messages.size === 0) {
                  console.log('✅ Nenhuma mensagem encontrada, parando...');
                  break;
                }
                
                // SEMPRE deleta uma por uma para garantir que funcione
                for (const msg of messages.values()) {
                  try {
                    await msg.delete();
                    deletedCount++;
                    console.log(`🗑️ Deletada mensagem ${msg.id} (${deletedCount} total)`);
                    // Pausa muito pequena
                    await new Promise(resolve => setTimeout(resolve, 50));
                  } catch (deleteError) {
                    console.log(`❌ Erro ao deletar mensagem ${msg.id}:`, deleteError.message);
                  }
                }
                
                lastMessageId = messages.last().id;
                attempts++;
                
                // Pausa mínima
                await new Promise(resolve => setTimeout(resolve, 200));
                
              } catch (fetchError) {
                console.log(`❌ Erro ao buscar mensagens:`, fetchError.message);
                attempts++;
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
            
            console.log(`🏁 Limpeza principal concluída. ${deletedCount} mensagens deletadas em ${attempts} tentativas.`);
            
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
