// Loader do módulo avaliacoes
import setupAvaliacaoModule from './index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function (client) {
  try {
    // Carregar o módulo principal
    await setupAvaliacaoModule(client);
    
    // Carregar comandos
    const commandsPath = path.join(__dirname, 'commands');
    if (fs.existsSync(commandsPath)) {
      const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
      
      for (const file of commandFiles) {
        try {
          const command = await import(path.join(commandsPath, file));
          client.commands.set(command.default.data.name, command.default);
          console.log(`[AVALIACOES] Comando ${command.default.data.name} carregado!`);
        } catch (error) {
          console.error(`[AVALIACOES] Erro ao carregar comando ${file}:`, error);
        }
      }
    }
    
    console.log('[AVALIACOES] Módulo carregado com sucesso!');
  } catch (error) {
    console.error('[AVALIACOES] Erro ao carregar módulo:', error);
  }
} 