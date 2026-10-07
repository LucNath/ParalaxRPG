'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight, Camera, Save, ShieldCheck } from 'lucide-react';
import { updateProfileSchema, type CurrentUser } from '@paralax/contracts';
import { useAuth } from '@/components/auth-provider';
import { Avatar } from '@/components/avatar';
import { ApiError, errorMessage } from '@/lib/api';

export default function ProfilePage() {
  const { user, api, updateUser } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  if (!user) return null;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(''); setError(''); setErrors({});
    const parsed = updateProfileSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map(issue => [issue.path.join('.'), issue.message]))); return; }
    setSaving(true);
    try { updateUser(await api.request<CurrentUser>('/users/me', { method: 'PATCH', body: JSON.stringify(parsed.data) })); setMessage('Perfil atualizado. Sua história ganhou um novo detalhe.'); }
    catch (cause) { setError(errorMessage(cause)); if (cause instanceof ApiError && cause.body.error.details) setErrors(Object.fromEntries(cause.body.error.details.map(issue => [issue.field, issue.message]))); }
    finally { setSaving(false); }
  }
  async function upload(file?: File) {
    if (!file) return;
    setMessage(''); setError('');
    if (file.size > 2 * 1024 * 1024) { setError('Escolha uma imagem de até 2 MB.'); return; }
    setUploading(true);
    try {
      const form = new FormData(); form.append('file', file);
      await api.request('/users/me/avatar', { method: 'POST', body: form });
      updateUser(await api.request<CurrentUser>('/users/me'));
      setMessage('Avatar atualizado.');
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ''; }
  }
  return <><div className="page-heading heading-with-action"><div><span className="eyebrow">QUEM ESTÁ POR TRÁS DA HISTÓRIA</span><h1>Meu perfil<span className="accent">.</span></h1><p>Uma pequena apresentação, infinitas possibilidades.</p></div><Link className="button button-secondary" href={`/u/${user.username}`}>Ver perfil público <ArrowUpRight size={17} /></Link></div>
    <div className="profile-layout"><section className="panel profile-editor"><div className="panel-heading"><h2>Informações pessoais</h2><span className="muted">Seu cartão de apresentação</span></div><div className="avatar-editor"><Avatar user={user} large /><div><h3>Seu avatar</h3><p>PNG, JPEG ou WebP. Até 2 MB.</p><button className="button button-secondary button-small" onClick={() => inputRef.current?.click()} disabled={uploading || saving}><Camera size={16} />{uploading ? 'Enviando...' : 'Escolher imagem'}</button><input ref={inputRef} type="file" className="visually-hidden" accept="image/png,image/jpeg,image/webp" aria-label="Imagem do avatar" onChange={event => void upload(event.target.files?.[0])} /></div></div>
      <form className="form-stack" onSubmit={submit} noValidate><div className="form-field"><label htmlFor="displayName">Nome de exibição</label><input id="displayName" name="displayName" defaultValue={user.displayName} maxLength={60} autoComplete="name" aria-invalid={!!errors.displayName} aria-describedby={errors.displayName ? 'name-error' : undefined} required />{errors.displayName ? <small className="field-error" id="name-error">{errors.displayName}</small> : null}</div><div className="form-field"><label htmlFor="bio">Biografia</label><textarea id="bio" name="bio" defaultValue={user.bio} maxLength={500} rows={4} placeholder="Seus mundos favoritos, seu estilo de jogo, o que inspira você..." aria-invalid={!!errors.bio} aria-describedby="bio-hint" /><small id="bio-hint">{errors.bio || 'Até 500 caracteres. Visível no seu perfil público.'}</small></div><div className="form-field"><label htmlFor="location">Localização <span className="muted">(opcional)</span></label><input id="location" name="location" defaultValue={user.location} maxLength={80} placeholder="Cidade ou região" autoComplete="address-level2" aria-invalid={!!errors.location} aria-describedby={errors.location ? 'location-error' : undefined} />{errors.location ? <small id="location-error" className="field-error">{errors.location}</small> : null}</div>
      {error ? <p className="feedback error" role="alert">{error}</p> : null}{message ? <p className="feedback success" role="status">{message}</p> : null}<div className="form-actions"><span className="muted">Seu perfil, do seu jeito.</span><button className="button" type="submit" disabled={saving || uploading}><Save size={16} />{saving ? 'Salvando...' : 'Salvar alterações'}</button></div></form>
    </section><aside className="profile-aside"><section className="panel account-details"><ShieldCheck size={24} /><h2>Dados da conta</h2><dl><dt>Nome de usuário</dt><dd>@{user.username}</dd><dt>E-mail</dt><dd>{user.email}</dd></dl><p>Seu e-mail fica reservado à sua conta e não aparece no perfil público.</p></section><div className="profile-note"><span className="eyebrow">UMA DICA DE AVENTUREIRO</span><p>Uma boa história começa com uma boa apresentação.</p></div></aside></div></>;
}
