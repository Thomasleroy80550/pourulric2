import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HelloKeysWallet from '@/components/HelloKeysWallet';
import V4Layout from './V4Layout';

export default function ReferralV4() {
  return (
    <V4Layout>
      <div className="mx-auto w-full max-w-4xl space-y-5 px-4 pb-6 pt-5">
        <header className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link to="/v4/plus"><ArrowLeft className="mr-2 h-4 w-4" />Retour à Plus</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Parrainage</h1>
          </div>
        </header>
        <HelloKeysWallet compact />
      </div>
    </V4Layout>
  );
}
