import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ticketsDataFile = path.join(__dirname, '..', 'data', 'tickets.json');

/**
 * Carrega os dados dos tickets ativos
 * @returns {Object} Dados dos tickets
 */
export async function loadTicketsData() {
  try {
    const data = await fs.readFile(ticketsDataFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Se o arquivo não existir, retorna estrutura padrão
    return { activeTickets: {} };
  }
}

/**
 * Salva os dados dos tickets ativos
 * @param {Object} data - Dados para salvar
 */
export async function saveTicketsData(data) {
  try {
    await fs.writeFile(ticketsDataFile, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Erro ao salvar dados dos tickets:', error);
  }
}

/**
 * Verifica se um usuário já tem um ticket ativo em uma categoria específica
 * @param {string} userId - ID do usuário
 * @param {string} category - Nome da categoria
 * @returns {boolean} True se já tem ticket ativo
 */
export async function hasActiveTicketInCategory(userId, category) {
  const data = await loadTicketsData();
  return data.activeTickets[userId] && data.activeTickets[userId][category];
}

/**
 * Verifica se um usuário tem algum ticket ativo
 * @param {string} userId - ID do usuário
 * @returns {Object|null} Dados do ticket ativo ou null
 */
export async function getUserActiveTicket(userId) {
  const data = await loadTicketsData();
  return data.activeTickets[userId] || null;
}

/**
 * Registra um novo ticket ativo
 * @param {string} userId - ID do usuário
 * @param {string} category - Nome da categoria
 * @param {string} channelId - ID do canal do ticket
 * @param {string} channelName - Nome do canal do ticket
 */
export async function registerActiveTicket(userId, category, channelId, channelName) {
  const data = await loadTicketsData();
  
  if (!data.activeTickets[userId]) {
    data.activeTickets[userId] = {};
  }
  
  data.activeTickets[userId][category] = {
    channelId: channelId,
    channelName: channelName,
    createdAt: new Date().toISOString()
  };
  
  await saveTicketsData(data);
}

/**
 * Remove um ticket ativo
 * @param {string} userId - ID do usuário
 * @param {string} category - Nome da categoria (opcional, se não fornecido remove todos)
 */
export async function removeActiveTicket(userId, category = null) {
  const data = await loadTicketsData();
  
  if (!data.activeTickets[userId]) {
    return;
  }
  
  if (category) {
    delete data.activeTickets[userId][category];
    // Se não há mais tickets para o usuário, remove o usuário
    if (Object.keys(data.activeTickets[userId]).length === 0) {
      delete data.activeTickets[userId];
    }
  } else {
    delete data.activeTickets[userId];
  }
  
  await saveTicketsData(data);
}

/**
 * Obtém todos os tickets ativos de uma categoria
 * @param {string} category - Nome da categoria
 * @returns {Array} Array de tickets ativos
 */
export async function getActiveTicketsInCategory(category) {
  const data = await loadTicketsData();
  const tickets = [];
  
  for (const [userId, userTickets] of Object.entries(data.activeTickets)) {
    if (userTickets[category]) {
      tickets.push({
        userId: userId,
        ...userTickets[category]
      });
    }
  }
  
  return tickets;
}

/**
 * Limpa tickets que não existem mais (canal foi deletado)
 * @param {Guild} guild - Objeto guild do Discord
 */
export async function cleanupDeletedTickets(guild) {
  const data = await loadTicketsData();
  let hasChanges = false;
  
  for (const [userId, userTickets] of Object.entries(data.activeTickets)) {
    for (const [category, ticketData] of Object.entries(userTickets)) {
      try {
        const channel = await guild.channels.fetch(ticketData.channelId);
        if (!channel) {
          // Canal não existe mais, remover do registro
          delete data.activeTickets[userId][category];
          hasChanges = true;
        }
      } catch (error) {
        // Erro ao buscar canal, provavelmente foi deletado
        delete data.activeTickets[userId][category];
        hasChanges = true;
      }
    }
    
    // Se não há mais tickets para o usuário, remove o usuário
    if (Object.keys(data.activeTickets[userId]).length === 0) {
      delete data.activeTickets[userId];
      hasChanges = true;
    }
  }
  
  if (hasChanges) {
    await saveTicketsData(data);
  }
}
