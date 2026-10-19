import React from 'react';
import { VibeAssetCard, type AichieveAssetProps } from './VibeAssetCard';

const ENTERPRISE_VIBE_ASSETS: AichieveAssetProps[] = [
  {
    title: 'Agentic AI Token Overrun & Concurrency Ceiling Engine',
    category: 'Agentic AI Governance',
    assetSlug: 'token-overrun-concurrency-engine',
    domainCategory: 'agentic-ai',
    toolUrl: '/tools/gpu-compute/',
    description:
      'Autonomous multi-agent swarms without strict semantic kill switches enter recursive loop cascades. Calculate unbounded token budget liability at scale.',
    quickParamLabel: 'Monthly Agent API Spend',
    defaultParamValue: 60000,
    paramUnit: '$',
    paramMin: 10000,
    paramMax: 300000,
    paramStep: 5000,
    computeYield: (spend: number) => {
      // 18% recursive waste without prompt/tool loop limits
      const overrunWaste = Math.round(spend * 0.185);
      return {
        headline: `$${overrunWaste.toLocaleString()}/mo`,
        delta: 'Recursive Loop Risk Exposure',
        subtext: 'Unchecked agent self-reflection and retry cascades quietly burn 18.5% of inference budgets.',
        isPositive: false
      };
    }
  },
  {
    title: 'Dedicated GPU Cluster vs. Cloud Pod Breakeven Engine',
    category: 'Compute Infrastructure',
    assetSlug: 'cluster-gpu-breakeven-engine',
    domainCategory: 'gpu-infrastructure',
    toolUrl: '/tools/gpu-compute/',
    description:
      'On-demand cloud GPU margins flip into severe penalties past 240 active hours per month. Identify your exact cluster capital breakeven point.',
    quickParamLabel: 'Active Workload GPU Count',
    defaultParamValue: 16,
    paramUnit: 'GPUs',
    paramMin: 4,
    paramMax: 64,
    paramStep: 4,
    computeYield: (gpus: number) => {
      // Cloud 8x H100 at $28/hr vs owned amortized + datacenter colo ($12/hr equivalent)
      const monthlyHours = 450;
      const cloudMonthly = gpus * 3.50 * monthlyHours;
      const colocationAmortized = gpus * 1.55 * monthlyHours;
      const savings = Math.round(cloudMonthly - colocationAmortized);
      return {
        headline: `+$${savings.toLocaleString()}/mo`,
        delta: 'Colocation Capital Net Yield',
        subtext: `At ${gpus} dedicated accelerators with >60% duty cycle, private clusters outperform cloud on-demand.`,
        isPositive: true
      };
    }
  },
  {
    title: 'Carrier Invoice Exception & 28% Leakage Audit Engine',
    category: 'Supply Chain & Logistics',
    assetSlug: 'carrier-invoice-leakage-engine',
    domainCategory: 'supply-chain',
    toolUrl: '/apps/',
    description:
      'Manual AP audits miss accessorial fees, dimensional weight recalculations, and duplicate manifests. Quantify recoverables under automated continuous auditing.',
    quickParamLabel: 'Monthly Freight & Parcel Billing',
    defaultParamValue: 125000,
    paramUnit: '$',
    paramMin: 25000,
    paramMax: 1000000,
    paramStep: 25000,
    computeYield: (billing: number) => {
      // Historical ParcelProof audit recovery average 7.8%
      const recoverable = Math.round(billing * 0.078);
      return {
        headline: `+$${recoverable.toLocaleString()}/mo`,
        delta: 'Recoverable Billing Errors',
        subtext: 'Disputed automatically against contractual carrier SLAs and published tariff schedules.',
        isPositive: true
      };
    }
  },
  {
    title: 'In-House Tool Maintenance vs. Commercial Gateway TCO',
    category: 'Enterprise Stack Economics',
    assetSlug: 'inhouse-agent-stack-tco-engine',
    domainCategory: 'stack-economics',
    toolUrl: '/tools/master-asset-tco/',
    description:
      'Internal orchestration frameworks demand an ongoing 0.4 FTE maintenance tax per engineer-month built. Model true 3-year loaded enterprise ownership.',
    quickParamLabel: 'Internal Engineer Team Size',
    defaultParamValue: 8,
    paramUnit: 'Engineers',
    paramMin: 2,
    paramMax: 30,
    paramStep: 1,
    computeYield: (engineers: number) => {
      // Loaded engineer cost $240k/yr -> $20k/mo. 15% spent tinkering on internal tooling
      const tinkeringTax = Math.round(engineers * 20000 * 0.15);
      return {
        headline: `$${tinkeringTax.toLocaleString()}/mo`,
        delta: 'Internal Tinkering & Maintenance Tax',
        subtext: `Time diverted from revenue-producing core products to maintain bespoke scaffolding.`,
        isPositive: false
      };
    }
  }
];

export const VibeAssetGrid: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
      {ENTERPRISE_VIBE_ASSETS.map((asset) => (
        <VibeAssetCard key={asset.assetSlug} {...asset} />
      ))}
    </div>
  );
};
