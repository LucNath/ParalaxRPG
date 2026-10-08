'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { loginSchema, registerSchema } from '@paralax/contracts';
import { Brand } from './brand';
import { useAuth } from './auth-provider';
import { ApiError, errorMessage } from '@/lib/api';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const registering = mode === 'register';
  const { login, register, user, loading } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  useEffect(() => { if (!loading && user) router.replace('/dashboard'); }, [loading, user, router]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || busy) return;
    setErrors({}); setMessage('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = registering ? registerSchema.safeParse(data) : loginSchema.safeParse(data);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map(issue => [issue.path.join('.'), issue.message])));
      return;
    }
    setBusy(true);
    try {
      if (registering) await register(registerSchema.parse(data));
      else await login(loginSchema.parse(data));
      router.replace('/dashboard');
    } catch (error) {
      setMessage(errorMessage(error));
      if (error instanceof ApiError && error.body.error.details) setErrors(Object.fromEntries(error.body.error.details.map(issue => [issue.field, issue.message])));
    } finally { setBusy(false); }
  }
  return <main id="conteudo" className="auth-layout">
    <section className="auth-story"><Brand /><div className="auth-story-copy"><span className="eyebrow">SEU PRÓXIMO UNIVERSO</span><h1>Histórias épicas.<br />Pessoas reais.</h1><p>Antes de construir um mundo,<br />encontre seu lugar à mesa.</p><div className="small-rule" /><small>SUA IMAGINAÇÃO. SUAS REGRAS.</small></div><span className="auth-story-footer">PARALAX RPG · FEITO PARA CRIAR</span></section>
    <section className="auth-form-panel">
      <div className="auth-form-header"><div className="auth-mobile-brand"><Brand /></div><Link href="/" className="back-link">← Voltar ao início</Link></div>
      <div className="auth-form-inner"><span className="eyebrow">{registering ? 'BEM-VINDO À PARALAX' : 'BOM TER VOCÊ DE VOLTA'}</span><h2>{registering ? 'Comece sua jornada' : 'Continue sua história'}</h2><p className="muted">{registering ? 'Crie sua conta e prepare seu perfil de aventureiro.' : 'Entre para acessar seu espaço e seu perfil.'}</p>
        <form onSubmit={submit} noValidate className="form-stack">
          {registering ? <><div className="form-field"><label htmlFor="displayName">Como podemos chamar você?</label><input id="displayName" name="displayName" autoComplete="name" placeholder="Seu nome" maxLength={60} required aria-invalid={!!errors.displayName} aria-describedby={errors.displayName ? 'displayName-error' : undefined} />{errors.displayName ? <small id="displayName-error" className="field-error">{errors.displayName}</small> : null}</div>
            <div className="form-field"><label htmlFor="username">Nome de usuário</label><input id="username" name="username" autoComplete="username" placeholder="seu_aventureiro" maxLength={24} required aria-invalid={!!errors.username} aria-describedby="username-hint username-error" /><small id="username-hint">3 a 24 caracteres: letras, números e sublinhado.</small>{errors.username ? <small id="username-error" className="field-error">{errors.username}</small> : <span id="username-error" />}</div></> : null}
          <div className="form-field"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" maxLength={254} required aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} />{errors.email ? <small id="email-error" className="field-error">{errors.email}</small> : null}</div>
          <div className="form-field"><label htmlFor="password">Senha</label><div className="password-input"><input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={registering ? 'new-password' : 'current-password'} placeholder={registering ? 'Pelo menos 10 caracteres' : 'Sua senha'} maxLength={128} required aria-invalid={!!errors.password} aria-describedby={errors.password ? 'password-error' : undefined} /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>{errors.password ? <small id="password-error" className="field-error">{errors.password}</small> : null}</div>
          {message ? <p className="feedback error" role="alert">{message}</p> : null}
          <button className="button button-wide" disabled={busy || loading} type="submit">{busy || loading ? 'Aguarde...' : registering ? 'Criar minha conta' : 'Entrar na minha conta'}{busy || loading ? null : <ArrowRight size={18} />}</button>
        </form>
        <p className="auth-switch">{registering ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'} <Link href={registering ? '/entrar' : '/cadastro'}>{registering ? 'Entrar' : 'Criar conta'}</Link></p>
      </div><small className="form-footer">Sua próxima aventura começa com você.</small>
    </section>
  </main>;
}
