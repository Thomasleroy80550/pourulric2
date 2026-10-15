import MainLayout from '@/components/MainLayout';
import HelloKeysWallet from '@/components/HelloKeysWallet';

export default function WalletPage() {
  return <MainLayout><div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6"><HelloKeysWallet /></div></MainLayout>;
}
