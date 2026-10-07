import Link from 'next/link';
import { Brand } from '@/components/brand';
export default function NotFound() { return <main id="conteudo" className="center-state"><Brand /><h1>Este caminho ainda não existe.</h1><p>A página ou o perfil que você procura não foi encontrado.</p><Link href="/" className="button">Voltar ao início</Link></main>; }
