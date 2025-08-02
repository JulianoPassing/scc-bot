export default {
    name: 'messageReactionAdd',
    async execute(reaction, user) {
        console.log('🔍 Evento messageReactionAdd detectado!');
        console.log('📝 Canal:', reaction.message.channel.id);
        console.log('😀 Emoji:', reaction.emoji.name);
        console.log('👤 Usuário:', user.tag);
        
        // Verificar se a reação é parcial e buscar a mensagem completa
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('Erro ao buscar reação:', error);
                return;
            }
        }

        // Verificar se é o canal específico
        if (reaction.message.channel.id !== '1317096106844225586') {
            console.log('❌ Canal incorreto, saindo...');
            return;
        }

        // Verificar se o emoji é V_confirm (verificação mais flexível)
        console.log('🔍 Verificando emoji:', reaction.emoji.name);
        if (reaction.emoji.name !== 'V_confirm' && reaction.emoji.name !== '✅') {
            console.log('❌ Emoji incorreto, saindo...');
            return;
        }

        try {
            const guild = reaction.message.guild;
            const member = await guild.members.fetch(user.id);
            
            // Obter o nome da mensagem (primeira linha ou conteúdo da mensagem)
            const messageContent = reaction.message.content;
            const messageName = messageContent.split('\n')[0] || messageContent || 'Usuário Liberado';
            
            // Cargos
            const cargoAdicionar = '1317086939555434557';
            const cargoRemover = '1263487190575349892';
            
            // Alterar nickname do usuário
            await member.setNickname(messageName);
            
            // Adicionar cargo
            if (cargoAdicionar) {
                await member.roles.add(cargoAdicionar);
            }
            
            // Remover cargo
            if (cargoRemover) {
                await member.roles.remove(cargoRemover);
            }
            
            console.log(`✅ Usuário ${user.tag} liberado com sucesso!`);
            
            // Enviar mensagem de confirmação
            const confirmChannel = reaction.message.channel;
            await confirmChannel.send({
                content: `✅ **Liberação realizada com sucesso!**\n👤 **Usuário:** ${user}\n📝 **Nome alterado para:** ${messageName}\n➕ **Cargo adicionado:** <@&${cargoAdicionar}>\n➖ **Cargo removido:** <@&${cargoRemover}>`
            });
            
        } catch (error) {
            console.error('❌ Erro ao processar liberação:', error);
            
            // Enviar mensagem de erro
            const errorChannel = reaction.message.channel;
            await errorChannel.send({
                content: `❌ **Erro ao processar liberação:** ${error.message}`
            });
        }
    }
}; 