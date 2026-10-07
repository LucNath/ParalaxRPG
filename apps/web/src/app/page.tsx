import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight, Compass, Fingerprint, Sparkles, Users } from 'lucide-react';
import { Brand } from '@/components/brand';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  return <div className="landing">
    <header className="landing-header">
      <Brand />
      <nav aria-label="Navegação"><a href="#universo" className="discovery-link">O universo Paralax</a><Link href="/entrar">Entrar</Link><Link className="button button-small" href="/cadastro">Criar conta <ArrowUpRight size={16} /></Link></nav>
    </header>
    <main id="conteudo">
      <section className="hero">
        <Image className="hero-landscape" src="/art/paralax-world.webp" alt="" fill preload sizes="100vw" />
        <div className="hero-shade" aria-hidden="true" />
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="eyebrow"><span className="status-dot" /> SUA IMAGINAÇÃO. SUAS REGRAS.</span>
            <h1>Crie mundos.<br />Conte histórias.<br /><span>Jogue do seu jeito.</span></h1>
            <p>Um lugar para dar vida às suas ideias e encontrar seu próximo universo de RPG.</p>
            <div className="hero-actions"><Link href="/cadastro" className="button">Começar agora <ArrowRight size={18} /></Link><a href="#universo" className="button button-secondary">Conhecer a Paralax</a></div>
            <div className="hero-caption"><Compass size={16} /> Você define a aventura. Nós preparamos o caminho.</div>
          </div>
          <div className="hero-art-caption" aria-hidden="true"><span className="art-caption-line" /><span>UM MUNDO ALÉM DAS REGRAS<small>O próximo capítulo é seu.</small></span></div>
        </div>
      </section>
      <section id="universo" className="journey-section">
        <div className="section-intro"><div><span className="eyebrow">SEU UNIVERSO, EM CONSTRUÇÃO</span><h2>Toda aventura começa com você.</h2></div><p>Prepare sua identidade hoje.<br className="intro-break" /> Novos caminhos chegam a cada etapa.</p></div>
        <div className="journey-grid">
          <article className="journey-card active">
            <div className="journey-card-art"><Image src="/art/luminous-forest.webp" alt="" fill sizes="(max-width: 650px) calc(100vw - 44px), (max-width: 1359px) 31vw, 408px" /></div>
            <div className="journey-card-content"><div className="journey-card-top"><span className="feature-icon"><Fingerprint size={23} /></span><Badge tone="success">Disponível</Badge></div><span className="card-number">01 / IDENTIDADE</span><h3>Deixe sua marca</h3><p>Crie seu perfil, escolha um avatar e conte o que inspira suas histórias.</p><Link href="/cadastro" className="card-action">Preparar meu perfil <ArrowRight size={17} /></Link></div>
          </article>
          <article className="journey-card active">
            <div className="journey-card-art"><Image src="/art/astral-observatory.webp" alt="" fill sizes="(max-width: 650px) calc(100vw - 44px), (max-width: 1359px) 31vw, 408px" /></div>
            <div className="journey-card-content"><div className="journey-card-top"><span className="feature-icon"><Sparkles size={23} /></span><Badge tone="success">Disponível</Badge></div><span className="card-number">02 / CRIAÇÃO</span><h3>Imagine sem limites</h3><p>Defina atributos, perícias, recursos e dados. Suas regras ganham uma prévia de ficha.</p><Link href="/sistemas/novo" className="card-action">Criar meu sistema <ArrowRight size={17} /></Link></div>
          </article>
          <article className="journey-card">
            <div className="journey-card-art"><Image src="/art/floating-city.webp" alt="" fill sizes="(max-width: 650px) calc(100vw - 44px), (max-width: 1359px) 31vw, 408px" /></div>
            <div className="journey-card-content"><div className="journey-card-top"><span className="feature-icon"><Users size={23} /></span><Badge>Em desenvolvimento</Badge></div><span className="card-number">03 / CONEXÃO</span><h3>Encontre sua mesa</h3><p>Campanhas e sessões para reunir pessoas ao redor de uma grande história.</p><span className="future-feature"><Compass size={15} /> Campanhas e sessões</span></div>
          </article>
        </div>
      </section>
      <section className="landing-invitation"><div><span className="eyebrow">O PRIMEIRO PASSO É SEU</span><h2>Qual história você vai contar?</h2><p>Seu próximo universo começa com uma conta.</p></div><Link href="/cadastro" className="button">Criar minha conta <ArrowUpRight size={18} /></Link></section>
    </main>
    <footer className="landing-footer"><Brand /><span>Feito para imaginar. Construído para jogar.</span><Link href="/entrar">Entrar na plataforma <ArrowUpRight size={15} /></Link></footer>
  </div>;
}
