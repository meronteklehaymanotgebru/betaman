// File: client/src/app/page.tsx
'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import WalletButton from '@/components/WalletButton';
import VoiceNarration from '@/components/VoiceNarration';

// Type definition for AI analysis response per SRD section 10.1
interface AnalysisResult {
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  checks: {
    reverse_image: { pass: boolean; reason: string };
    price_anomaly: { pass: boolean; reason: string };
    urgency_language: { pass: boolean; reason: string };
    location_verification: { pass: boolean; reason: string };
  };
  exif_status: 'available' | 'missing' | 'screenshot-detected';
  screenshot_warning: string | null;
  summary_english: string;
  summary_amharic: string;
}

export default function Home() {
  const { publicKey, connected } = useWallet();
  const [listingUrl, setListingUrl] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState<'analyze' | 'escrow' | 'reputation'>('analyze');

  const handleAnalyze = async () => {
    if (!listingUrl) return;
    setLoading(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: listingUrl }),
      });
      const data = await response.json();
      setAnalysis(data);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Demo helper: Pre-fill with test URLs
  const loadDemoListing = (type: 'safe' | 'scam') => {
    if (type === 'scam') {
      setListingUrl('https://t.me/addisrentals/scam-listing-urgent');
    } else {
      setListingUrl('https://realethio.com/verified/bole-2br-15000');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}

<header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
  <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">BetAman</h1>
      <p className="text-sm text-gray-500">Home Trust for Ethiopian Rentals</p>
    </div>
    
    {/* Wallet connection with network indicator */}
    <div className="flex items-center gap-3">
      {/* Devnet indicator - visible only when connected */}
      {connected && (
        <span className="hidden md:inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
          🧪 Devnet
        </span>
      )}
      <WalletButton />
    </div>
  </div>
</header>

      {/* Demo Navigation */}
      <nav className="bg-gray-100 border-b">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 py-2">
            {[
              { id: 'analyze', label: '🔍 AI Fraud Detection' },
              { id: 'escrow', label: '🔐 Escrow Deposit' },
              { id: 'reputation', label: '🏆 Reputation (SBT)' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDemoMode(tab.id as typeof demoMode)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  demoMode === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Demo Mode: AI Analysis */}
        {demoMode === 'analyze' && (
          <section className="space-y-6">
            {/* What You're Testing */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-900 mb-2">🎯 What You&aposre Testing</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• AI fraud detection with 4 check categories (SRD FR-05)</li>
                <li>• EXIF metadata extraction & screenshot detection (FR-20, FR-21)</li>
                <li>• Amharic/English voice narration (FR-14, FR-15)</li>
                <li>• Demo fallback when API key is missing (FR-06)</li>
              </ul>
            </div>

            {/* Quick Demo Buttons */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => loadDemoListing('scam')}
                className="px-3 py-1.5 text-sm bg-red-100 text-red-800 rounded-lg hover:bg-red-200"
              >
                Load Scam Example
              </button>
              <button
                onClick={() => loadDemoListing('safe')}
                className="px-3 py-1.5 text-sm bg-green-100 text-green-800 rounded-lg hover:bg-green-200"
              >
                Load Safe Example
              </button>
            </div>

            {/* Analysis Form */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Verify a Rental Listing
              </h2>
              
              <div className="flex gap-3 mb-4">
                <input
                  type="url"
                  placeholder="Paste listing URL (e.g., Telegram, Facebook, realethio.com)"
                  value={listingUrl}
                  onChange={(e) => setListingUrl(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <button
                  onClick={handleAnalyze}
                  disabled={loading || !listingUrl}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Analyzing...' : 'Analyze'}
                </button>
              </div>

              {/* Results */}
              {analysis && (
                <div className="border-t pt-4 space-y-4">
                  {/* Risk Score Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl font-bold ${
                        analysis.risk_score < 30 ? 'text-green-600' :
                        analysis.risk_score < 70 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {analysis.risk_score}/100
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                        analysis.risk_level === 'low' ? 'bg-green-100 text-green-800' :
                        analysis.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {analysis.risk_level} risk
                      </span>
                    </div>
                    <VoiceNarration text={analysis.summary_english} language="en" />
                  </div>

                  {/* 4-Category Checks */}
                  <div className="grid gap-3">
                    {Object.entries(analysis.checks).map(([key, value]: [string, { pass: boolean; reason: string }]) => (
                      <div key={key} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <span className={`mt-0.5 text-lg ${value.pass ? 'text-green-500' : 'text-red-500'}`}>
                          {value.pass ? '✓' : '✗'}
                        </span>
                        <div>
                          <span className="font-medium text-gray-900 capitalize">
                            {key.replace('_', ' ')}
                          </span>
                          <p className="text-sm text-gray-600">{value.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Warnings */}
                  {analysis.screenshot_warning && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                      ⚠️ {analysis.screenshot_warning}
                    </div>
                  )}
                  {analysis.exif_status && (
                    <div className="text-sm text-gray-500">
                      <strong>EXIF Status:</strong> {analysis.exif_status}
                    </div>
                  )}

                  {/* Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 mb-2">
                      <strong>Summary (English):</strong> {analysis.summary_english}
                    </p>
                    <p className="text-sm text-gray-500 italic">
                      <strong>Amharic:</strong> {analysis.summary_amharic}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Demo Mode: Escrow */}
        {demoMode === 'escrow' && (
          <section className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-900 mb-2">🎯 What You&apos;re Testing</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• SPL token deposit into PDA-controlled escrow (FR-07, NFR-05)</li>
                <li>• Tenant confirmation flow (FR-08)</li>
                <li>• 24-hour timeout auto-refund (FR-09)</li>
                <li>• Transaction visibility on Solana devnet (FR-19)</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 text-center">
              <div className="text-4xl mb-4">🔐</div>
              <h3 className="text-lg font-semibold mb-2">Escrow Deposit (Demo)</h3>
              <p className="text-gray-600 mb-4">
                In production: Tenant deposits SPL tokens → held in PDA vault → released after viewing confirmation.
              </p>
              <div className="bg-gray-100 rounded-lg p-4 text-left text-sm">
                <p className="font-medium mb-2">Demo Transaction Flow:</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-700">
                  <li>Tenant signs deposit transaction</li>
                  <li>Tokens locked in escrow PDA</li>
                  <li>Landlord notified of secured viewing</li>
                  <li>After viewing: Tenant confirms → funds released</li>
                  <li>If no confirmation in 24h: Auto-refund to tenant</li>
                </ol>
              </div>
              <button className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Simulate Deposit (Demo)
              </button>
            </div>
          </section>
        )}

        {/* Demo Mode: Reputation */}
        {demoMode === 'reputation' && (
          <section className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-900 mb-2">🎯 What You&apos;re Testing</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Soulbound cNFT minting after successful escrow (FR-11)</li>
                <li>• Non-transferable reputation tokens (FR-12, NFR-06)</li>
                <li>• IPFS/Arweave metadata storage for cNFTs</li>
                <li>• Reputation dashboard for tenants (FR-13)</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-2xl">
                  🏆
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Landlord Reputation</h3>
                  <p className="text-gray-600">Verified transactions on Solana</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                {[8, 3, 1].map((count, i) => (
                  <div key={i} className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className="text-sm text-gray-500">
                      {i === 0 ? 'Completed' : i === 1 ? 'In Progress' : 'Disputed'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>How SBTs work:</strong>
                </p>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                  <li>Minted automatically after successful escrow completion</li>
                  <li>Stored as non-transferable cNFT via Metaplex Bubblegum V2</li>
                  <li>Metadata on IPFS/Arweave: transaction hash, date, property ID</li>
                  <li>Visible to tenants when evaluating landlords</li>
                  <li>Cannot be bought, sold, or transferred — proof of honest history</li>
                </ul>
              </div>
            </div>
          </section>
        )}

      </div>

      {/* Footer */}
      <footer className="border-t bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          <p>BetAman • Dev3Pack Hackathon • Solana Devnet Demo</p>
          <p className="mt-1">All transactions use test tokens — no real value at risk</p>
        </div>
      </footer>
    </main>
  );
}