import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Events,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STAFF_ROLE_ID = '1046404063673192546';
const ADMIN_ROLE_ID = '1046404063522197521';
const PANEL_CHANNEL_ID = '1394724080187473950s';
const AUDIT_CHANNEL_ID = '1394724041671053332';
const FORBIDDEN_ROLE_ID = '1046404063673192546';
const ROLE_HIERARCHY = [
    { name: 'CEO', id: '1385675559325008105' },
    { name: 'CEO', id: '1046404063689977986' },
    { name: 'CM',  id: '1046404063522197521'  },
    { name: 'MOD',  id: '1226907937117569128'  },
    { name: 'CRD',  id: '1226903187055972484'  },
    { name: 'SEG', id: '1277638402019430501' },
    { name: 'SUP', id: '1046404063673192542' },
    { name: 'AJD', id: '1204393192284229692' }
];
const FILE_PATH = path.join(__dirname, 'avaliacoes.json');
const COOLDOWN = 6 * 60 * 60 * 1000;
const userCooldown = new Map();

function saveVotes(votes) { try { const data = Object.fromEntries(votes); fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2)); } catch (error) { } }
function loadVotes() { try { if (fs.existsSync(FILE_PATH)) { const data = fs.readFileSync(FILE_PATH, 'utf-8'); if (data.length === 0) { return new Map(); } const jsonObject = JSON.parse(data); return new Map(Object.entries(jsonObject)); } } catch (error) { } return new Map(); }
const votes = loadVotes();

function createStaffPanelEmbed(staffMember, ratingData) {
    let average = 0;
    let count = 0;
    let starString = 'Nenhuma avaliação ainda';
    let notaString = '—';
    if (ratingData && ratingData.count > 0) {
        average = (ratingData.total / ratingData.count);
        count = ratingData.count;
        const fullStars = Math.floor(average);
        const halfStar = (average - fullStars) >= 0.5 ? 1 : 0;
        const emptyStars = 5 - fullStars - halfStar;
        starString = '⭐'.repeat(fullStars) + (halfStar ? '✬' : '') + '☆'.repeat(emptyStars);
        notaString = `${average.toFixed(2)} / 5.00`;
    }
    let cargo = 'Staff';
    for (let i = 0; i < ROLE_HIERARCHY.length; i++) {
        if (staffMember.roles.cache.has(ROLE_HIERARCHY[i].id)) {
            cargo = ROLE_HIERARCHY[i].name;
            break;
        }
    }
    return new EmbedBuilder()
        .setColor(0xEAF207)
        .setAuthor({ name: staffMember.displayName, iconURL: staffMember.user.displayAvatarURL() })
        .addFields(
            { name: 'Avaliação Média', value: `${starString}\n**${notaString}**`, inline: true },
            { name: 'Total de Avaliações', value: `🗳️ **${count}**`, inline: true }
        )
        .setTimestamp();
}

function getMemberHierarchyLevel(member) {
    for (let i = 0; i < ROLE_HIERARCHY.length; i++) {
        if (member.roles.cache.has(ROLE_HIERARCHY[i].id)) {
            return i;
        }
    }
    return ROLE_HIERARCHY.length;
}

