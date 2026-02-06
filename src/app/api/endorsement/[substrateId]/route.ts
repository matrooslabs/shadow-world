import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ substrateId: string }>;
}

interface EndorsementRecord {
  verificationLevel: string;
  [key: string]: unknown;
}

// GET - Get all endorsements for a specific substrate
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { substrateId } = await params;

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
  }) as EndorsementRecord[];

  // Count endorsements by verification level
  const stats = {
    total: endorsements.length,
    orb: endorsements.filter((e: EndorsementRecord) => e.verificationLevel === 'orb').length,
    device: endorsements.filter((e: EndorsementRecord) => e.verificationLevel === 'device').length,
  };

  return NextResponse.json({ endorsements, stats });
}
