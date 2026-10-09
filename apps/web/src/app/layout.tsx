import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { AuthProvider } from '@/components/auth-provider';
import { NotificationProvider } from '@/components/notification-provider';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Paralax RPG — Sua próxima história', template: '%s | Paralax RPG' },
  description: 'Seu espaço para imaginar mundos, criar histórias e viver RPG. Comece pelo seu perfil.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" className={GeistSans.variable} data-scroll-behavior="smooth"><body><a className="skip-link" href="#conteudo">Ir para o conteúdo</a><AuthProvider><NotificationProvider>{children}</NotificationProvider></AuthProvider></body></html>;
}
