/**
 * Formata o nome para o padrão "Primeira letra maiúscula"
 * @param {string} name - Nome original da mensagem
 * @returns {string} - Nome formatado
 */
export function formatName(name) {
    if (!name || typeof name !== 'string') {
        return 'Usuário Liberado';
    }
    
    // Limpar formatações do Discord
    let processedName = name
        .replace(/\*\*/g, '') // Remove **
        .replace(/\*/g, '') // Remove *
        .replace(/`/g, '') // Remove `
        .replace(/__/g, '') // Remove __
        .replace(/#/g, '') // Remove #
        .replace(/\n/g, ' ') // Remove quebras de linha
        .replace(/\s+/g, ' ') // Remove espaços extras
        .trim();
    
    // Se ficou vazio após limpeza, usar nome padrão
    if (!processedName || processedName.length === 0) {
        return 'Usuário Liberado';
    }
    
    // Dividir em palavras e capitalizar cada palavra
    const words = processedName.split(' ');
    const formattedWords = words.map(word => {
        if (!word) return '';
        // Manter acentos e caracteres especiais, apenas capitalizar primeira letra
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
    
    // Juntar as palavras e limitar a 32 caracteres
    let formattedName = formattedWords.join(' ').trim();
    
    if (formattedName.length > 32) {
        formattedName = formattedName.substring(0, 29) + '...';
    }
    
    return formattedName;
} 