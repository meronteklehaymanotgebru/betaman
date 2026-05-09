'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function Home() {
  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <header className="flex justify-between items-center mb-8 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">BetAman</h1>
          <p className="text-sm text-gray-500">Home Trust for Ethiopian Rentals</p>
        </div>
        <WalletMultiButton />
      </header>
      <section className="max-w-2xl mx-auto text-center text-gray-600">
        <p>Wallet connection active. Build in progress.</p>
      </section>
    </main>
  );
}
