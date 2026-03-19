import { checkReminders, loadConfig } from '../utils/agendamento.js';

export const name = 'ready';
export const once = true;
export const execute = async function (client) {
  await loadConfig(client);
  console.log('[ticket-s-wl] 📋 Config de agendamento carregada.');
  setInterval(() => checkReminders(client).catch(console.error), 30_000);
  console.log('[ticket-s-wl] ⏰ Verificação de lembretes de agendamento iniciada (30s)');
};
