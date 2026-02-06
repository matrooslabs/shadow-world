'use client';

import { Button, LiveFeedback } from '@worldcoin/mini-apps-ui-kit-react';
import { MiniKit, VerificationLevel } from '@worldcoin/minikit-js';
import { BadgeCheck } from 'iconoir-react';
import { useState } from 'react';

interface EndorseButtonProps {
  substrateId: string;
  onSuccess?: () => void;
}

export function EndorseButton({ substrateId, onSuccess }: EndorseButtonProps) {
  const [buttonState, setButtonState] = useState<
    'pending' | 'success' | 'failed' | undefined
  >(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEndorse = async () => {
    setButtonState('pending');
    setErrorMessage(null);

    try {
      // Request World ID verification with Orb level for endorsements
      const result = await MiniKit.commandsAsync.verify({
        action: 'endorsement',
        signal: substrateId,
        verification_level: VerificationLevel.Orb,
      });

      // Check if we got a valid proof
      if (!result.finalPayload) {
        setButtonState('failed');
        setErrorMessage('Verification cancelled');
        setTimeout(() => {
          setButtonState(undefined);
          setErrorMessage(null);
        }, 3000);
        return;
      }

      // Submit the proof to our API
      const response = await fetch('/api/endorsement', {
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
        onSuccess?.();
      } else {
        setButtonState('failed');
        setErrorMessage(data.error || 'Failed to endorse');
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

  return (
    <div className="w-full">
      <LiveFeedback
        label={{
          failed: errorMessage || 'Failed to endorse',
          pending: 'Verifying...',
          success: 'Endorsed!',
        }}
        state={buttonState}
        className="w-full"
      >
        <Button
          onClick={handleEndorse}
          disabled={buttonState === 'pending' || buttonState === 'success'}
          size="lg"
          variant="secondary"
          className="w-full"
        >
          <BadgeCheck className="w-5 h-5 mr-2" />
          Endorse with World ID
        </Button>
      </LiveFeedback>
      <p className="text-xs text-gray-500 text-center mt-2">
        Requires Orb verification. You can only endorse one substrate.
      </p>
    </div>
  );
}
