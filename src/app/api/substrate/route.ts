import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_SUBSTRATE_API_URL || 'http://localhost:8000';

// POST - Create a new substrate (proxies to Python backend)
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.walletAddress) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  // Ensure the owner_wallet matches the authenticated user
  const payload = {
    ...body,
    owner_wallet: session.user.walletAddress,
  };

  try {
    const backendRes = await fetch(`${BACKEND_URL}/substrates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!backendRes.ok) {
      const error = await backendRes.json();
      return NextResponse.json(
        { error: error.detail || 'Failed to create substrate' },
        { status: backendRes.status }
      );
    }

    const substrate = await backendRes.json();

    // Ensure user exists locally
    let user = await prisma.user.findUnique({
      where: { walletAddress: session.user.walletAddress },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          walletAddress: session.user.walletAddress,
          username: session.user.username,
        },
      });
    }

    // Create local reference to the substrate
    await prisma.substrateRef.create({
      data: {
        id: substrate.id,
        ownerWallet: session.user.walletAddress,
        displayName: substrate.display_name,
      },
    });

    return NextResponse.json(substrate, { status: 201 });
  } catch (error) {
    console.error('Error creating substrate:', error);
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 503 }
    );
  }
}

// GET - List substrates (proxies to Python backend, enriches with endorsement counts)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ownerWallet = searchParams.get('owner_wallet');

  try {
    const url = new URL(`${BACKEND_URL}/substrates`);
    if (ownerWallet) {
      url.searchParams.set('owner_wallet', ownerWallet);
    }

    const backendRes = await fetch(url.toString());

    if (!backendRes.ok) {
      const error = await backendRes.json();
      return NextResponse.json(
        { error: error.detail || 'Failed to fetch substrates' },
        { status: backendRes.status }
      );
    }

    const substrates = await backendRes.json();

    // Enrich with endorsement counts
    const substrateIds = substrates.map((s: { id: string }) => s.id);
    const endorsementCounts = await prisma.endorsement.groupBy({
      by: ['substrateId'],
      where: { substrateId: { in: substrateIds } },
      _count: { id: true },
    });

    const countMap = new Map(
      endorsementCounts.map((e: { substrateId: string; _count: { id: number } }) => [e.substrateId, e._count.id])
    );

    const enrichedSubstrates = substrates.map((s: { id: string }) => ({
      ...s,
      endorsement_count: countMap.get(s.id) || 0,
    }));

    return NextResponse.json(enrichedSubstrates);
  } catch (error) {
    console.error('Error fetching substrates:', error);
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 503 }
    );
  }
}
