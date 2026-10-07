import { InvitationInbox } from '@/components/invitation-inbox';

export default function Invitations() {
  return <><div className="page-heading"><span className="eyebrow">SUA PRÓXIMA MESA</span><h1>Seus convites.</h1><p>Responda aos mestres e acompanhe as histórias que você pode jogar.</p></div><section className="panel"><InvitationInbox /></section></>;
}
