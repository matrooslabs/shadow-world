import { auth } from '@/auth';
import { EndorseButton, EndorsementList } from '@/components/Endorsement';
import { Page } from '@/components/PageLayout';
import { SubstrateProfile } from '@/components/Substrate';
import { prisma } from '@/lib/prisma';
import { Substrate } from '@/lib/substrate-api';
import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { ArrowLeft } from 'iconoir-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getSubstrate(id: string): Promise<Substrate | null> {
  const backendUrl = process.env.NEXT_PUBLIC_SUBSTRATE_API_URL || 'http://localhost:8000';
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

interface EndorsementWithEndorser {
  id: string;
  substrateId: string;
  endorserWallet: string;
  nullifierHash: string;
  merkleRoot: string;
  proof: string;
  verificationLevel: string;
  createdAt: Date;
  endorser: {
    walletAddress: string;
    username: string | null;
  };
}

async function getEndorsements(substrateId: string) {
  const endorsements = await prisma.endorsement.findMany({
    where: { substrateId },
    include: {
      endorser: {
        select: {
          walletAddress: true,
          username: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  }) as EndorsementWithEndorser[];

  const stats = {
    total: endorsements.length,
    orb: endorsements.filter((e: EndorsementWithEndorser) => e.verificationLevel === 'orb').length,
    device: endorsements.filter((e: EndorsementWithEndorser) => e.verificationLevel === 'device').length,
  };

  return { endorsements, stats };
}

export default async function SubstrateProfilePage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  const substrate = await getSubstrate(id);

  if (!substrate) {
    notFound();
  }

  const { endorsements, stats } = await getEndorsements(id);

  const isOwner = session?.user?.walletAddress === substrate.owner_wallet;

  // Check if the current user has already endorsed
  const hasEndorsed = session?.user
    ? endorsements.some((e) => e.endorser.walletAddress === session.user.walletAddress)
    : false;

  return (
    <>
      <Page.Header className="p-0">
        <TopBar
          title={substrate.display_name}
          startAdornment={
            <Link href="/registry" className="p-2 -ml-2">
              <ArrowLeft className="w-6 h-6" />
            </Link>
          }
        />
      </Page.Header>

      <Page.Main className="flex flex-col gap-6 mb-16">
        {/* Profile Section */}
        <SubstrateProfile
          substrate={substrate}
          endorsementCount={stats.total}
          isOwner={isOwner}
        />

        {/* Endorse Button */}
        {!isOwner && !hasEndorsed && substrate.status === 'ready' && (
          <EndorseButton substrateId={id} />
        )}

        {hasEndorsed && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-green-700">
              You have endorsed this substrate
            </p>
          </div>
        )}

        {/* Endorsements Section */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">Endorsements</h2>
          <EndorsementList
            endorsements={endorsements.map((e) => ({
              id: e.id,
              verificationLevel: e.verificationLevel,
              createdAt: e.createdAt.toISOString(),
              endorser: {
                walletAddress: e.endorser.walletAddress,
                username: e.endorser.username,
              },
            }))}
            stats={stats}
          />
        </div>
      </Page.Main>
    </>
  );
}
