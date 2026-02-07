import { ShadowProfileCard } from '@/components/Community';
import { Page } from '@/components/PageLayout';
import { prisma } from '@/lib/prisma';
import { Substrate } from '@/lib/substrate-api';
import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { Group } from 'iconoir-react';

async function getVerifiedShadows(): Promise<(Substrate & { is_verified: true })[]> {
  const backendUrl = process.env.SUBSTRATE_API_URL || process.env.NEXT_PUBLIC_SUBSTRATE_API_URL || 'http://localhost:8000';
  try {
    const res = await fetch(`${backendUrl}/substrates?limit=50`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const substrates: Substrate[] = await res.json();

    // Filter to ready substrates only
    const readySubstrates = substrates.filter((s) => s.status === 'ready');
    if (readySubstrates.length === 0) return [];

    // Get verified IDs
    const substrateIds = readySubstrates.map((s) => s.id);
    const verifications = await prisma.verification.findMany({
      where: { substrateId: { in: substrateIds } },
      select: { substrateId: true },
    });
    const verifiedIds = new Set(verifications.map((v) => v.substrateId));

    // Return only verified substrates
    return readySubstrates
      .filter((s) => verifiedIds.has(s.id))
      .map((s) => ({ ...s, is_verified: true as const }));
  } catch {
    return [];
  }
}

export default async function CommunityPage() {
  const shadows = await getVerifiedShadows();

  return (
    <>
      <Page.Header className="p-0">
        <TopBar title="Community" />
      </Page.Header>
      <Page.Main className="flex flex-col gap-4 mb-16">
        {shadows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Group className="w-12 h-12 text-gray-300 mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              No Shadows Yet
            </h2>
            <p className="text-sm text-gray-500">
              Verified Shadows will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {shadows.map((shadow) => (
              <ShadowProfileCard key={shadow.id} substrate={shadow} />
            ))}
          </div>
        )}
      </Page.Main>
    </>
  );
}
