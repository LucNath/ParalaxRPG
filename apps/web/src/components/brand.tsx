import Link from 'next/link';
import Image from 'next/image';

export function BrandMark({ size = 44 }: { size?: number }) {
  return <Image src="/brand/paralax-mark.svg" alt="" width={size} height={size} className="brand-mark" unoptimized loading="eager" />;
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className="brand" aria-label="Paralax RPG — início">
    {compact ? <BrandMark /> : <Image src="/brand/paralax-logo.svg" alt="" width={180} height={40} className="brand-wordmark" unoptimized loading="eager" />}
  </Link>;
}
