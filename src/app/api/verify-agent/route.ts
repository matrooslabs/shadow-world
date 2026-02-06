import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { verifyCloudProof, ISuccessResult, IVerifyResponse } from '@worldcoin/minikit-js';
import { NextRequest, NextResponse } from 'next/server';

interface VerifyAgentRequest {
  substrateId: string;
  proof: ISuccessResult;
}

// POST - Verify an agent with World ID proof
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.walletAddress) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { substrateId, proof } = (await req.json()) as VerifyAgentRequest;

  if (!substrateId || !proof) {
    return NextResponse.json(
      { error: 'Missing substrateId or proof' },
      { status: 400 }
    );
  }

  // Verify substrate ownership - only the owner can verify their own agent
  const backendUrl = process.env.SUBSTRATE_API_URL || process.env.NEXT_PUBLIC_SUBSTRATE_API_URL || 'http://localhost:8000';
  let substrateData: { id: string; owner_wallet: string; display_name: string };
  try {
    const substrateRes = await fetch(`${backendUrl}/substrates/${substrateId}`);
    if (!substrateRes.ok) {
      return NextResponse.json({ error: 'Substrate not found' }, { status: 404 });
    }
    substrateData = await substrateRes.json();
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch substrate information' },
      { status: 500 }
    );
  }

  if (substrateData.owner_wallet !== session.user.walletAddress) {
    return NextResponse.json(
      { error: 'Only the owner can verify their own agent' },
      { status: 403 }
    );
  }

  const appId = process.env.NEXT_PUBLIC_APP_ID as `app_${string}`;

  // Verify the World ID proof
  const verifyRes = (await verifyCloudProof(
    proof,
    appId,
    'verify-agent',
    substrateId
  )) as IVerifyResponse;

  if (!verifyRes.success) {
    return NextResponse.json(
      { error: 'World ID verification failed', details: verifyRes },
      { status: 400 }
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
    substrateRef = await prisma.substrateRef.create({
      data: {
        id: substrateId,
        ownerWallet: substrateData.owner_wallet,
        displayName: substrateData.display_name,
      },
    });
  }

  // In a transaction: remove any existing verification for the same nullifier
  // or substrate, then create new verification
  const verification = await prisma.$transaction(async (tx) => {
    // Remove any existing verification with the same nullifier (human switching agents)
    await tx.verification.deleteMany({
      where: { nullifierHash: proof.nullifier_hash },
    });

    // Remove any existing verification for this substrate
    await tx.verification.deleteMany({
      where: { substrateId },
    });

    // Create new verification
    return tx.verification.create({
      data: {
        substrateId,
        nullifierHash: proof.nullifier_hash,
        merkleRoot: proof.merkle_root,
        proof: JSON.stringify(proof.proof),
      },
    });
  });

  return NextResponse.json({ verification }, { status: 201 });
}

// DELETE - Remove verification from an agent
export async function DELETE(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.walletAddress) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { substrateId } = (await req.json()) as { substrateId: string };

  if (!substrateId) {
    return NextResponse.json({ error: 'Missing substrateId' }, { status: 400 });
  }

  // Verify ownership
  const substrateRef = await prisma.substrateRef.findUnique({
    where: { id: substrateId },
  });

  if (!substrateRef || substrateRef.ownerWallet !== session.user.walletAddress) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.verification.deleteMany({
    where: { substrateId },
  });

  return NextResponse.json({ success: true });
}

// GET - Check verification status for a substrate
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const substrateId = searchParams.get('substrateId');

  if (!substrateId) {
    return NextResponse.json({ error: 'Missing substrateId' }, { status: 400 });
  }

  const verification = await prisma.verification.findUnique({
    where: { substrateId },
  });

  return NextResponse.json({
    isVerified: !!verification,
    verifiedAt: verification?.createdAt || null,
  });
}
