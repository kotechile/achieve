import React, { useState, useEffect } from 'react';
import { trackAichieveEvent, captureAichieveLead } from '../../../lib/telemetry/vibeClient';

export interface AichieveAssetProps {
  title: string;
  category: string;
  description: string;
  assetSlug: string;
  domainCategory: string;
  toolUrl?: string;
  quickParamLabel?: string;
  defaultParamValue?: number;
  paramUnit?: string;
  paramMin?: number;
  paramMax?: number;
  paramStep?: number;
  computeYield?: (value: number) => { headline: string; delta: string; subtext: string; isPositive?: boolean };
  onDeploy?: () => void;
}

export const VibeAssetCard: React.FC<AichieveAssetProps> = ({
  title,
  category,
  description,
  assetSlug,
  domainCategory,
  toolUrl,
  quickParamLabel = 'Monthly Operating Volume',
  defaultParamValue = 50000,
  paramUnit = '$',
  paramMin = 10000,
  paramMax = 200000,
  paramStep = 5000,
  computeYield,
  onDeploy
}) => {
  const [engaged, setEngaged] = useState(false);
  const [paramValue, setParamValue] = useState(defaultParamValue);
  const [emailInput, setEmailInput] = useState('');
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    trackAichieveEvent('card_impression', assetSlug, domainCategory);
  }, [assetSlug, domainCategory]);

  const calculateResult = computeYield || ((val: number) => {
    const leak = Math.round(val * 0.22);
    return {
      headline: `-$${leak.toLocaleString()}/mo`,
      delta: 'Unmonitored Exception Leakage',
      subtext: 'Compounding operational cost detected across unmonitored agent/vendor billing seams.',
      isPositive: false
    };
  });

  const currentYield = calculateResult(paramValue);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setParamValue(val);
    if (!engaged) {
      setEngaged(true);
      trackAichieveEvent('session_start', assetSlug, domainCategory, { initialValue: val });
    }
    trackAichieveEvent('input_adjusted', assetSlug, domainCategory, { paramValue: val });
  };

  const handleDeploy = () => {
    setEngaged(true);
    trackAichieveEvent('session_start', assetSlug, domainCategory, { paramValue });
    if (onDeploy) onDeploy();
  };

  const handleLeadSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) return;

    setIsSubmitting(true);
    const success = await captureAichieveLead(
      emailInput,
      assetSlug,
      domainCategory,
      {
        paramValue,
        calculatedMetric: currentYield.headline,
        timestamp: new Date().toISOString()
      },
      'enterprise_dossier'
    );

    setIsSubmitting(false);
    if (success) {
      setLeadCaptured(true);
    }
  };

  return (
    <article
      className="bg-[#141920] border border-white/10 p-6 sm:p-7 flex flex-col justify-between transition-colors duration-150 hover:border-[#e8a33d]"
      aria-labelledby={`ai-asset-${assetSlug}`}
    >
      <div>
        {/* Command Deck Header */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] bg-white/5 text-[#e8a33d] px-2.5 py-1 border border-white/10">
            {category}
          </span>
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#8496a9]">
            Precision Engine v1.0
          </span>
        </div>

        {/* Title & Technical Hook */}
        <h3
          id={`ai-asset-${assetSlug}`}
          className="text-xl sm:text-2xl font-black tracking-tight text-[#e9eef4] mb-2 leading-snug"
        >
          {title}
        </h3>
        <p className="text-sm leading-relaxed text-[#b9c6d3] mb-6">
          {description}
        </p>

        {/* Interactive Parameter Control */}
        <div className="bg-[#0e1116] border border-white/10 p-4 sm:p-5 mb-6">
          <div className="flex items-center justify-between gap-2 mb-2">
            <label
              htmlFor={`slider-${assetSlug}`}
              className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#94a3b8]"
            >
              {quickParamLabel}
            </label>
            <span className="font-mono text-sm font-bold text-[#e9eef4]">
              {paramUnit === '$' ? `$${paramValue.toLocaleString()}` : `${paramValue} ${paramUnit}`}
            </span>
          </div>

          <input
            id={`slider-${assetSlug}`}
            type="range"
            min={paramMin}
            max={paramMax}
            step={paramStep}
            value={paramValue}
            onChange={handleSliderChange}
            className="w-full h-1.5 bg-[#222a34] appearance-none cursor-pointer accent-[#e8a33d]"
            aria-label={quickParamLabel}
          />

          {/* Metric Verdict Display */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-baseline justify-between gap-2">
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#94a3b8]">
                {currentYield.delta}
              </p>
              <p className="text-xs text-[#8496a9] mt-0.5">
                {currentYield.subtext}
              </p>
            </div>
            <div className="text-right">
              <span
                className={`font-mono text-xl sm:text-2xl font-black ${
                  currentYield.isPositive !== false ? 'text-[#10b981]' : 'text-[#e8a33d]'
                }`}
              >
                {currentYield.headline}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Engagement & Intent Conversion */}
      <div>
        {!engaged ? (
          <button
            type="button"
            onClick={handleDeploy}
            className="w-full py-3 px-4 bg-[#e8a33d] hover:bg-[#d8932e] text-[#08090b] font-mono font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center space-x-2"
          >
            <span>Run Enterprise Scenario</span>
            <span aria-hidden="true">&rarr;</span>
          </button>
        ) : leadCaptured ? (
          <div className="p-3 bg-[#0e1116] border border-[#10b981] text-center">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#10b981]">
              Telemetry Synced · Dossier Ready
            </p>
            <p className="text-xs text-[#b9c6d3] mt-1">
              Parameters recorded. Automated report dispatched via enterprise pipeline.
            </p>
            {toolUrl && (
              <a
                href={toolUrl}
                className="mt-3 inline-block font-mono text-xs font-bold text-[#e8a33d] hover:underline"
              >
                Open Full Multivariable Engine &rarr;
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <form onSubmit={handleLeadSubmit} className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                required
                placeholder="Corporate email for audit dossier"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-white/10 bg-[#0e1116] text-[#e9eef4] placeholder:text-[#8496a9] focus:outline-none focus:border-[#e8a33d]"
                aria-label="Corporate email"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2.5 px-4 bg-[#e8a33d] hover:bg-[#d8932e] text-[#08090b] text-xs font-mono font-bold uppercase tracking-wider transition-colors disabled:opacity-50 shrink-0"
              >
                {isSubmitting ? 'Syncing...' : 'Export Dossier'}
              </button>
            </form>

            {/* The address is used for one thing. Say so at the point of capture — a stored email
                with no stated purpose is the part regulators actually object to. */}
            <p className="text-[11px] leading-relaxed text-[#8496a9]">
              We use this address only to send the dossier you just configured. No newsletter, no resale.
            </p>

            <div className="flex items-center justify-between text-xs text-[#8496a9]">
              <span className="font-mono text-[10px] uppercase tracking-wider">
                Session Active · Real-time Telemetry
              </span>
              {toolUrl && (
                <a
                  href={toolUrl}
                  className="font-mono text-[11px] font-semibold text-[#e8a33d] hover:underline"
                >
                  Full Engine &rarr;
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
};
