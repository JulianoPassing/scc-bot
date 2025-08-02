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
            let messageName = messageContent.split('\n')[0] || messageContent || 'Usuário Liberado';
            
            // Limpar o nome de formatações e limitar a 32 caracteres
            messageName = messageName
                .replace(/\*\*/g, '') // Remove **
                .replace(/\*/g, '') // Remove *
                .replace(/`/g, '') // Remove `
                .replace(/__/g, '') // Remove __
                .replace(/#/g, '') // Remove #
                .replace(/\n/g, ' ') // Remove quebras de linha
                .replace(/\s+/g, ' ') // Remove espaços extras
                .trim();
            
            // Limitar a 32 caracteres (limite do Discord)
            if (messageName.length > 32) {
                messageName = messageName.substring(0, 29) + '...';
            }
            
            // Se ficou vazio, usar nome padrão
            if (!messageName || messageName.length === 0) {
                messageName = 'Usuário Liberado';
            }
            
            console.log(`📝 Nome processado: "${messageName}" (${messageName.length} caracteres)`);
            
            // Cargos
            const cargoAdicionar = '1317086939555434557';
            const cargoRemover = '1263487190575349892';
            
            // Verificar permissões do bot
            const botMember = guild.members.cache.get(client.user.id);
            const hasManageNicknames = botMember.permissions.has('ManageNicknames');
            const hasManageRoles = botMember.permissions.has('ManageRoles');
            
            console.log(`🔐 Permissões do bot: ManageNicknames=${hasManageNicknames}, ManageRoles=${hasManageRoles}`);
            
            // Alterar nickname do usuário (se tiver permissão)
            if (hasManageNicknames) {
                await member.setNickname(messageName);
                console.log(`✅ Nickname alterado para: ${messageName}`);
            } else {
                console.log(`❌ Bot não tem permissão para alterar nickname`);
            }
            
            // Adicionar cargo (se tiver permissão)
            if (hasManageRoles && cargoAdicionar) {
                await member.roles.add(cargoAdicionar);
                console.log(`✅ Cargo adicionado: ${cargoAdicionar}`);
            } else {
                console.log(`❌ Bot não tem permissão para adicionar cargos`);
            }
            
            // Remover cargo (se tiver permissão)
            if (hasManageRoles && cargoRemover) {
                await member.roles.remove(cargoRemover);
                console.log(`✅ Cargo removido: ${cargoRemover}`);
            } else {
                console.log(`❌ Bot não tem permissão para remover cargos`);
            }
            
            console.log(`✅ Usuário ${user.tag} liberado com sucesso!`);
            
            // Preparar mensagem de confirmação
            let confirmMessage = `✅ **Liberação processada!**\n👤 **Usuário:** ${user}\n📝 **Nome processado:** ${messageName}\n`;
            
            if (hasManageNicknames) {
                confirmMessage += `✅ **Nickname alterado**\n`;
            } else {
                confirmMessage += `❌ **Nickname não alterado** (sem permissão)\n`;
            }
            
            if (hasManageRoles) {
                confirmMessage += `➕ **Cargo adicionado:** <@&${cargoAdicionar}>\n➖ **Cargo removido:** <@&${cargoRemover}>`;
            } else {
                confirmMessage += `❌ **Cargos não alterados** (sem permissão)`;
            }
            
            // Enviar mensagem de confirmação
            const confirmChannel = reaction.message.channel;
            await confirmChannel.send({
                content: confirmMessage
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