import { auth } from '@/auth';
import { SubstrateCard } from '@/components/Substrate';
import { Page } from '@/components/PageLayout';
import { SignOutButton } from '@/components/SignOutButton';
import { Substrate } from '@/lib/substrate-api';
import { Button, CircularIcon, Marble, TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { Plus, User } from 'iconoir-react';
import Link from 'next/link';

async function getUserSubstrates(walletAddress: string): Promise<Substrate[]> {
  const backendUrl = process.env.NEXT_PUBLIC_SUBSTRATE_API_URL || 'http://localhost:8000';
  try {
    const res = await fetch(
      `${backendUrl}/substrates?owner_wallet=${encodeURIComponent(walletAddress)}`,
      { next: { revalidate: 30 } }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.walletAddress) {
    return (
      <>
        <Page.Header className="p-0">
          <TopBar title="Profile" />
        </Page.Header>
        <Page.Main className="flex items-center justify-center">
          <p className="text-gray-500">Please sign in to view your profile</p>
        </Page.Main>
      </>
    );
  }

  const { walletAddress, username, profilePictureUrl } = session.user;
  const substrates = await getUserSubstrates(walletAddress);

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <>
      <Page.Header className="p-0">
        <TopBar title="Profile" />
      </Page.Header>

      <Page.Main className="flex flex-col gap-6 mb-16">
        {/* User Info */}
        <div className="flex flex-col items-center text-center">
          {profilePictureUrl ? (
            <Marble src={profilePictureUrl} className="w-20 h-20 mb-3" />
          ) : (
            <CircularIcon className="w-20 h-20 bg-gray-100 mb-3">
              <User className="w-10 h-10 text-gray-400" />
            </CircularIcon>
          )}

          <h2 className="text-xl font-bold text-gray-900">
            {username || 'Anonymous'}
          </h2>
          <p className="text-sm text-gray-500">
            {truncateAddress(walletAddress)}
          </p>
        </div>

        {/* User's Substrates */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Your Substrates</h3>
            <Link href="/create">
              <Button size="sm" variant="secondary">
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
            </Link>
          </div>

          {substrates.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <p className="text-gray-600 mb-4">
                You haven&apos;t created a substrate yet.
              </p>
              <Link href="/create" className="inline-block">
                <Button variant="primary">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Substrate
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {substrates.map((substrate) => (
                <SubstrateCard key={substrate.id} substrate={substrate} />
              ))}
            </div>
          )}
        </div>

        {/* Sign Out Button */}
        <SignOutButton />
      </Page.Main>
    </>
  );
}
