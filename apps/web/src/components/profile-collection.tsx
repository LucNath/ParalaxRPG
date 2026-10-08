'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, LockKeyhole, Sparkles, Trophy } from 'lucide-react';
import { achievementDefinitions, profileCosmetics, type AchievementsPage, type CosmeticsPage, type CurrentUser } from '@paralax/contracts';
import { useAuth } from './auth-provider';
import { ProfileBanner, ProfilePortrait, ProfileMotion } from './profile-appearance';
import { errorMessage } from '@/lib/api';

export function ProfileCollection() {
  const { user, api, updateUser } = useAuth();
  const [data, setData] = useState<{ achievements: AchievementsPage; cosmetics: CosmeticsPage } | null>(null);
  const [backgroundId, setBackground] = useState<string | null>(user?.background?.id ?? null);
  const [frameId, setFrame] = useState<string | null>(user?.avatarFrame?.id ?? null);
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [attempt, setAttempt] = useState(0), [saving, setSaving] = useState(false);
  const busy = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    Promise.all([
      api.request<AchievementsPage>('/users/me/achievements', { signal: controller.signal }),
      api.request<CosmeticsPage>('/users/me/cosmetics', { signal: controller.signal }),
    ]).then(([achievements, cosmetics]) => { if (!controller.signal.aborted) setData({ achievements, cosmetics }); })
      .catch(cause => { if (!controller.signal.aborted) setError(errorMessage(cause)); });
    return () => controller.abort();
  }, [api, attempt, user?.id, user?.avatarUrl, user?.bio]);
  const lifetime = useRef<AbortController | null>(null);
  useEffect(() => { lifetime.current = new AbortController(); return () => lifetime.current?.abort(); }, []);
  if (!user) return null;
  const preview = { ...user, background: profileCosmetics.find(item => item.id === backgroundId) ?? null,
    avatarFrame: profileCosmetics.find(item => item.id === frameId) ?? null };
  const dirty = backgroundId !== (user.background?.id ?? null) || frameId !== (user.avatarFrame?.id ?? null);
  async function save() {
    if (busy.current) return;
    busy.current = true; setSaving(true); setError(''); setMessage('');
    try {
      const saved = await api.request<CurrentUser>('/users/me', { method: 'PATCH', body: JSON.stringify({ backgroundId, avatarFrameId: frameId }), signal: lifetime.current?.signal });
      if (!lifetime.current?.signal.aborted) { updateUser(saved); setMessage('Personalização salva. Seu perfil público já está atualizado.'); }
    } catch (cause) { if (!lifetime.current?.signal.aborted) setError(errorMessage(cause)); }
    finally { busy.current = false; if (!lifetime.current?.signal.aborted) setSaving(false); }
  }
  return <section className="profile-collection" aria-label="Conquistas e personalização">
    <div className="panel collection-achievements"><div className="panel-heading"><h2><Trophy size={20} aria-hidden="true" /> Conquistas</h2><span className="muted">{data ? `${data.achievements.items.filter(item => item.earnedAt).length}/${data.achievements.items.length} obtidas` : 'Sua jornada'}</span></div>
      <p className="muted">Suas histórias desbloqueiam novos visuais. As conquistas ficam nesta área privada; só os itens que você equipa aparecem no perfil público.</p>
      {!data && !error ? <p>Carregando sua coleção…</p> : null}
      {data ? <ul className="achievement-grid">{data.achievements.items.map(item => <li key={item.id} className={item.earnedAt ? 'achievement earned' : 'achievement'}>
        <div className="achievement-state">{item.earnedAt ? <Check size={18} aria-hidden="true" /> : <LockKeyhole size={18} aria-hidden="true" />}<span>{item.earnedAt ? 'Obtida' : 'A conquistar'} · {item.progress}/{item.target}</span></div>
        <h3>{item.name}</h3><p>{item.description}</p><small>Libera: {item.rewards.map(reward => reward.name).join(', ')}</small>
        {item.earnedAt ? <time dateTime={item.earnedAt}>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'America/Fortaleza' }).format(new Date(item.earnedAt))}</time> : null}
      </li>)}</ul> : null}
    </div>
    <div className="panel collection-editor"><div className="panel-heading"><h2><Sparkles size={20} aria-hidden="true" /> Personalizar perfil</h2><button className="button button-secondary button-small" disabled={saving} onClick={() => setAttempt(value => value + 1)}>Atualizar coleção</button></div>
      {error ? <p className="feedback error" role="alert">{error}</p> : null}{message ? <p className="feedback success" role="status">{message}</p> : null}
      {data ? <><div className="cosmetic-controls">{(['BACKGROUND', 'AVATAR_FRAME'] as const).map(category => <fieldset key={category} disabled={saving} className="cosmetic-group"><legend>{category === 'BACKGROUND' ? 'Fundos' : 'Bordas do avatar'}</legend>
        <label className="cosmetic-option default-option"><input type="radio" name={category} value="default" checked={category === 'BACKGROUND' ? backgroundId === null : frameId === null} onChange={() => { setMessage(''); if (category === 'BACKGROUND') setBackground(null); else setFrame(null); }} /><span>{category === 'BACKGROUND' ? 'Paisagem padrão' : 'Sem borda'}</span></label>
        {data.cosmetics.items.filter(item => item.category === category).map(item => <label key={item.id} className={`cosmetic-option ${item.unlocked ? '' : 'locked'}`}>
          <span className={`cosmetic-art ${category === 'AVATAR_FRAME' ? 'frame-art' : ''}`}><img src={item.imageUrl} alt="" width={200} height={80} loading="lazy" /></span>
          <span className="cosmetic-label"><input type="radio" aria-label={item.name} name={category} value={item.id} disabled={!item.unlocked} checked={category === 'BACKGROUND' ? backgroundId === item.id : frameId === item.id} onChange={() => { setMessage(''); if (category === 'BACKGROUND') setBackground(item.id); else setFrame(item.id); }} /><span>{item.name}</span></span>
          <small>{item.animation ? 'Animado ? ' : ''}{item.unlocked ? 'Desbloqueado' : `Bloqueado · ${achievementDefinitions.find(achievement => achievement.id === item.achievementId)?.name}`}</small>
        </label>)}
      </fieldset>)}</div>
      <h3>Prévia do perfil público</h3><div className="appearance-preview"><ProfileMotion animated={Boolean(preview.background?.animation || preview.avatarFrame?.animation)}><ProfileBanner background={preview.background} /><div className="appearance-preview-content"><ProfilePortrait user={preview} /><h3>{user.displayName}</h3><p className="muted">@{user.username}</p><p>{user.bio || 'Sua próxima história começa aqui.'}</p></div></ProfileMotion></div>
      <div className="form-actions"><span className="muted">Experimente e salve a combinação que combina com você.</span><button className="button" disabled={!dirty || saving} onClick={() => void save()}>{saving ? 'Salvando…' : 'Salvar personalização'}</button></div></> : null}
    </div>
  </section>;
}
