export function sessionDate(instant: string, timeZone: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone, dateStyle: 'medium', timeStyle: 'short', hourCycle: 'h23' }).format(new Date(instant));
}
export function sessionDuration(seconds: number) { const minutes = Math.floor(seconds / 60); return `${minutes} min ${seconds % 60} s`; }
