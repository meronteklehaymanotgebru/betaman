// File: client/src/components/WalletButton.tsx
'use client';

import dynamic from 'next/dynamic';
import { useWallet } from '@solana/wallet-adapter-react';

// Dynamic import with SSR disabled - prevents hydration mismatch
const WalletMultiButtonDynamic = dynamic(
  async () => {
    try {

      const walletAdapterUI = await import('@solana/wallet-adapter-react-ui');
      return walletAdapterUI.WalletMultiButton;
    } catch (error) {
      console.warn('Wallet adapter UI import failed:', error);
      // Fallback if import fails
      return function FallbackButton() {
        return (
          <button 
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
            type="button"
          >
            Connect Wallet
          </button>
        );
      };
    }
  },
  { 
    ssr: false,
    loading: () => (
      <button 
        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium animate-pulse"
        disabled
        type="button"
      >
        Connect Wallet
      </button>
    )
  }
);

export default function WalletButton() {
  const { connected, connecting, wallet } = useWallet();

  // Connected: show wallet name + button
  if (connected && wallet) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 hidden sm:inline">
          {wallet.adapter.name}
        </span>
        <WalletMultiButtonDynamic />
      </div>
    );
  }

  // Connecting: show loading state
  if (connecting) {
    return (
      <button 
        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium flex items-center gap-2"
        disabled
        type="button"
        aria-busy="true"
      >
        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></span>
        Connecting...
      </button>
    );
  }

  // Default: render dynamic button
  return <WalletMultiButtonDynamic />;
}