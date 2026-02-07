import { auth } from '@/auth';
import { Page } from '@/components/PageLayout';
import { SubstrateProfile } from '@/components/Substrate';
import { VerifyAgentButton } from '@/components/Verification';
import { prisma } from '@/lib/prisma';
import { Substrate } from '@/lib/substrate-api';
import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { ArrowLeft, BadgeCheck } from 'iconoir-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getSubstrate(id: string): Promise<Substrate | null> {
  const backendUrl = process.env.SUBSTRATE_API_URL || process.env.NEXT_PUBLIC_SUBSTRATE_API_URL || 'http://localhost:8000';
  try {
    const res = await fetch(`${backendUrl}/substrates/${id}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getVerificationStatus(substrateId: string) {
  const verification = await prisma.verification.findUnique({
    where: { substrateId },
  });

  return {
    isVerified: !!verification,
    verifiedAt: verification?.createdAt?.toISOString() || null,
  };
}

export default async function SubstrateProfilePage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  const substrate = await getSubstrate(id);

  if (!substrate) {
    notFound();
  }

  const { isVerified, verifiedAt } = await getVerificationStatus(id);

  const isOwner = session?.user?.walletAddress === substrate.owner_wallet;

  return (
    <>
      <Page.Header className="p-0">
        <TopBar
          title={substrate.display_name}
          startAdornment={
            <Link href="/community" className="p-2 -ml-2">
              <ArrowLeft className="w-6 h-6" />
            </Link>
          }
        />
      </Page.Header>

      <Page.Main className="flex flex-col gap-6 mb-16">
        {/* Profile Section */}
        <SubstrateProfile
          substrate={substrate}
          isVerified={isVerified}
          isOwner={isOwner}
        />

        {/* Verify Button - only shown to owner when substrate is ready */}
        {isOwner && substrate.status === 'ready' && (
          <VerifyAgentButton
            substrateId={id}
            isVerified={isVerified}
            verifiedAt={verifiedAt}
          />
        )}

        {/* Verified info for non-owners */}
        {!isOwner && isVerified && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2">
            <BadgeCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700">
              This agent is verified with World ID — backed by a real human.
            </p>
          </div>
        )}
      </Page.Main>
    </>
  );
}
