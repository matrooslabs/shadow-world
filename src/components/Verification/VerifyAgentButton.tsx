'use client';

import { Button, LiveFeedback } from '@worldcoin/mini-apps-ui-kit-react';
import { MiniKit, VerificationLevel } from '@worldcoin/minikit-js';
import { BadgeCheck } from 'iconoir-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface VerifyAgentButtonProps {
  substrateId: string;
  isVerified: boolean;
  verifiedAt: string | null;
}

export function VerifyAgentButton({
  substrateId,
  isVerified,
  verifiedAt,
}: VerifyAgentButtonProps) {
  const router = useRouter();
  const [buttonState, setButtonState] = useState<
    'pending' | 'success' | 'failed' | undefined
  >(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const handleVerify = async () => {
    setButtonState('pending');
    setErrorMessage(null);

    try {
      const result = await MiniKit.commandsAsync.verify({
        action: 'verify-agent',
        signal: substrateId,
        verification_level: VerificationLevel.Orb,
      });

      if (!result.finalPayload) {
        setButtonState('failed');
        setErrorMessage('Verification cancelled');
        setTimeout(() => {
          setButtonState(undefined);
          setErrorMessage(null);
        }, 3000);
        return;
      }

      const response = await fetch('/api/verify-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          substrateId,
          proof: result.finalPayload,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setButtonState('success');
        setTimeout(() => router.refresh(), 1000);
      } else {
        setButtonState('failed');
        setErrorMessage(data.error || 'Verification failed');
        setTimeout(() => {
          setButtonState(undefined);
          setErrorMessage(null);
        }, 3000);
      }
    } catch {
      setButtonState('failed');
      setErrorMessage('An error occurred');
      setTimeout(() => {
        setButtonState(undefined);
        setErrorMessage(null);
      }, 3000);
    }
  };

  const handleRemoveVerification = async () => {
    setShowRemoveConfirm(false);
    setButtonState('pending');

    try {
      const response = await fetch('/api/verify-agent', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ substrateId }),
      });

      if (response.ok) {
        setButtonState('success');
        setTimeout(() => router.refresh(), 1000);
      } else {
        setButtonState('failed');
        setErrorMessage('Failed to remove verification');
        setTimeout(() => {
          setButtonState(undefined);
          setErrorMessage(null);
        }, 3000);
      }
    } catch {
      setButtonState('failed');
      setErrorMessage('An error occurred');
      setTimeout(() => {
        setButtonState(undefined);
        setErrorMessage(null);
      }, 3000);
    }
  };

  if (isVerified) {
    const formattedDate = verifiedAt
      ? new Date(verifiedAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : null;

    return (
      <div className="w-full">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <BadgeCheck className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-800">Verified Agent</span>
          </div>
          {formattedDate && (
            <p className="text-xs text-green-600 ml-7">
              Verified on {formattedDate}
            </p>
          )}
        </div>

        {!showRemoveConfirm ? (
          <button
            onClick={() => setShowRemoveConfirm(true)}
            className="text-xs text-gray-400 mt-2 hover:text-gray-600"
          >
            Remove verification
          </button>
        ) : (
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleRemoveVerification}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Confirm removal
            </button>
            <button
              onClick={() => setShowRemoveConfirm(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      <LiveFeedback
        label={{
          failed: errorMessage || 'Verification failed',
          pending: 'Verifying...',
          success: 'Verified!',
        }}
        state={buttonState}
        className="w-full"
      >
        <Button
          onClick={handleVerify}
          disabled={buttonState === 'pending' || buttonState === 'success'}
          size="lg"
          variant="secondary"
          className="w-full"
        >
          <BadgeCheck className="w-5 h-5 mr-2" />
          Verify This Agent
        </Button>
      </LiveFeedback>
      <p className="text-xs text-gray-500 text-center mt-2">
        Requires Orb verification. You can only verify one agent at a time.
      </p>
    </div>
  );
}
