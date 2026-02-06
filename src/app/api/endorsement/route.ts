import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { verifyCloudProof, ISuccessResult, IVerifyResponse } from '@worldcoin/minikit-js';
import { NextRequest, NextResponse } from 'next/server';

interface EndorsementRequest {
  substrateId: string;
  proof: ISuccessResult;
}

// POST - Create a new endorsement with World ID verification
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.walletAddress) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { substrateId, proof } = (await req.json()) as EndorsementRequest;

  if (!substrateId || !proof) {
    return NextResponse.json(
      { error: 'Missing substrateId or proof' },
      { status: 400 }
    );
  }

  const appId = process.env.NEXT_PUBLIC_APP_ID as `app_${string}`;

  // Verify the World ID proof
  // Action: "endorsement", Signal: substrateId (binds proof to specific substrate)
  const verifyRes = (await verifyCloudProof(
    proof,
    appId,
    'endorsement',
    substrateId
  )) as IVerifyResponse;

  if (!verifyRes.success) {
    return NextResponse.json(
      { error: 'World ID verification failed', details: verifyRes },
      { status: 400 }
    );
  }

  // Check if this nullifier_hash has already been used (one endorsement per World ID)
  const existingEndorsement = await prisma.endorsement.findUnique({
    where: { nullifierHash: proof.nullifier_hash },
  });

  if (existingEndorsement) {
    return NextResponse.json(
      { error: 'You have already endorsed a substrate with this World ID' },
      { status: 409 }
    );
  }

  // Ensure user exists
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

  // Ensure substrate reference exists locally
  let substrateRef = await prisma.substrateRef.findUnique({
    where: { id: substrateId },
  });

  if (!substrateRef) {
    // We need to fetch substrate info from the backend and create a local reference
    // For now, we'll create a minimal reference - the display name can be updated later
    const backendUrl = process.env.NEXT_PUBLIC_SUBSTRATE_API_URL || 'http://localhost:8000';
    try {
      const substrateRes = await fetch(`${backendUrl}/substrates/${substrateId}`);
      if (!substrateRes.ok) {
        return NextResponse.json(
          { error: 'Substrate not found' },
          { status: 404 }
        );
      }
      const substrateData = await substrateRes.json();

      // Ensure the substrate owner exists as a user
      let ownerUser = await prisma.user.findUnique({
        where: { walletAddress: substrateData.owner_wallet },
      });

      if (!ownerUser) {
        ownerUser = await prisma.user.create({
          data: { walletAddress: substrateData.owner_wallet },
        });
      }

      substrateRef = await prisma.substrateRef.create({
        data: {
          id: substrateId,
          ownerWallet: substrateData.owner_wallet,
          displayName: substrateData.display_name,
        },
      });
    } catch {
      return NextResponse.json(
        { error: 'Failed to fetch substrate information' },
        { status: 500 }
      );
    }
  }

  // Create the endorsement
  const endorsement = await prisma.endorsement.create({
    data: {
      substrateId,
      endorserWallet: session.user.walletAddress,
      nullifierHash: proof.nullifier_hash,
      merkleRoot: proof.merkle_root,
      proof: JSON.stringify(proof.proof),
      verificationLevel: proof.verification_level,
    },
  });

  return NextResponse.json({ endorsement, status: 201 });
}

// GET - List all endorsements (optionally filtered)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get('wallet');

  const where = walletAddress ? { endorserWallet: walletAddress } : {};

  const endorsements = await prisma.endorsement.findMany({
    where,
    include: {
      substrate: {
        select: {
          id: true,
          displayName: true,
          ownerWallet: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ endorsements });
}
