'use client';

import { BasicInfoForm, ExtractionProgress, SocialLinker } from '@/components/Create';
import { Page } from '@/components/PageLayout';
import {
  createSubstrate,
  getSocialAccounts,
  getSubstrate,
  SocialAccount,
  Substrate,
  triggerExtraction,
} from '@/lib/substrate-api';
import { Button, TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { ArrowLeft, CheckCircle } from 'iconoir-react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type Step = 'info' | 'social' | 'extracting' | 'complete';

export default function CreatePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const [step, setStep] = useState<Step>('info');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [substrate, setSubstrate] = useState<Substrate | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);

  // Load existing substrate if editing
  useEffect(() => {
    if (editId) {
      loadSubstrate(editId);
    }
  }, [editId]);

  const loadSubstrate = async (id: string) => {
    const result = await getSubstrate(id);
    if (result.data) {
      setSubstrate(result.data);

      // Determine which step to show based on status
      if (result.data.status === 'ready') {
        setStep('complete');
      } else if (result.data.status === 'extracting') {
        setStep('extracting');
      } else {
        // Load social accounts to determine step
        const accountsResult = await getSocialAccounts(id);
        if (accountsResult.data) {
          setSocialAccounts(accountsResult.data);
          if (accountsResult.data.length > 0) {
            setStep('social');
          } else {
            setStep('social');
          }
        }
      }
    }
  };

  const handleBasicInfoSubmit = async (data: {
    displayName: string;
    bio: string;
  }) => {
    if (!session?.user?.walletAddress) {
      setError('Please sign out and sign back in to continue');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await createSubstrate({
      owner_wallet: session.user.walletAddress,
      display_name: data.displayName,
      bio: data.bio || undefined,
    });

    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.data) {
      setSubstrate(result.data);
      setStep('social');
    }
  };

  const handleStartExtraction = async () => {
    if (!substrate) return;

    setIsLoading(true);
    const result = await triggerExtraction(substrate.id);
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setStep('extracting');
  };

  const handleExtractionComplete = () => {
    setStep('complete');
  };

  const handleViewSubstrate = () => {
    if (substrate) {
      router.push(`/substrate/${substrate.id}`);
    }
  };

  const stepTitles: Record<Step, string> = {
    info: 'Create Shadow',
    social: 'Connect Accounts',
    extracting: 'Analyzing',
    complete: 'Complete',
  };

  return (
    <>
      <Page.Header className="p-0">
        <TopBar
          title={stepTitles[step]}
          startAdornment={
            step !== 'complete' && step !== 'extracting' ? (
              <button
                onClick={() => {
                  if (step === 'social') {
                    setStep('info');
                  } else {
                    router.back();
                  }
                }}
                className="p-2 -ml-2"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            ) : null
          }
        />
      </Page.Header>

      <Page.Main className="flex flex-col mb-16">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(['info', 'social', 'extracting', 'complete'] as Step[]).map(
            (s, i) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full ${
                  step === s
                    ? 'bg-blue-600'
                    : i < ['info', 'social', 'extracting', 'complete'].indexOf(step)
                      ? 'bg-blue-300'
                      : 'bg-gray-200'
                }`}
              />
            )
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Step Content */}
        {step === 'info' && (
          <BasicInfoForm
            onSubmit={handleBasicInfoSubmit}
            isLoading={isLoading}
            initialData={
              substrate
                ? { displayName: substrate.display_name, bio: substrate.bio || '' }
                : undefined
            }
          />
        )}

        {step === 'social' && substrate && (
          <div className="space-y-6">
            <SocialLinker
              substrateId={substrate.id}
              connectedAccounts={socialAccounts}
              onAccountLinked={(account) => {
                setSocialAccounts((prev) => [...prev, account]);
              }}
            />

            {socialAccounts.length > 0 && (
              <Button
                onClick={handleStartExtraction}
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? 'Starting...' : 'Start Analysis'}
              </Button>
            )}
          </div>
        )}

        {step === 'extracting' && substrate && (
          <ExtractionProgress
            substrateId={substrate.id}
            onComplete={handleExtractionComplete}
          />
        )}

        {step === 'complete' && substrate && (
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Shadow Created!
            </h2>
            <p className="text-gray-600 mb-6">
              Your AI clone is ready. Visit your profile to verify it with
              World ID.
            </p>
            <Button onClick={handleViewSubstrate} className="w-full" size="lg">
              View Your Shadow
            </Button>
          </div>
        )}
      </Page.Main>
    </>
  );
}
