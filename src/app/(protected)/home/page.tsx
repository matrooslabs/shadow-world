import { auth } from '@/auth';
import { SubstrateCard } from '@/components/Substrate';
import { Page } from '@/components/PageLayout';
import { Marble, TopBar, Button } from '@worldcoin/mini-apps-ui-kit-react';
import { Plus, ArrowRight } from 'iconoir-react';
import Link from 'next/link';

async function getSubstrates() {
  const backendUrl = process.env.SUBSTRATE_API_URL || process.env.NEXT_PUBLIC_SUBSTRATE_API_URL || 'http://localhost:8000';
  try {
    const res = await fetch(`${backendUrl}/substrates?limit=5`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function Home() {
  const session = await auth();
  const substrates = await getSubstrates();

  return (
    <>
      <Page.Header className="p-0">
        <TopBar
          title="Shadowverse"
          endAdornment={
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold capitalize">
                {session?.user.username}
              </p>
              <Marble src={session?.user.profilePictureUrl} className="w-12" />
            </div>
          }
        />
      </Page.Header>
      <Page.Main className="flex flex-col items-center justify-start gap-6 mb-16">
        {/* Hero Section */}
        <div className="w-full text-center py-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Create Your Digital Clone
          </h1>
          <p className="text-gray-600 mb-6 max-w-sm mx-auto">
            Build an AI version of yourself backed by World ID verification.
            Let others chat with your Shadow.
          </p>
          <Link href="/create" className="inline-block">
            <Button size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Create Your Shadow
            </Button>
          </Link>
        </div>

        {/* How it Works */}
        <div className="w-full bg-gray-50 rounded-xl p-4">
          <h2 className="font-semibold text-gray-900 mb-4">How it Works</h2>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-blue-600">1</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Connect Socials</h3>
                <p className="text-sm text-gray-600">
                  Link your Twitter to let us analyze your personality
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-blue-600">2</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">AI Extraction</h3>
                <p className="text-sm text-gray-600">
                  We build a personality profile from your content
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-blue-600">3</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Verify Your Agent</h3>
                <p className="text-sm text-gray-600">
                  Prove your agent is backed by a real human with World ID
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Substrates */}
        {substrates.length > 0 && (
          <div className="w-full">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">
                Featured Shadows
              </h2>
              <Link
                href="/registry"
                className="text-sm text-blue-600 flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {substrates.slice(0, 3).map((substrate: Parameters<typeof SubstrateCard>[0]['substrate']) => (
                <SubstrateCard key={substrate.id} substrate={substrate} />
              ))}
            </div>
          </div>
        )}
      </Page.Main>
    </>
  );
}
