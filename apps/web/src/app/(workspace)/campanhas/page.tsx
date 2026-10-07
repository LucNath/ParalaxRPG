import Link from 'next/link';
import { Plus } from 'lucide-react';
import { CampaignList } from '@/components/campaign-list';

export default function Campaigns() {
  return <><div className="page-heading heading-with-action"><div><span className="eyebrow">NOVAS HISTÓRIAS</span><h1>Suas campanhas.</h1><p>Das suas regras ao mundo que você vai mestrar.</p></div><Link className="button" href="/campanhas/nova"><Plus size={18} />Criar campanha</Link></div><CampaignList /></>;
}
