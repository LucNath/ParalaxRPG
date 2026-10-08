import Link from 'next/link';
import { Brand } from '@/components/brand';
export default function LiveLayout({ children }: { children: React.ReactNode }) { return <div><header className="landing-header"><Brand /><Link href="/dashboard" className="button button-secondary button-small">Meu espaço</Link></header><main id="conteudo" className="public-system public-sessions"><Link className="subtle-link" href="/ao-vivo">Ao vivo agora</Link>{children}</main></div>; }
