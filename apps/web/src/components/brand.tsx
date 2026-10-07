import Link from 'next/link';
import { Compass } from 'lucide-react';

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className="brand" aria-label="Paralax RPG — início">
    <span className="brand-symbol"><Compass size={27} strokeWidth={1.5} aria-hidden="true" /></span>
    {compact ? null : <span>PARALAX<span className="brand-sub">RPG</span></span>}
  </Link>;
}
