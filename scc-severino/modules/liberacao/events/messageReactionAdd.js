import { formatName } from '../utils/nameFormatter.js';

export default {
    name: 'messageReactionAdd',
    async execute(reaction, user) {
        console.log('🔍 Evento messageReactionAdd detectado!');
        console.log('📝 Canal:', reaction.message.channel.id);
        console.log('😀 Emoji:', reaction.emoji.name);
        console.log('👤 Quem reagiu:', user.tag);
        console.log('📝 Autor da mensagem:', reaction.message.author.tag);
        
        // Verificar se a reação é parcial e buscar a mensagem completa
        if (reaction.partial) {
            try {
                await reaction.fetch();
                console.log('📥 Reação parcial carregada com sucesso');
            } catch (error) {
                console.error('❌ Erro ao buscar reação parcial:', error);
                return;
            }
        }

        // Verificar se a mensagem é parcial e buscar a mensagem completa
        if (reaction.message.partial) {
            try {
                await reaction.message.fetch();
                console.log('📥 Mensagem parcial carregada com sucesso');
            } catch (error) {
                console.error('❌ Erro ao buscar mensagem parcial:', error);
                return;
            }
        }

        // Verificar se é o canal específico do módulo liberacao
        if (reaction.message.channel.id !== '1317096106844225586') {
            console.log('❌ Canal incorreto para módulo liberacao, saindo...');
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
            
            // Verificar se quem reagiu tem o cargo específico
            const reactorMember = await guild.members.fetch(user.id);
            const cargoPermitido = '1046404063673192541';
            
            if (!reactorMember.roles.cache.has(cargoPermitido)) {
                console.log(`❌ Usuário ${user.tag} não tem o cargo necessário para liberar`);
                return;
            }
            
            console.log(`✅ Usuário ${user.tag} tem permissão para liberar`);
            
            // Pegar o autor da mensagem, não quem reagiu
            const messageAuthor = reaction.message.author;
            const member = await guild.members.fetch(messageAuthor.id);
            
            // Obter o nome da mensagem (primeira linha ou conteúdo da mensagem)
            const messageContent = reaction.message.content;
            const messageName = messageContent.split('\n')[0] || messageContent || 'Usuário Liberado';
            
            // Processar o nome usando a função de formatação
            const processedName = formatName(messageName);
            
            console.log(`📝 Nome processado: "${processedName}" (${processedName.length} caracteres)`);
            
            // Cargos
            const cargoAdicionar = '1317086939555434557';
            const cargoRemover = '1263487190575349892';
            
            // Verificar permissões do bot
            const botMember = guild.members.cache.get(reaction.client.user.id);
            const hasManageNicknames = botMember.permissions.has('ManageNicknames');
            const hasManageRoles = botMember.permissions.has('ManageRoles');
            
            console.log(`🔐 Permissões do bot: ManageNicknames=${hasManageNicknames}, ManageRoles=${hasManageRoles}`);
            
            // Verificar hierarquia de cargos
            const botHighestRole = botMember.roles.highest;
            const userHighestRole = member.roles.highest;
            
            console.log(`👑 Cargo mais alto do bot: ${botHighestRole.name} (${botHighestRole.position})`);
            console.log(`👑 Cargo mais alto do autor da mensagem: ${userHighestRole.name} (${userHighestRole.position})`);
            console.log(`🔍 Bot pode gerenciar autor da mensagem: ${botHighestRole.position > userHighestRole.position}`);
            
            // Verificar se o usuário é o dono do servidor
            if (messageAuthor.id === guild.ownerId) {
                console.log(`❌ Usuário é o dono do servidor, não é possível alterar`);
                await reaction.message.channel.send({
                    content: `❌ **Não é possível liberar o dono do servidor!**`
                });
                return;
            }
            
            // Alterar nickname do usuário (se tiver permissão e hierarquia)
            if (hasManageNicknames && botHighestRole.position > userHighestRole.position) {
                try {
                    await member.setNickname(processedName);
                    console.log(`✅ Nickname alterado para: ${processedName}`);
                } catch (error) {
                    console.log(`❌ Erro ao alterar nickname: ${error.message}`);
                }
            } else {
                console.log(`❌ Bot não tem permissão ou hierarquia para alterar nickname`);
            }
            
            // Adicionar cargo (se tiver permissão e hierarquia)
            if (hasManageRoles && botHighestRole.position > userHighestRole.position) {
                try {
                    await member.roles.add(cargoAdicionar);
                    console.log(`✅ Cargo adicionado: ${cargoAdicionar}`);
                } catch (error) {
                    console.log(`❌ Erro ao adicionar cargo: ${error.message}`);
                }
            } else {
                console.log(`❌ Bot não tem permissão ou hierarquia para adicionar cargos`);
            }
            
            // Remover cargo (se tiver permissão e hierarquia)
            if (hasManageRoles && botHighestRole.position > userHighestRole.position) {
                try {
                    await member.roles.remove(cargoRemover);
                    console.log(`✅ Cargo removido: ${cargoRemover}`);
                } catch (error) {
                    console.log(`❌ Erro ao remover cargo: ${error.message}`);
                }
            } else {
                console.log(`❌ Bot não tem permissão ou hierarquia para remover cargos`);
            }
            
            console.log(`✅ Usuário ${messageAuthor.tag} liberado com sucesso!`);
            console.log(`✅ Processo concluído silenciosamente para ${user.tag}`);
            
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