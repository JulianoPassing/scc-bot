import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function generateAvaliacoesRelatorio(votes, guild) {
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
    
    // Ordenar por nota média (maior para menor)
    staffWithVotes.sort((a, b) => {
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
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #EAF207 0%, #FFD700 100%);
            padding: 30px;
            text-align: center;
            color: #333;
        }

        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
        }

        .header p {
            font-size: 1.2em;
            opacity: 0.8;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }

        .stat-card {
            background: white;
            padding: 25px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
            transition: transform 0.3s ease;
        }

        .stat-card:hover {
            transform: translateY(-5px);
        }

        .stat-number {
            font-size: 2.5em;
            font-weight: bold;
            color: #EAF207;
            margin-bottom: 10px;
        }

        .stat-label {
            color: #666;
            font-size: 1.1em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .staff-list {
            padding: 30px;
        }

        .staff-list h2 {
            color: #333;
            margin-bottom: 25px;
            font-size: 1.8em;
            text-align: center;
        }

        .staff-card {
            background: white;
            margin-bottom: 20px;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
            border-left: 5px solid #EAF207;
            transition: all 0.3s ease;
        }

        .staff-card:hover {
            transform: translateX(10px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
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
            color: #333;
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
            color: #EAF207;
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
            background: #f8f9fa;
            border-radius: 10px;
        }

        .stat-item-value {
            font-size: 1.5em;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }

        .stat-item-label {
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .footer {
            background: #333;
            color: white;
            padding: 20px;
            text-align: center;
        }

        .no-data {
            text-align: center;
            padding: 50px;
            color: #666;
            font-size: 1.2em;
        }

        .no-data-icon {
            font-size: 4em;
            margin-bottom: 20px;
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
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⭐ Relatório de Avaliações</h1>
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
            <h2>📊 Avaliações por Staff</h2>
            ${staffWithVotes.length === 0 ? `
                <div class="no-data">
                    <div class="no-data-icon">📭</div>
                    <p>Nenhuma avaliação encontrada</p>
                </div>
            ` : staffWithVotes.map(([staffId, data]) => {
                const member = guild ? guild.members.cache.get(staffId) : null;
                const staffName = member ? member.displayName : `Staff ${staffId}`;
                const average = data.total / data.count;
                const fullStars = Math.floor(average);
                const halfStar = (average - fullStars) >= 0.5 ? 1 : 0;
                const emptyStars = 5 - fullStars - halfStar;
                const starString = '⭐'.repeat(fullStars) + (halfStar ? '✬' : '') + '☆'.repeat(emptyStars);
                
                return `
                    <div class="staff-card">
                        <div class="staff-header">
                            <div class="staff-name">${staffName}</div>
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
            <p>Relatório gerado automaticamente pelo Sistema de Avaliações do Street Car Club</p>
            <p>Data: ${formattedDate}</p>
        </div>
    </div>
</body>
</html>`;

    return html;
}

export function saveRelatorio(html, filename) {
    const relatoriosDir = path.join(__dirname, '..', 'relatorios');
    
    // Criar diretório se não existir
    if (!fs.existsSync(relatoriosDir)) {
        fs.mkdirSync(relatoriosDir, { recursive: true });
    }
    
    const filePath = path.join(relatoriosDir, filename);
    fs.writeFileSync(filePath, html, 'utf-8');
    
    return filePath;
}
