'use client';

import { getSubstrateStatus, SubstrateStatus } from '@/lib/substrate-api';
import { Button } from '@worldcoin/mini-apps-ui-kit-react';
import { CheckCircle, Refresh, WarningCircle } from 'iconoir-react';
import { useEffect, useState } from 'react';

interface ExtractionProgressProps {
  substrateId: string;
  onComplete?: () => void;
}

const statusMessages: Record<SubstrateStatus, string> = {
  pending: 'Waiting to start...',
  extracting: 'Analyzing your social data...',
  ready: 'Analysis complete!',
  failed: 'Analysis failed',
};

const steps = [
  'Fetching social data',
  'Analyzing communication patterns',
  'Identifying personality traits',
  'Building personality profile',
  'Finalizing substrate',
];

export function ExtractionProgress({
  substrateId,
  onComplete,
}: ExtractionProgressProps) {
  const [status, setStatus] = useState<SubstrateStatus>('pending');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const checkStatus = async () => {
      const result = await getSubstrateStatus(substrateId);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.data) {
        setStatus(result.data.status);
        setProgress(result.data.progress || 0);

        // Calculate current step based on progress
        const stepIndex = Math.min(
          Math.floor((result.data.progress || 0) / 20),
          steps.length - 1
        );
        setCurrentStep(stepIndex);

        if (result.data.status === 'ready') {
          onComplete?.();
          if (intervalId) clearInterval(intervalId);
        } else if (result.data.status === 'failed') {
          if (intervalId) clearInterval(intervalId);
        }
      }
    };

    // Poll every 2 seconds while extracting
    checkStatus();
    intervalId = setInterval(checkStatus, 2000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [substrateId, onComplete]);

  const handleRetry = async () => {
    setError(null);
    setStatus('pending');
    setProgress(0);
    setCurrentStep(0);

    try {
      const response = await fetch(`/api/substrate/${substrateId}/extract`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to retry extraction');
      }
    } catch {
      setError('Failed to connect to server');
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="text-center">
        {status === 'ready' ? (
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        ) : status === 'failed' ? (
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <WarningCircle className="w-8 h-8 text-red-600" />
          </div>
        ) : (
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <h2 className="text-xl font-semibold text-gray-900">
          {statusMessages[status]}
        </h2>

        {status === 'extracting' && (
          <p className="text-gray-600 mt-2">{steps[currentStep]}</p>
        )}
      </div>

      {/* Progress Bar */}
      {(status === 'pending' || status === 'extracting') && (
        <div className="w-full">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Step List */}
      {(status === 'pending' || status === 'extracting') && (
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                index < currentStep
                  ? 'bg-green-50'
                  : index === currentStep
                    ? 'bg-blue-50'
                    : 'bg-gray-50'
              }`}
            >
              {index < currentStep ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : index === currentStep ? (
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              ) : (
                <div className="w-5 h-5 border-2 border-gray-300 rounded-full flex-shrink-0" />
              )}
              <span
                className={`text-sm ${
                  index <= currentStep ? 'text-gray-900' : 'text-gray-500'
                }`}
              >
                {step}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {(status === 'failed' || error) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-center mb-4">
            {error || 'Something went wrong during the analysis.'}
          </p>
          <Button onClick={handleRetry} className="w-full" variant="secondary">
            <Refresh className="w-5 h-5 mr-2" />
            Try Again
          </Button>
        </div>
      )}

      {/* Success State */}
      {status === 'ready' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-green-700">
            Your substrate is ready! People can now chat with your AI clone.
          </p>
        </div>
      )}
    </div>
  );
}
