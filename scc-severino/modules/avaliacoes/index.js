import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Events,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    AttachmentBuilder
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
    { name: 'DEV', id: '1046404063689977984' },
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

function generateAvaliacoesRelatorio(votes, guild) {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Filtrar apenas staff com avaliações
    const staffWithVotes = Array.from(votes.entries()).filter(([staffId, data]) => data.count > 0);
    
    // Ordenar por hierarquia primeiro, depois por nota média
    staffWithVotes.sort((a, b) => {
        const memberA = guild ? guild.members.cache.get(a[0]) : null;
        const memberB = guild ? guild.members.cache.get(b[0]) : null;
        
        if (!memberA || !memberB) return 0;
        
        // Ordenar por hierarquia primeiro
        const hierarchyA = getMemberHierarchyLevel(memberA);
        const hierarchyB = getMemberHierarchyLevel(memberB);
        
        if (hierarchyA !== hierarchyB) {
            return hierarchyA - hierarchyB;
        }
        
        // Se mesma hierarquia, ordenar por nota média (maior para menor)
        const avgA = a[1].total / a[1].count;
        const avgB = b[1].total / b[1].count;
        return avgB - avgA;
    });

    // Calcular estatísticas gerais
    const totalAvaliacoes = staffWithVotes.reduce((sum, [, data]) => sum + data.count, 0);
    const mediaGeral = staffWithVotes.length > 0 
        ? staffWithVotes.reduce((sum, [, data]) => sum + (data.total / data.count), 0) / staffWithVotes.length 
        : 0;

    // Gerar HTML
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Avaliações - Street Car Club</title>
    <link rel="icon" href="https://i.imgur.com/YULctuK.png" type="image/png">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A==" crossorigin="anonymous" referrerpolicy="no-referrer" />
    
    <style>
        /* Importar fontes */
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');

        :root {
            --primary-color: #EAF207;
            --secondary-color: #F4F740;
            --accent-color: #C6C403;
            --background-color: #0D0D0D;
            --card-background: linear-gradient(135deg, #0D0D0D 0%, #0D0D0D 100%);
            --text-color: #FFFFFF;
            --text-secondary: #B0B0B0;
            --border-color: #30363D;
            --hover-color: #21262D;
            --shadow-color: rgba(0, 0, 0, 0.4);
            --gradient-primary: linear-gradient(135deg, #EAF207 0%, #F4F740 100%);
            --gradient-secondary: linear-gradient(135deg, #C6C403 0%, #EAF207 100%);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        /* Animações avançadas */
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(50px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes slideInLeft {
            from {
                opacity: 0;
                transform: translateX(-100px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }

        @keyframes glow {
            0%, 100% { box-shadow: 0 0 20px rgba(234, 242, 7, 0.3); }
            50% { box-shadow: 0 0 30px rgba(234, 242, 7, 0.6); }
        }

        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }

        /* Scroll personalizado */
        ::-webkit-scrollbar {
            width: 12px;
        }

        ::-webkit-scrollbar-track {
            background: var(--background-color);
            border-radius: 10px;
        }

        ::-webkit-scrollbar-thumb {
            background: var(--gradient-primary);
            border-radius: 10px;
            border: 2px solid var(--background-color);
        }

        ::-webkit-scrollbar-thumb:hover {
            background: var(--secondary-color);
        }

        body {
            font-family: 'Poppins', sans-serif;
            background: var(--background-color);
            background-image: url('https://i.imgur.com/Wf7bGAO.png');
            background-size: cover;
            background-position: center;
            background-attachment: fixed;
            background-repeat: no-repeat;
            color: var(--text-color);
            line-height: 1.7;
            overflow-x: hidden;
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: var(--card-background);
            border-radius: 20px;
            box-shadow: 0 20px 40px var(--shadow-color);
            overflow: hidden;
            border: 1px solid var(--border-color);
            animation: fadeInUp 0.8s ease-out forwards;
        }

        .header {
            background: var(--card-background);
            padding: 40px;
            text-align: center;
            position: relative;
            overflow: hidden;
            box-shadow: 0 10px 30px var(--shadow-color);
        }

        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: none;
            animation: none;
        }

        .header::after {
            content: '';
            position: absolute;
            top: 50%;
            right: 30px;
            width: 10px;
            height: 10px;
            background: radial-gradient(circle, #ff4d4d 60%, #ffb347 100%);
            border-radius: 50%;
            transform: translateY(-50%);
            box-shadow: 0 0 8px 2px #ff4d4d99;
            z-index: 3;
        }

        .logo {
            position: relative;
            z-index: 2;
            margin-bottom: 20px;
        }

        .logo img {
            max-width: 300px;
            height: auto;
            filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3));
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        .logo img:hover {
            transform: scale(1.08) rotate(2deg);
            filter: drop-shadow(0 15px 30px rgba(0, 0, 0, 0.4));
        }

        .header h1 {
            font-size: 2.5em;
            font-weight: 700;
            background: var(--gradient-primary);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
            position: relative;
            padding-bottom: 20px;
        }

        .header h1::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 80px;
            height: 3px;
            background: var(--gradient-primary);
            border-radius: 2px;
        }

        .header p {
            font-size: 1.2em;
            color: var(--text-secondary);
            opacity: 0.9;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            padding: 30px;
            background: rgba(13, 13, 13, 0.8);
        }

        .stat-card {
            background: var(--card-background);
            padding: 25px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 5px 15px var(--shadow-color);
            transition: all 0.4s ease;
            border: 1px solid var(--border-color);
            position: relative;
            overflow: hidden;
        }

        .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 4px;
            background: var(--gradient-primary);
        }

        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 30px var(--shadow-color);
        }

        .stat-number {
            font-size: 2.5em;
            font-weight: bold;
            background: var(--gradient-primary);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }

        .stat-label {
            color: var(--text-secondary);
            font-size: 1.1em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .staff-list {
            padding: 30px;
            background: rgba(13, 13, 13, 0.6);
        }

        .staff-list h2 {
            color: var(--text-color);
            margin-bottom: 25px;
            font-size: 1.8em;
            text-align: center;
            font-weight: 700;
            background: var(--gradient-primary);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            position: relative;
            padding-bottom: 20px;
        }

        .staff-list h2::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 80px;
            height: 3px;
            background: var(--gradient-primary);
            border-radius: 2px;
        }

        .hierarchy-info {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: rgba(234, 242, 7, 0.1);
            border-radius: 15px;
            border: 1px solid rgba(234, 242, 7, 0.3);
            color: var(--text-secondary);
            font-size: 1.1em;
        }

        .hierarchy-info strong {
            color: var(--primary-color);
            font-weight: 600;
        }

        .staff-card {
            background: var(--card-background);
            margin-bottom: 20px;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 5px 15px var(--shadow-color);
            border-left: 5px solid var(--primary-color);
            transition: all 0.4s ease;
            border: 1px solid var(--border-color);
            position: relative;
            overflow: hidden;
        }

        .staff-card::before {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 1px;
            height: 100%;
            background: linear-gradient(to bottom, var(--primary-color), transparent);
        }

        .staff-card:hover {
            transform: translateX(10px);
            box-shadow: 0 15px 30px var(--shadow-color);
        }

        .staff-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            flex-wrap: wrap;
            gap: 15px;
        }

        .staff-name {
            font-size: 1.4em;
            font-weight: bold;
            color: var(--text-color);
        }

        .staff-name .cargo {
            font-size: 1.1em;
            color: var(--primary-color);
            margin-bottom: 5px;
            font-weight: 600;
        }

        .staff-name .name {
            color: var(--text-color);
        }

        .staff-rating {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .rating-stars {
            font-size: 1.5em;
            color: #FFD700;
        }

        .rating-number {
            font-size: 1.3em;
            font-weight: bold;
            color: var(--primary-color);
        }

        .staff-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }

        .stat-item {
            text-align: center;
            padding: 15px;
            background: rgba(234, 242, 7, 0.1);
            border-radius: 10px;
            border: 1px solid rgba(234, 242, 7, 0.2);
            transition: all 0.3s ease;
        }

        .stat-item:hover {
            background: rgba(234, 242, 7, 0.2);
            transform: translateY(-2px);
        }

        .stat-item-value {
            font-size: 1.5em;
            font-weight: bold;
            color: var(--text-color);
            margin-bottom: 5px;
        }

        .stat-item-label {
            color: var(--text-secondary);
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .footer {
            background: var(--card-background);
            color: var(--text-color);
            padding: 20px;
            text-align: center;
            border-top: 1px solid var(--border-color);
        }

        .footer p {
            color: var(--text-secondary);
            margin-bottom: 5px;
        }

        .no-data {
            text-align: center;
            padding: 50px;
            color: var(--text-secondary);
            font-size: 1.2em;
        }

        .no-data-icon {
            font-size: 4em;
            margin-bottom: 20px;
            color: var(--primary-color);
        }

        @media (max-width: 768px) {
            .container {
                margin: 10px;
                border-radius: 15px;
            }
            
            .header h1 {
                font-size: 2em;
            }
            
            .staff-header {
                flex-direction: column;
                text-align: center;
            }
            
            .staff-stats {
                grid-template-columns: 1fr;
            }
            
            .logo img {
                max-width: 250px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <img src="https://i.imgur.com/kHvmXj6.png" alt="Street Car Club Roleplay Logo" />
            </div>
            <h1><i class="fas fa-star"></i> Relatório de Avaliações</h1>
            <p>Street Car Club • Gerado em ${formattedDate}</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${staffWithVotes.length}</div>
                <div class="stat-label">Staff Avaliados</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${totalAvaliacoes}</div>
                <div class="stat-label">Total de Avaliações</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${mediaGeral.toFixed(2)}</div>
                <div class="stat-label">Média Geral</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${guild ? guild.memberCount : 'N/A'}</div>
                <div class="stat-label">Membros do Servidor</div>
            </div>
        </div>

        <div class="staff-list">
            <h2><i class="fas fa-chart-bar"></i> Avaliações por Staff</h2>
            <div class="hierarchy-info">
                <strong>Hierarquia de Cargos:</strong> CEO → CM → MOD → CRD → SEG → SUP → AJD
            </div>
            ${staffWithVotes.length === 0 ? `
                <div class="no-data">
                    <div class="no-data-icon">📭</div>
                    <p>Nenhuma avaliação encontrada</p>
                </div>
            ` : staffWithVotes.map(([staffId, data]) => {
                const member = guild ? guild.members.cache.get(staffId) : null;
                let staffName = `Staff ${staffId}`;
                let cargo = 'Staff';
                
                if (member) {
                    staffName = member.displayName || member.user.username || `Staff ${staffId}`;
                    
                    // Determinar cargo do staff
                    for (let i = 0; i < ROLE_HIERARCHY.length; i++) {
                        if (member.roles.cache.has(ROLE_HIERARCHY[i].id)) {
                            cargo = ROLE_HIERARCHY[i].name;
                            break;
                        }
                    }
                } else if (guild) {
                    // Tentar buscar o usuário se não estiver no cache
                    try {
                        const user = guild.client.users.cache.get(staffId);
                        if (user) {
                            staffName = user.username || `Staff ${staffId}`;
                        }
                    } catch (error) {
                        console.error('Erro ao buscar usuário:', error);
                    }
                }
                
                const average = data.total / data.count;
                const fullStars = Math.floor(average);
                const halfStar = (average - fullStars) >= 0.5 ? 1 : 0;
                const emptyStars = 5 - fullStars - halfStar;
                const starString = '⭐'.repeat(fullStars) + (halfStar ? '✬' : '') + '☆'.repeat(emptyStars);
                
                return `
                    <div class="staff-card">
                        <div class="staff-header">
                            <div class="staff-name">
                                <div class="cargo">[${cargo}]</div>
                                <div class="name">${staffName}</div>
                            </div>
                            <div class="staff-rating">
                                <div class="rating-stars">${starString}</div>
                                <div class="rating-number">${average.toFixed(2)}</div>
                            </div>
                        </div>
                        <div class="staff-stats">
                            <div class="stat-item">
                                <div class="stat-item-value">${data.count}</div>
                                <div class="stat-item-label">Avaliações</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-item-value">${data.total}</div>
                                <div class="stat-item-label">Pontos Totais</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-item-value">${average.toFixed(2)}</div>
                                <div class="stat-item-label">Média</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-item-value">${((data.count / totalAvaliacoes) * 100).toFixed(1)}%</div>
                                <div class="stat-item-label">Participação</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>

        <div class="footer">
            <p><i class="fas fa-robot"></i> Relatório gerado automaticamente pelo Sistema de Avaliações do Street Car Club</p>
            <p><i class="fas fa-calendar-alt"></i> Data: ${formattedDate}</p>
        </div>
    </div>
</body>
</html>`;

    return html;
}

function saveRelatorio(html, filename) {
    const relatoriosDir = path.join(__dirname, 'relatorios');
    
    // Criar diretório se não existir
    if (!fs.existsSync(relatoriosDir)) {
        fs.mkdirSync(relatoriosDir, { recursive: true });
    }
    
    const filePath = path.join(relatoriosDir, filename);
    fs.writeFileSync(filePath, html, 'utf-8');
    
    return filePath;
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
                    row.addComponents(new ButtonBuilder().setCustomId(`rate_${staffId}_${i}`).setLabel('⭐'.repeat(i)).setStyle(ButtonStyle.Secondary));
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
        if (message.content === '!relatorio-avaliacoes') {
            if (!message.member.roles.cache.has(ADMIN_ROLE_ID)) return message.reply('❌ Você não tem permissão para usar este comando.');
            
            try {
                const processingMsg = await message.reply('🔄 Gerando relatório de avaliações...');
                
                // Verificar se há avaliações
                const hasVotes = Array.from(votes.values()).some(data => data.count > 0);
                if (!hasVotes) {
                    return processingMsg.edit('❌ Nenhuma avaliação encontrada para gerar o relatório.');
                }
                
                // Gerar nome do arquivo com timestamp
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                const filename = `relatorio-avaliacoes-${timestamp}.html`;
                
                // Buscar todos os membros do servidor antes de gerar o relatório
                try {
                    await message.guild.members.fetch();
                } catch (error) {
                    console.error('Erro ao buscar membros:', error);
                }
                
                // Gerar HTML do relatório
                const html = generateAvaliacoesRelatorio(votes, message.guild);
                
                // Salvar arquivo
                const filePath = saveRelatorio(html, filename);
                
                // Criar attachment
                const attachment = new AttachmentBuilder(filePath, { name: filename });
                
                // Embed de sucesso
                const successEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('📊 Relatório de Avaliações Gerado!')
                    .setDescription('O relatório HTML foi gerado com sucesso e está anexado abaixo.')
                    .addFields(
                        { name: '📁 Arquivo', value: `\`${filename}\``, inline: true },
                        { name: '📅 Data', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                        { name: '👥 Staff Avaliados', value: `${Array.from(votes.values()).filter(data => data.count > 0).length}`, inline: true }
                    )
                    .setFooter({ text: 'Street Car Club • Sistema de Avaliações' })
                    .setTimestamp();
                
                // Enviar relatório
                await processingMsg.edit({ 
                    content: '✅ Relatório gerado com sucesso!',
                    embeds: [successEmbed],
                    files: [attachment]
                });
                
                // Deletar arquivo temporário após 5 segundos
                setTimeout(() => {
                    try {
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    } catch (error) {
                        console.error('Erro ao deletar arquivo temporário:', error);
                    }
                }, 5000);
                
            } catch (error) {
                console.error('Erro no comando relatorio-avaliacoes:', error);
                await message.reply('❌ Erro ao gerar o relatório. Verifique os logs para mais detalhes.');
            }
        }
        if (message.content === '!zerar-avaliacoes') {
            if (!message.member.roles.cache.has(ADMIN_ROLE_ID)) return message.reply('❌ Você não tem permissão para usar este comando.');
            
            try {
                // Verificar se há avaliações
                const hasVotes = Array.from(votes.values()).some(data => data.count > 0);
                if (!hasVotes) {
                    return message.reply('❌ Nenhuma avaliação encontrada para zerar.');
                }
                
                // Calcular estatísticas
                let totalAvaliacoes = 0;
                let totalStaff = 0;
                
                for (const [, data] of votes.entries()) {
                    if (data.count > 0) {
                        totalAvaliacoes += data.count;
                        totalStaff++;
                    }
                }
                
                // Confirmar a ação
                const confirmEmbed = new EmbedBuilder()
                    .setColor(0xFF6B6B)
                    .setTitle('⚠️ Confirmação de Zerar Avaliações')
                    .setDescription('Você está prestes a zerar **TODAS** as avaliações de staff!')
                    .addFields(
                        { name: '📊 Dados que serão removidos:', value: 
                            `• **${totalStaff}** staff com avaliações\n` +
                            `• **${totalAvaliacoes}** avaliações totais\n` +
                            `• Médias e contadores serão resetados`, inline: false },
                        { name: '⚠️ Aviso:', value: 'Esta ação **NÃO PODE SER DESFEITA**!', inline: false }
                    )
                    .setFooter({ text: 'Digite "CONFIRMAR" para prosseguir ou "CANCELAR" para cancelar' })
                    .setTimestamp();
                
                const confirmMessage = await message.reply({ embeds: [confirmEmbed] });
                
                // Coletar resposta do usuário
                const filter = (response) => response.author.id === message.author.id;
                const collector = message.channel.createMessageCollector({ filter, time: 30000, max: 1 });
                
                collector.on('collect', async (response) => {
                    if (response.content.toUpperCase() === 'CONFIRMAR') {
                        try {
                            // Zerar o arquivo de avaliações
                            fs.writeFileSync(FILE_PATH, '[]');
                            
                            const successEmbed = new EmbedBuilder()
                                .setColor(0x00FF00)
                                .setTitle('✅ Avaliações Zeradas com Sucesso!')
                                .setDescription('Todas as avaliações de staff foram removidas do sistema.')
                                .addFields(
                                    { name: '📊 Dados Removidos:', value: 
                                        `• **${totalStaff}** staff com avaliações\n` +
                                        `• **${totalAvaliacoes}** avaliações totais`, inline: false },
                                    { name: '🔄 Próximos Passos:', value: 
                                        '• Use `!painel-avaliacao` para recriar os painéis\n' +
                                        '• Os painéis aparecerão com "Nenhuma avaliação ainda"', inline: false }
                                )
                                .setTimestamp();
                            
                            await response.reply({ embeds: [successEmbed] });
                            
                            // Deletar mensagens de confirmação
                            try {
                                await confirmMessage.delete();
                                await response.delete();
                            } catch (error) {}
                            
                        } catch (error) {
                            console.error('Erro ao zerar avaliações:', error);
                            await response.reply('❌ Erro ao zerar as avaliações. Verifique os logs para mais detalhes.');
                        }
                    } else if (response.content.toUpperCase() === 'CANCELAR') {
                        await response.reply('❌ Operação cancelada. As avaliações permanecem inalteradas.');
                        try {
                            await confirmMessage.delete();
                            await response.delete();
                        } catch (error) {}
                    } else {
                        await response.reply('❌ Resposta inválida. Digite "CONFIRMAR" ou "CANCELAR".');
                    }
                });
                
                collector.on('end', async (collected) => {
                    if (collected.size === 0) {
                        await message.reply('⏰ Tempo esgotado. Operação cancelada automaticamente.');
                        try {
                            await confirmMessage.delete();
                        } catch (error) {}
                    }
                });
                
            } catch (error) {
                console.error('Erro no comando zerar-avaliacoes:', error);
                await message.reply('❌ Erro ao processar o comando. Verifique os logs para mais detalhes.');
            }
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