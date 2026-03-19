import { checkReminders } from '../utils/agendamento.js';

export const name = 'ready';
export const once = true;
export const execute = async function (client) {
  setInterval(() => checkReminders(client).catch(console.error), 30_000);
  console.log('[ticket-s-wl] ⏰ Verificação de lembretes de agendamento iniciada (30s)');
};