const setupAvaliacaoModule = function(client) {
    client.on('messageCreate', async message => {
        if (message.author.bot) return;
        if (message.content === '!painel-avaliacao') {
            if (!message.member.roles.cache.has(ADMIN_ROLE_ID)) return message.reply('❌ Você não tem permissão.');
            const targetChannel = message.channel;
            await targetChannel.bulkDelete(100, true).catch(() => {});
            await message.channel.send('🔄 Criando painéis individuais para cada staff na ordem de hierarquia...');
            await message.guild.members.fetch();
            let staffMembers = message.guild.members.cache.filter(member => member.roles.cache.has(STAFF_ROLE_ID) && !member.user.bot);
            let staffArray = Array.from(staffMembers.values());
            staffArray.sort((a, b) => getMemberHierarchyLevel(a) - getMemberHierarchyLevel(b));
            let created = 0;
            for (const staffMember of staffArray) {
                const staffId = staffMember.id;
                if (!votes.has(staffId)) {
                    votes.set(staffId, { total: 0, count: 0, panelMessageId: null, panelChannelId: null });
                }
                const ratingData = votes.get(staffId);
                const panelEmbed = createStaffPanelEmbed(staffMember, ratingData);
                const row = new ActionRowBuilder();
                for (let i = 1; i <= 5; i++) {
                    row.addComponents(new ButtonBuilder().setCustomId(`rate_${staffId}_${i}`).setLabel('⭐'.repeat(i)).setStyle(ButtonStyle.Primary));
                }
                try {
                    const newPanel = await targetChannel.send({ embeds: [panelEmbed], components: [row] });
                    ratingData.panelMessageId = newPanel.id;
                    ratingData.panelChannelId = targetChannel.id;
                    created++;
                } catch (error) {}
            }
            saveVotes(votes);
            await message.channel.send(`✅ ${created} painéis individuais criados na ordem de hierarquia!`);
            return;
        }
        if (message.content === '!gerenciar-paineis-staff') {
            if (!message.member.roles.cache.has(ADMIN_ROLE_ID)) return message.reply('❌ Você não tem permissão.');
            const msg = await message.reply('🔄 Iniciando gerenciamento dos painéis...');
            const guild = message.guild;
            await guild.members.fetch();
            let staffMembers = guild.members.cache.filter(member => member.roles.cache.has(STAFF_ROLE_ID) && !member.user.bot);
            const panelChannel = await client.channels.fetch(PANEL_CHANNEL_ID).catch(() => null);
            if (!panelChannel) return msg.edit('❌ Canal do painel não encontrado.');
            const oldPanelIds = [];
            for (const [staffId, staffData] of votes.entries()) {
                if (staffData.panelMessageId) {
                    oldPanelIds.push(staffData.panelMessageId);
                }
                if(votes.has(staffId)) votes.get(staffId).panelMessageId = null;
            }
            if (oldPanelIds.length > 0) {
                await msg.edit(`🔄 Deletando ${oldPanelIds.length} painéis antigos para reorganizar...`);
                await panelChannel.bulkDelete(oldPanelIds, true).catch(() => {});
            }
            await msg.edit('🔄 Ordenando a equipe por hierarquia...');
            let staffArray = Array.from(staffMembers.values());
            staffArray.sort((a, b) => getMemberHierarchyLevel(a) - getMemberHierarchyLevel(b));
            let created = 0;
            await msg.edit(`🔄 Criando ${staffArray.length} painéis na ordem correta...`);
            for (const staffMember of staffArray) {
                const staffId = staffMember.id;
                if (!votes.has(staffId)) {
                    votes.set(staffId, { total: 0, count: 0, panelMessageId: null });
                }
                const ratingData = votes.get(staffId);
                const panelEmbed = createStaffPanelEmbed(staffMember, ratingData);
                try {
                    const newPanel = await panelChannel.send({ embeds: [panelEmbed] });
                    ratingData.panelMessageId = newPanel.id;
                    created++;
                } catch (error) {}
            }
            saveVotes(votes);
            await msg.edit(`✅ **Gerenciamento concluído!**\n- ${created} painéis foram criados na ordem correta.`);
        }
    });
    client.on('interactionCreate', async interaction => {
        if (interaction.isButton() && interaction.customId.startsWith('rate_')) {
            if (interaction.member.roles.cache.has(FORBIDDEN_ROLE_ID)) { return interaction.reply({ content: '❌ Você não tem permissão para avaliar.', ephemeral: true }); }
            const [, staffId, rateStr] = interaction.customId.split('_');
            const key = `${interaction.user.id}_${staffId}`;
            const now = Date.now();
            if (userCooldown.has(key) && (now - userCooldown.get(key) < COOLDOWN)) {
                const remainingTime = COOLDOWN - (now - userCooldown.get(key));
                const remainingHours = (remainingTime / (1000 * 60 * 60)).toFixed(1);
                return interaction.reply({ content: `Você só pode avaliar este membro a cada 6 horas. Aguarde ${remainingHours} horas.`, ephemeral: true });
            }
            const modal = new ModalBuilder().setCustomId(`modal_avaliacao_${staffId}_${rateStr}`).setTitle('Avaliação do Atendimento');
            const tipoInput = new TextInputBuilder()
                .setCustomId('tipoAtendimentoInput')
                .setLabel('Tipo de atendimento (ticket ou call)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('Digite: ticket ou call');
            const justificativaInput = new TextInputBuilder()
                .setCustomId('justificativaInput')
                .setLabel('Por que você deu essa nota?')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setPlaceholder('Ex: Atendimento rápido e resolveu meu problema com eficiência.');
            modal.addComponents(
                new ActionRowBuilder().addComponents(tipoInput),
                new ActionRowBuilder().addComponents(justificativaInput)
            );
            await interaction.showModal(modal);
        }
        if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_avaliacao_')) {
            const [, , staffId, rateStr] = interaction.customId.split('_');
            const key = `${interaction.user.id}_${staffId}`;
            const rate = parseInt(rateStr, 10);
            const tipoAtendimento = interaction.fields.getTextInputValue('tipoAtendimentoInput').toLowerCase();
            const justificativa = interaction.fields.getTextInputValue('justificativaInput');
            if (!votes.has(staffId)) { votes.set(staffId, { total: 0, count: 0, panelMessageId: null, panelChannelId: null }); }
            const ratingData = votes.get(staffId);
            ratingData.total += rate;
            ratingData.count += 1;
            userCooldown.set(key, Date.now());
            saveVotes(votes);
            try {
                const auditChannel = await client.channels.fetch(AUDIT_CHANNEL_ID);
                if (auditChannel && auditChannel.isTextBased()) {
                    const serviceTypeText = tipoAtendimento === 'ticket' ? 'Atendimento via Ticket' : 'Atendimento via Call Suporte';
                    const auditEmbed = new EmbedBuilder().setColor(0x3498DB).setTitle('📝 Nova Avaliação Recebida').addFields({ name: '👤 Avaliador', value: `<@${interaction.user.id}> (ID: ${interaction.user.id})`, inline: false }, { name: '👥 Staff Avaliado', value: `<@${staffId}> (ID: ${staffId})`, inline: false }, { name: '⭐ Nota', value: '⭐'.repeat(rate) + ` (${rate} estrelas)`, inline: false }, { name: '🔧 Tipo de Atendimento', value: serviceTypeText, inline: false }, { name: '💬 Justificativa', value: `\n${justificativa}\n`, inline: false }).setTimestamp().setFooter({ text: 'Sistema de Avaliação', iconURL: client.user.displayAvatarURL() });
                    await auditChannel.send({ embeds: [auditEmbed] });
                }
            } catch (error) { }
            if (ratingData.panelMessageId && ratingData.panelChannelId) {
                try {
                    const panelChannel = await client.channels.fetch(ratingData.panelChannelId);
                    const panelToUpdate = await panelChannel.messages.fetch(ratingData.panelMessageId);
                    const staffMember = await interaction.guild.members.fetch(staffId);
                    const updatedEmbed = createStaffPanelEmbed(staffMember, ratingData);
                    await panelToUpdate.edit({ embeds: [updatedEmbed] });
                } catch (error) { }
            }
            await interaction.reply({ content: '✅ Sua avaliação foi enviada com sucesso!', ephemeral: true });
        }
    });
};
export default setupAvaliacaoModule; 