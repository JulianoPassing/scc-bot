// Loader do módulo avaliacoes
import setupAvaliacaoModule from './index.js';

export default async function (client) {
  try {
    await setupAvaliacaoModule(client);
    console.log('[AVALIACOES] Módulo carregado com sucesso!');
  } catch (error) {
    console.error('[AVALIACOES] Erro ao carregar módulo:', error);
  }
} 