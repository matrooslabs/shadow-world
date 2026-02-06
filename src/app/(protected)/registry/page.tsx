import { SubstrateCard } from '@/components/Substrate';
import { Page } from '@/components/PageLayout';
import { Substrate } from '@/lib/substrate-api';
import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';

async function getSubstrates(): Promise<(Substrate & { is_verified?: boolean })[]> {
  const backendUrl = process.env.SUBSTRATE_API_URL || process.env.NEXT_PUBLIC_SUBSTRATE_API_URL || 'http://localhost:8000';
  try {
    const res = await fetch(`${backendUrl}/substrates`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function RegistryPage() {
  const substrates = await getSubstrates();

  // Filter to only show ready substrates
  const readySubstrates = substrates.filter((s) => s.status === 'ready');

  return (
    <>
      <Page.Header className="p-0">
        <TopBar title="Registry" />
      </Page.Header>

      <Page.Main className="flex flex-col gap-4 mb-16">
        <div>
          <p className="text-gray-600 text-sm mb-4">
            Browse verified substrates and chat with AI clones of real people.
          </p>
        </div>

        {readySubstrates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">
              No Substrates Yet
            </h3>
            <p className="text-gray-500 text-sm">
              Be the first to create a substrate!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {readySubstrates.map((substrate) => (
              <SubstrateCard key={substrate.id} substrate={substrate} />
            ))}
          </div>
        )}

        {/* Show pending substrates count if any */}
        {substrates.length > readySubstrates.length && (
          <p className="text-center text-sm text-gray-500">
            {substrates.length - readySubstrates.length} substrate
            {substrates.length - readySubstrates.length !== 1 ? 's' : ''} in
            progress...
          </p>
        )}
      </Page.Main>
    </>
  );
}
