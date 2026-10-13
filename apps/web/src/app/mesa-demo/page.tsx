import type { Metadata } from 'next';
import { VttDemo } from '@/components/vtt-demo';
import { buildVttDemo } from '@/lib/vtt-demo.server';
import './vtt-demo.css';

export const metadata: Metadata = { title: 'Demonstração da mesa', robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const demo = buildVttDemo(await searchParams);
  return <VttDemo key={`${demo.view}-${demo.scenario}-${demo.sceneKey}-${demo.count}`} initial={demo} />;
}
