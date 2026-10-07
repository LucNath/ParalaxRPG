'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: { reset: () => void }) { return <main id="conteudo" className="center-state"><h1>Não conseguimos abrir este capítulo.</h1><p role="alert">Tente novamente em instantes.</p><button className="button" onClick={reset}>Tentar novamente</button><Link href="/">Voltar ao início</Link></main>; }
