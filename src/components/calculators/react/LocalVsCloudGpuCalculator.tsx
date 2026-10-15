import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useMotionValue, animate } from 'framer-motion';
import { Cpu, Server, Zap, Wrench, Coins, Tag, Database, DollarSign, Cloud, CreditCard, Sparkles } from 'lucide-react';
import { formatCurrency } from '../../../lib/calculators/format';

interface GpuModel {
	id: string;
	name: string;
	cost: number;
	tdp: number; // in Watts
	vram: string;
	tier: string;
	isTurnKey: boolean;
}

interface CloudGpuConfig {
	gpuModel: string;
	vram: string;
	rate: number;
	communityRate?: number;
	spotRate?: number;
	note?: string;
}

interface CloudProviderDetail {
	id: string;
	name: string;
	description: string;
	billingUnit: string;
	egress: string;
	storageCost: string;
	storageRate: number; // storage rate per GB/month
	affiliateUrl: string;
	ctaText?: string;
	type: 'Enterprise' | 'Decentralized' | 'Standard';
	gpus: CloudGpuConfig[];
}

const GPU_MODELS: GpuModel[] = [
	// TIER 1: Apple Silicon (Unified Memory)
	{ id: 'mac-mini-m4-pro-48', name: 'Mac Mini M4 Pro (48GB) - $1,499', cost: 1499, tdp: 65, vram: '48GB', tier: 'Apple Silicon', isTurnKey: true },
	{ id: 'mac-mini-m4-pro-64', name: 'Mac Mini M4 Pro (64GB) - $1,799', cost: 1799, tdp: 65, vram: '64GB', tier: 'Apple Silicon', isTurnKey: true },
	{ id: 'mac-studio-m4-max-128', name: 'Mac Studio M4 Max (128GB) - $3,699', cost: 3699, tdp: 120, vram: '128GB', tier: 'Apple Silicon', isTurnKey: true },

	// TIER 2: AMD Mini PCs (Budget Always-On)
	{ id: 'beelink-ser9-64', name: 'Beelink SER9 (64GB DDR5) - $799', cost: 799, tdp: 25, vram: '64GB Shared', tier: 'AMD Mini PC', isTurnKey: true },
	{ id: 'gmktec-evo-x2-128', name: 'GMKtec EVO-X2 (AMD Strix Halo 128GB) - $2,849', cost: 2849, tdp: 85, vram: '128GB Shared', tier: 'AMD Mini PC', isTurnKey: true },

	// TIER 3: Professional CUDA Powerhouse
	{ id: 'rtx-5090-diy', name: 'Custom RTX 5090 DIY Workstation (32GB VRAM) - $7,500', cost: 7500, tdp: 650, vram: '32GB', tier: 'NVIDIA CUDA Workstation', isTurnKey: true },
	{ id: 'prebuilt-boox-rtx-5090', name: 'BOXX / Puget Workstation (RTX 5090 32GB) - $5,850', cost: 5850, tdp: 700, vram: '32GB', tier: 'NVIDIA CUDA Workstation', isTurnKey: true },

	// TIER 4: Consumer & Used NVIDIA Hardware
	{ id: 'rtx3070', name: 'RTX 3070 (8GB VRAM) - $499', cost: 499, tdp: 220, vram: '8GB', tier: 'NVIDIA CUDA GPU', isTurnKey: false },
	{ id: 'rtx4070', name: 'RTX 4070 (12GB VRAM) - $599', cost: 599, tdp: 200, vram: '12GB', tier: 'NVIDIA CUDA GPU', isTurnKey: false },
	{ id: 'rtx4080', name: 'RTX 4080 (16GB VRAM) - $1,199', cost: 1199, tdp: 320, vram: '16GB', tier: 'NVIDIA CUDA GPU', isTurnKey: false },
	{ id: 'rtx4090', name: 'RTX 4090 (24GB VRAM) - $1,599', cost: 1599, tdp: 450, vram: '24GB', tier: 'NVIDIA CUDA GPU', isTurnKey: false },
	{ id: 'used-rtx-3090', name: 'Used Single RTX 3090 (24GB VRAM) - $699', cost: 699, tdp: 350, vram: '24GB', tier: 'NVIDIA CUDA GPU', isTurnKey: false },
	{ id: 'used-dual-rtx-3090', name: 'DIY Dual Used RTX 3090s (48GB VRAM) - $1,398', cost: 1398, tdp: 700, vram: '48GB', tier: 'NVIDIA CUDA GPU', isTurnKey: false },

	// TIER 5: Enterprise AI Workstations & Servers (H100, H200, B200, L40S, etc.)
	{ id: 'nvidia-l4', name: 'NVIDIA L4 PCIe Workstation GPU (24GB) - $1,250', cost: 1250, tdp: 75, vram: '24GB', tier: 'Enterprise AI Hardware', isTurnKey: false },
	{ id: 'rtx-pro-2000-blackwell', name: 'RTX Pro 2000 Blackwell (16GB) - $994', cost: 994, tdp: 70, vram: '16GB', tier: 'Enterprise AI Hardware', isTurnKey: false },
	{ id: 'rtx-pro-4000-blackwell', name: 'RTX Pro 4000 Blackwell (Standard/SFF 24GB) - $2,600', cost: 2600, tdp: 140, vram: '24GB', tier: 'Enterprise AI Hardware', isTurnKey: false },
	{ id: 'rtx-pro-4500-blackwell', name: 'RTX Pro 4500 Blackwell (32GB) - $3,750', cost: 3750, tdp: 200, vram: '32GB', tier: 'Enterprise AI Hardware', isTurnKey: true },
	{ id: 'rtx-pro-5000-blackwell', name: 'RTX Pro 5000 Blackwell (48GB/72GB) - $6,500', cost: 6500, tdp: 300, vram: '48GB/72GB', tier: 'Enterprise AI Hardware', isTurnKey: true },
	{ id: 'rtx-pro-6000-blackwell', name: 'RTX Pro 6000 Blackwell (Workstation/Max-Q 96GB) - $12,400', cost: 12400, tdp: 600, vram: '96GB', tier: 'Enterprise AI Hardware', isTurnKey: true },
	{ id: 'rtx-6000-ada', name: 'NVIDIA RTX 6000 Ada Workstation (48GB) - $8,500', cost: 8500, tdp: 300, vram: '48GB', tier: 'Enterprise AI Hardware', isTurnKey: true },
	{ id: 'dual-rtx-6000-ada', name: 'Dual NVIDIA RTX 6000 Ada Workstation (96GB) - $17,500', cost: 17500, tdp: 600, vram: '96GB', tier: 'Enterprise AI Hardware', isTurnKey: true },
	{ id: 'nvidia-l40s-pcie', name: 'NVIDIA L40S PCIe Workstation (48GB) - $12,500', cost: 12500, tdp: 350, vram: '48GB', tier: 'Enterprise AI Hardware', isTurnKey: true },
	{ id: 'quad-nvidia-l40s', name: '4x NVIDIA L40S Workstation Node (192GB) - $48,000', cost: 48000, tdp: 1400, vram: '192GB', tier: 'Enterprise AI Hardware', isTurnKey: true },
	{ id: 'quad-rtx-4090-node', name: '4x RTX 4090 DIY Deep Learning Node (96GB) - $10,500', cost: 10500, tdp: 1800, vram: '96GB', tier: 'Enterprise AI Hardware', isTurnKey: true },
	{ id: 'nvidia-h100-pcie', name: 'NVIDIA H100 PCIe Workstation (80GB) - $35,000', cost: 35000, tdp: 350, vram: '80GB', tier: 'Enterprise AI Hardware', isTurnKey: true },
	{ id: 'nvidia-h200-sxm', name: 'NVIDIA H200 SXM Workstation (141GB) - $48,000', cost: 48000, tdp: 700, vram: '141GB', tier: 'Enterprise AI Hardware', isTurnKey: true },
	{ id: 'nvidia-b200-sxm', name: 'NVIDIA B200 SXM Workstation (180GB) - $55,000', cost: 55000, tdp: 1000, vram: '180GB', tier: 'Enterprise AI Hardware', isTurnKey: true },
	{ id: 'octa-nvidia-h100', name: '8x NVIDIA H100 SXM HGX Server (640GB) - $320,000', cost: 320000, tdp: 10200, vram: '640GB', tier: 'Enterprise AI Hardware', isTurnKey: true },
	{ id: 'octa-nvidia-h200', name: '8x NVIDIA H200 SXM HGX Server (1128GB) - $420,000', cost: 420000, tdp: 11000, vram: '1128GB', tier: 'Enterprise AI Hardware', isTurnKey: true },
	{ id: 'octa-nvidia-b200', name: '8x NVIDIA B200 HGX Server (1440GB) - $510,000', cost: 510000, tdp: 12000, vram: '1440GB', tier: 'Enterprise AI Hardware', isTurnKey: true }
];

const CLOUD_PROVIDERS_EXPLORER: CloudProviderDetail[] = [
	{
		id: 'runpod',
		name: 'RunPod',
		description: 'Targets developers needing fast, flexible deployments with Secure Cloud (enterprise data centers) and Community Cloud (peer-to-peer distributed networks). Supports containerized pods, serverless endpoints, and dedicated multi-GPU clusters.',
		billingUnit: 'Per-second billing (Secure Cloud)',
		egress: 'Free egress',
		storageCost: '$0.10 to $0.20 per GB / month',
		storageRate: 0.15,
		affiliateUrl: 'https://runpod.io?rc=giniloh',
		ctaText: 'Try RunPod (No Upfront Cost) →',
		type: 'Standard',
		gpus: [
			{ gpuModel: 'NVIDIA B300', vram: '288 GB', rate: 7.39 },
			{ gpuModel: 'NVIDIA B200', vram: '180 GB', rate: 5.89, note: 'Serverless: $8.64' },
			{ gpuModel: 'NVIDIA H200 SXM', vram: '141 GB', rate: 4.39 },
			{ gpuModel: 'NVIDIA H100 SXM', vram: '80 GB', rate: 3.29, communityRate: 2.69 },
			{ gpuModel: 'NVIDIA H100 PCIe', vram: '80 GB', rate: 2.89 },
			{ gpuModel: 'NVIDIA A100 SXM', vram: '80 GB', rate: 1.49 },
			{ gpuModel: 'NVIDIA A100 PCIe', vram: '80 GB', rate: 1.39 },
			{ gpuModel: 'NVIDIA L40S', vram: '48 GB', rate: 0.86, note: 'Spot option available' },
			{ gpuModel: 'NVIDIA RTX 4090', vram: '24 GB', rate: 0.69, note: 'Spot option available' },
			{ gpuModel: 'NVIDIA RTX 3090', vram: '24 GB', rate: 0.46, note: 'Spot option available' }
		]
	},
	{
		id: 'lambda',
		name: 'Lambda Labs',
		description: 'Focuses on simplicity, research teams, and enterprise model pre-training. Features the "Lambda Stack"—a pre-configured Ubuntu environment loaded with PyTorch, CUDA, and NCCL.',
		billingUnit: 'Per-hour billing',
		egress: 'Free and unlimited egress',
		storageCost: '$0.20 per GB / month',
		storageRate: 0.20,
		affiliateUrl: 'https://lambdalabs.com',
		ctaText: 'Deploy on Lambda Labs →',
		type: 'Enterprise',
		gpus: [
			{ gpuModel: 'NVIDIA B200 SXM6', vram: '180 GB', rate: 6.99, note: '8-GPU node: $6.69' },
			{ gpuModel: 'NVIDIA H100 SXM', vram: '80 GB', rate: 4.29, note: '8-GPU node: $3.99' },
			{ gpuModel: 'NVIDIA H100 PCIe', vram: '80 GB', rate: 3.29, note: 'Or $2.49' },
			{ gpuModel: 'NVIDIA GH200', vram: '96 GB', rate: 2.29, note: 'Or $1.49' },
			{ gpuModel: 'NVIDIA A100 SXM', vram: '80 GB', rate: 1.79 },
			{ gpuModel: 'NVIDIA RTX A6000', vram: '48 GB', rate: 1.09 },
			{ gpuModel: 'NVIDIA RTX 6000 Ada', vram: '48 GB', rate: 0.69 }
		]
	},
	{
		id: 'nebius',
		name: 'Nebius AI Cloud',
		description: 'Specializes in standalone applications and highly scalable Kubernetes clusters mapped across European compliance standards. High-end configurations utilize Intel Sapphire Rapids and NVLink interconnect networks.',
		billingUnit: 'Billed based on resource usage',
		egress: 'Standard compliance network',
		storageCost: '$0.071 per GiB / month',
		storageRate: 0.071,
		affiliateUrl: 'https://nebius.com',
		ctaText: 'Deploy on Nebius →',
		type: 'Enterprise',
		gpus: [
			{ gpuModel: 'NVIDIA H200 NVLink', vram: '141 GB', rate: 4.50, note: '8x node: $36.00' },
			{ gpuModel: 'NVIDIA H100 NVLink', vram: '80 GB', rate: 3.85, note: '8x node: $30.80' },
			{ gpuModel: 'NVIDIA B200', vram: '180 GB', rate: 5.50 },
			{ gpuModel: 'NVIDIA L40S PCIe', vram: '48 GB', rate: 1.35 }
		]
	},
	{
		id: 'spheron',
		name: 'Spheron Network',
		description: 'Operates as a decentralized bare-metal aggregator, securing enterprise SLA guarantees from data center partners while passing on significant cost reductions, particularly for spot instances.',
		billingUnit: 'Per-minute billing with no minimum commitments',
		egress: 'Zero egress fees',
		storageCost: '$0.10 per GB / month',
		storageRate: 0.10,
		affiliateUrl: 'https://spheron.network',
		ctaText: 'Deploy on Spheron →',
		type: 'Decentralized',
		gpus: [
			{ gpuModel: 'NVIDIA B300 SXM', vram: '288 GB', rate: 6.80, spotRate: 2.45 },
			{ gpuModel: 'NVIDIA B200 SXM6', vram: '180 GB', rate: 6.02, spotRate: 2.12 },
			{ gpuModel: 'NVIDIA H200 SXM', vram: '141 GB', rate: 4.54 },
			{ gpuModel: 'NVIDIA H100 SXM5', vram: '80 GB', rate: 2.50, spotRate: 1.03 },
			{ gpuModel: 'NVIDIA H100 PCIe', vram: '80 GB', rate: 2.01 },
			{ gpuModel: 'NVIDIA A100 SXM4', vram: '80 GB', rate: 1.07, spotRate: 0.60 },
			{ gpuModel: 'NVIDIA L40S PCIe', vram: '48 GB', rate: 0.81, note: 'Range: $0.72 - $0.91' },
			{ gpuModel: 'NVIDIA RTX 4090', vram: '24 GB', rate: 0.55 }
		]
	},
	{
		id: 'upcloud',
		name: 'UpCloud',
		description: 'Helsinki-headquartered European cloud provider offering single and multi-GPU nodes mapped with dedicated resource configurations. The entire platform operates on 100% renewable energy.',
		billingUnit: 'Usage-based hourly billing',
		egress: 'Zero egress fees within generous fair usage (1 to 48 TB)',
		storageCost: '$0.12 per GB / month',
		storageRate: 0.12,
		affiliateUrl: 'https://upcloud.com',
		ctaText: 'Try UpCloud →',
		type: 'Standard',
		gpus: [
			{ gpuModel: 'NVIDIA B200', vram: '180 GB', rate: 5.20, note: 'Range: $5.16 - $5.23' },
			{ gpuModel: 'NVIDIA H100 SXM', vram: '80 GB', rate: 2.06, note: 'Range: $2.05 - $2.08' },
			{ gpuModel: 'NVIDIA L40S', vram: '48 GB', rate: 1.28, note: 'Range: $1.27 - $1.29' },
			{ gpuModel: 'NVIDIA L40S Mid', vram: '48 GB', rate: 1.43 },
			{ gpuModel: 'NVIDIA L40S High', vram: '48 GB', rate: 2.07 },
			{ gpuModel: 'NVIDIA L4', vram: '24 GB', rate: 0.66, note: 'Range: $0.66 - $0.67' }
		]
	},
	{
		id: 'acecloud',
		name: 'AceCloud',
		description: 'India-focused private cloud provider specializing in highly competitive local rates, bare-metal isolation, and bypassing complex hyperscaler management. Flat-rate billing with included 24/7 dedicated support.',
		billingUnit: 'Flat-rate hourly billing',
		egress: 'Free and unlimited network egress',
		storageCost: '$0.10 per GB / month',
		storageRate: 0.10,
		affiliateUrl: 'https://acecloudhosting.com',
		ctaText: 'Try AceCloud →',
		type: 'Standard',
		gpus: [
			{ gpuModel: 'NVIDIA H100 HGX', vram: '80 GB', rate: 3.78, note: '₹315.07/hr' },
			{ gpuModel: 'NVIDIA A100', vram: '80 GB', rate: 2.22, note: '₹184.93/hr' },
			{ gpuModel: 'NVIDIA RTX 6000 Ada', vram: '48 GB', rate: 1.01, note: '₹84.28/hr' },
			{ gpuModel: 'NVIDIA RTX A6000', vram: '48 GB', rate: 0.71, note: '₹59.08/hr' },
			{ gpuModel: 'NVIDIA A30', vram: '24 GB', rate: 0.86, note: '₹71.92/hr' },
			{ gpuModel: 'NVIDIA A2', vram: '16 GB', rate: 0.28, note: '₹23.01/hr' }
		]
	},
	{
		id: 'vastai',
		name: 'Vast.ai',
		description: 'Operates a massive global, peer-to-peer marketplace that aggregates computing units from crypto mines, independent data centers, and personal machines. Extremely cost-efficient, but does not offer standard enterprise SLAs.',
		billingUnit: 'Hourly billing dynamically adjusted on supply & demand',
		egress: 'Varies by machine and host network speed',
		storageCost: '$0.05 per GB / month (approx)',
		storageRate: 0.05,
		affiliateUrl: 'https://vast.ai?ref=giniloh',
		ctaText: 'Try Vast.ai (Best Pricing) →',
		type: 'Decentralized',
		gpus: [
			{ gpuModel: 'NVIDIA H100 SXM5', vram: '80 GB', rate: 3.20, spotRate: 1.90, note: 'Range: $2.50 - $3.89' },
			{ gpuModel: 'NVIDIA A100 80GB', vram: '80 GB', rate: 1.40, spotRate: 0.71, note: 'Range: $0.90 - $1.89' },
			{ gpuModel: 'NVIDIA L40S', vram: '48 GB', rate: 0.47, spotRate: 0.27, note: 'Range: $0.40 - $0.55' },
			{ gpuModel: 'NVIDIA RTX 4090', vram: '24 GB', rate: 0.32, spotRate: 0.13, note: 'Range: $0.20 - $0.44' },
			{ gpuModel: 'NVIDIA RTX A4000', vram: '16 GB', rate: 0.09, spotRate: 0.06, note: 'Range: $0.07 - $0.11' }
		]
	},
	{
		id: 'hyperstack',
		name: 'Hyperstack',
		description: 'European-focused, enterprise-grade GPU cloud featuring instant provisioning, per-minute billing, and clean bare-metal environments with zero configuration overhead.',
		billingUnit: 'Per-minute billing',
		egress: 'Generally zero egress fees',
		storageCost: '$0.10 per GB / month',
		storageRate: 0.10,
		affiliateUrl: 'https://hyperstack.com',
		ctaText: 'Deploy on Hyperstack →',
		type: 'Enterprise',
		gpus: [
			{ gpuModel: 'NVIDIA H200', vram: '141 GB', rate: 3.50 },
			{ gpuModel: 'NVIDIA H100 SXM5', vram: '80 GB', rate: 1.90, spotRate: 1.52 },
			{ gpuModel: 'NVIDIA H100 NVL', vram: '94 GB', rate: 1.95 },
			{ gpuModel: 'NVIDIA A100 SXM', vram: '80 GB', rate: 1.35 },
			{ gpuModel: 'NVIDIA RTX PRO 6000', vram: '96 GB', rate: 1.80 },
			{ gpuModel: 'NVIDIA L40', vram: '40 GB', rate: 1.00 },
			{ gpuModel: 'NVIDIA RTX A6000', vram: '48 GB', rate: 0.50 },
			{ gpuModel: 'NVIDIA RTX A4000', vram: '16 GB', rate: 0.15 }
		]
	},
	{
		id: 'thunder',
		name: 'Thunder Compute',
		description: 'Focuses on direct VS Code SSH execution, live hardware swaps, and persistent workspaces, catering to ML engineers looking for simple, low-cost developer boxes with one-click single GPU access.',
		billingUnit: 'Per-minute billing with persistent storage volumes',
		egress: 'Included network egress',
		storageCost: '$0.15 per GB / month',
		storageRate: 0.15,
		affiliateUrl: 'https://thundercompute.com',
		ctaText: 'Start on Thunder Compute →',
		type: 'Standard',
		gpus: [
			{ gpuModel: 'NVIDIA H100 SXM', vram: '80 GB', rate: 1.38, note: 'Neocloud floor' },
			{ gpuModel: 'NVIDIA A100', vram: '80 GB', rate: 0.78, note: 'Or $0.66/hr floor' },
			{ gpuModel: 'NVIDIA RTX A6000', vram: '48 GB', rate: 0.35 }
		]
	},
	{
		id: 'coreweave',
		name: 'CoreWeave',
		description: 'Highly specialized AI hyperscaler, backing massive multi-node training workflows and VFX pipelines. Billed per-second. Capacity is primarily sold in 8-GPU node increments or contracted clusters.',
		billingUnit: 'Per-second billing',
		egress: 'Zero egress or request fees',
		storageCost: '$0.07 to $0.11 per GB / month',
		storageRate: 0.09,
		affiliateUrl: 'https://coreweave.com',
		ctaText: 'Scale on CoreWeave →',
		type: 'Enterprise',
		gpus: [
			{ gpuModel: 'NVIDIA GB200', vram: '384 GB', rate: 10.50, note: '4x HGX Node' },
			{ gpuModel: 'NVIDIA B200', vram: '192 GB', rate: 8.60, note: '8x HGX Node ($68.80/hr)' },
			{ gpuModel: 'NVIDIA GH200', vram: '96 GB', rate: 6.50, note: 'Standalone VM' },
			{ gpuModel: 'NVIDIA H200 SXM', vram: '141 GB', rate: 6.31, note: '8x HGX Node ($50.44/hr)' },
			{ gpuModel: 'NVIDIA H100 SXM5', vram: '80 GB', rate: 6.16, note: 'Committed: $2.44' },
			{ gpuModel: 'NVIDIA A100 SXM', vram: '80 GB', rate: 2.70, note: 'Committed: $1.19' },
			{ gpuModel: 'NVIDIA L40S', vram: '48 GB', rate: 2.25, note: '8x Node ($18.00/hr)' },
			{ gpuModel: 'NVIDIA L40', vram: '40 GB', rate: 1.25, note: '8x Node ($10.00/hr)' }
		]
	},
	{
		id: 'gmicloud',
		name: 'GMI Cloud',
		description: 'Operates isolated, private GPU environments that eliminate hypervisor overhead, leading to lower per-token costs. Flat-rate pricing with dedicated clusters.',
		billingUnit: 'Flat-rate pricing model',
		egress: 'Dedicated network connection',
		storageCost: '$0.10 per GB / month',
		storageRate: 0.10,
		affiliateUrl: 'https://gmicloud.ai',
		ctaText: 'Deploy on GMI Cloud →',
		type: 'Enterprise',
		gpus: [
			{ gpuModel: 'NVIDIA H200 SXM', vram: '141 GB', rate: 2.55, note: 'Range: $2.50 - $2.60' },
			{ gpuModel: 'NVIDIA H100 SXM', vram: '80 GB', rate: 2.00, note: 'HGX dedicated clusters' },
			{ gpuModel: 'NVIDIA B200', vram: '180 GB', rate: 4.00 },
			{ gpuModel: 'NVIDIA GB200', vram: '384 GB', rate: 8.00 }
		]
	},
	{
		id: 'jarvislabs',
		name: 'JarvisLabs',
		description: 'Targets developers needing sub-90-second startups, persistent notebooks, and transparent billing. User-friendly and very responsive.',
		billingUnit: 'Hourly billing with transparent dashboard',
		egress: 'Zero egress fees',
		storageCost: '$0.10 per GB / month',
		storageRate: 0.10,
		affiliateUrl: 'https://jarvislabs.ai',
		ctaText: 'Start on JarvisLabs →',
		type: 'Standard',
		gpus: [
			{ gpuModel: 'NVIDIA H200', vram: '141 GB', rate: 3.80 },
			{ gpuModel: 'NVIDIA H100 SXM', vram: '80 GB', rate: 2.69 },
			{ gpuModel: 'NVIDIA A100 (80GB)', vram: '80 GB', rate: 1.49 },
			{ gpuModel: 'NVIDIA RTX 6000 Ada', vram: '48 GB', rate: 0.99 },
			{ gpuModel: 'NVIDIA RTX 3090', vram: '24 GB', rate: 0.29 }
		]
	}
];

const PRESET_FLAT_LIST = CLOUD_PROVIDERS_EXPLORER.flatMap(provider =>
	provider.gpus.map(gpu => ({
		id: `${provider.id}-${gpu.gpuModel.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
		providerId: provider.id,
		providerName: provider.name,
		gpuModel: gpu.gpuModel,
		vram: gpu.vram,
		rate: gpu.rate,
		storageRate: provider.storageRate,
		affiliateUrl: provider.affiliateUrl,
		ctaText: provider.ctaText
	}))
);

// ----------------------------------------------------
// UI Custom Components
// ----------------------------------------------------

interface SliderProps {
	min: number;
	max: number;
	step?: number;
	value: number;
	onChange: (v: number) => void;
}

function CustomSlider({ min, max, step = 1, value, onChange }: SliderProps) {
	const pct = ((value - min) / (max - min)) * 100;
	return (
		<div className="relative w-full flex items-center h-6 group select-none">
			{/* Background Track */}
			<div className="absolute left-0 right-0 h-2 bg-[#E5E5E5] rounded-full pointer-events-none" />
			{/* Active Fill Track */}
			<div 
				className="absolute left-0 h-2 bg-cyan-500 rounded-full pointer-events-none" 
				style={{ width: `${pct}%` }}
			/>
			{/* Native Invisible Range Input */}
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => onChange(Number(e.target.value))}
				className="relative w-full h-6 bg-transparent appearance-none cursor-pointer focus:outline-none z-10
					[&::-webkit-slider-runnable-track]:bg-transparent
					[&::-webkit-slider-thumb]:appearance-none
					[&::-webkit-slider-thumb]:w-5
					[&::-webkit-slider-thumb]:h-5
					[&::-webkit-slider-thumb]:bg-white
					[&::-webkit-slider-thumb]:border-2
					[&::-webkit-slider-thumb]:border-cyan-500
					[&::-webkit-slider-thumb]:rounded-full
					[&::-webkit-slider-thumb]:cursor-pointer
					[&::-webkit-slider-thumb]:transition-transform
					[&::-webkit-slider-thumb]:duration-150
					[&::-webkit-slider-thumb]:hover:scale-110
					[&::-moz-range-track]:bg-transparent
					[&::-moz-range-thumb]:w-5
					[&::-moz-range-thumb]:h-5
					[&::-moz-range-thumb]:bg-white
					[&::-moz-range-thumb]:border-2
					[&::-moz-range-thumb]:border-cyan-500
					[&::-moz-range-thumb]:rounded-full
					[&::-moz-range-thumb]:cursor-pointer
					[&::-moz-range-thumb]:transition-transform
					[&::-moz-range-thumb]:duration-150
					[&::-moz-range-thumb]:hover:scale-110"
			/>
		</div>
	);
}

interface InteractiveBadgeProps {
	value: number;
	min: number;
	max: number;
	step?: number;
	unit?: string;
	prefix?: string;
	onChange: (v: number) => void;
}

function InteractiveBadge({ value, min, max, step = 1, unit, prefix, onChange }: InteractiveBadgeProps) {
	const [inputValue, setInputValue] = useState(value.toString());

	useEffect(() => {
		setInputValue(value.toString());
	}, [value]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setInputValue(e.target.value);
		const parsed = Number(e.target.value);
		if (!isNaN(parsed) && parsed >= min && parsed <= max) {
			onChange(parsed);
		}
	};

	const handleBlur = () => {
		let parsed = Number(inputValue);
		if (isNaN(parsed)) {
			parsed = min;
		}
		const clamped = Math.min(max, Math.max(min, parsed));
		const rounded = Math.round(clamped / step) * step;
		const finalVal = Number(rounded.toFixed(4));
		onChange(finalVal);
		setInputValue(finalVal.toString());
	};

	return (
		<div className="flex items-center gap-1 bg-white rounded-md px-2.5 py-1 border border-gray-200 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500 transition-all shrink-0">
			{prefix && <span className="text-xs text-gray-400 font-mono font-bold">{prefix}</span>}
			<input
				type="number"
				min={min}
				max={max}
				step={step}
				value={inputValue}
				onChange={handleInputChange}
				onBlur={handleBlur}
				className="w-14 bg-transparent text-right font-mono text-sm font-bold text-cyan-600 focus:outline-none border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
			/>
			{unit && <span className="text-xs text-gray-400 font-mono font-bold uppercase">{unit}</span>}
		</div>
	);
}

interface AnimatedCounterProps {
	value: number;
	formatter: (val: number) => string;
}

function AnimatedCounter({ value, formatter }: AnimatedCounterProps) {
	const ref = useRef<HTMLSpanElement>(null);
	const motionValue = useMotionValue(value);
	const formatterRef = useRef(formatter);

	useEffect(() => {
		formatterRef.current = formatter;
	}, [formatter]);

	useEffect(() => {
		const controls = animate(motionValue, value, {
			duration: 0.5,
			ease: "easeOut"
		});
		return () => controls.stop();
	}, [value, motionValue]);

	useEffect(() => {
		return motionValue.on("change", (latest) => {
			if (ref.current) {
				ref.current.textContent = formatterRef.current(latest);
			}
		});
	}, [motionValue]);

	return <span ref={ref} className="font-mono">{formatter(value)}</span>;
}

// ----------------------------------------------------
// Main Calculator Component
// ----------------------------------------------------

export default function LocalVsCloudGpuCalculator() {
	// 1. Usage Pattern States (Sliders)
	const [hoursPerDay, setHoursPerDay] = useState<number>(6);
	const [daysPerMonth, setDaysPerMonth] = useState<number>(18);
	const [timePeriodMonths, setTimePeriodMonths] = useState<number>(36);
	const [electricityRate, setElectricityRate] = useState<number>(0.12);
	const [storageSizeGb, setStorageSizeGb] = useState<number>(100);
	const [systemCost, setSystemCost] = useState<number>(1000);

	// Multi-GPU, Resale Value & Cost of Capital States
	const [cloudGpuCount, setCloudGpuCount] = useState<number>(1);
	const [resalePercent, setResalePercent] = useState<number>(20); // 20% after 3 years
	const [costOfCapitalPercent, setCostOfCapitalPercent] = useState<number>(5); // 5% annual opportunity cost of capital

	// 2. Selection States
	const [selectedGpuId, setSelectedGpuId] = useState<string>('rtx-pro-6000-blackwell');
	const [selectedProviderId, setSelectedProviderId] = useState<string>('hyperstack-nvidia-rtx-pro-6000');

	// Auto-adjust system cost based on turnkey hardware selection
	useEffect(() => {
		const selectedOption = GPU_MODELS.find(g => g.id === selectedGpuId);
		if (selectedOption) {
			if (selectedOption.isTurnKey) {
				setSystemCost(0);
			} else if (systemCost === 0) {
				setSystemCost(1000); // Default DIY system components cost
			}
		}
	}, [selectedGpuId]);

	// Find active items
	const activeGpu = useMemo(() => GPU_MODELS.find(g => g.id === selectedGpuId) || GPU_MODELS[0], [selectedGpuId]);
	const activeProvider = useMemo(() => PRESET_FLAT_LIST.find(p => p.id === selectedProviderId) || PRESET_FLAT_LIST[0], [selectedProviderId]);

	// Quick Preset Handler
	const applyPreset = (presetKey: 'blackwell-vs-cloud-96' | 'blackwell-vs-2x-ada') => {
		if (presetKey === 'blackwell-vs-cloud-96') {
			setSelectedGpuId('rtx-pro-6000-blackwell');
			const pro6000Preset = PRESET_FLAT_LIST.find(p => p.gpuModel.includes('PRO 6000') || p.gpuModel.includes('6000')) || PRESET_FLAT_LIST[0];
			setSelectedProviderId(pro6000Preset.id);
			setCloudGpuCount(1);
		} else if (presetKey === 'blackwell-vs-2x-ada') {
			setSelectedGpuId('rtx-pro-6000-blackwell');
			const adaPreset = PRESET_FLAT_LIST.find(p => p.gpuModel.includes('6000 Ada') || p.gpuModel.includes('RTX 6000')) || PRESET_FLAT_LIST[0];
			setSelectedProviderId(adaPreset.id);
			setCloudGpuCount(2); // Renting 2x RTX 6000 Ada (48GB x 2 = 96GB)
		}
	};

	// 3. Mathematical Calculations
	const calculations = useMemo(() => {
		const monthlyHours = hoursPerDay * daysPerMonth;
		const totalHours = monthlyHours * timePeriodMonths;

		// Local Cost Calculations
		const hardwareCost = activeGpu.cost + systemCost;
		const totalPowerDrawKw = (activeGpu.tdp + 250) / 1000; // 250W base system draw
		const electricityCost = totalHours * totalPowerDrawKw * electricityRate;
		const maintenanceCost = hardwareCost * 0.05 * (timePeriodMonths / 12); // 5% maintenance budget per year
		
		// Cost of Capital / Opportunity Cost of Upfront CapEx
		const opportunityCost = hardwareCost * (costOfCapitalPercent / 100) * (timePeriodMonths / 12);

		const grossLocalTco = hardwareCost + electricityCost + maintenanceCost + opportunityCost;

		// Resale Value (Salvage Credit)
		const resaleValue = activeGpu.cost * (resalePercent / 100);
		const netLocalTco = Math.max(0, grossLocalTco - resaleValue);
		const localCostPerHour = totalHours > 0 ? netLocalTco / totalHours : 0;

		// Cloud Cost Calculations (scaled by cloudGpuCount)
		const effectiveCloudRate = activeProvider.rate * cloudGpuCount;
		const cloudUsageCost = totalHours * effectiveCloudRate;
		const cloudStorageCost = storageSizeGb * activeProvider.storageRate * timePeriodMonths;
		
		const cloudTco = cloudUsageCost + cloudStorageCost;
		const cloudCostPerHour = totalHours > 0 ? cloudTco / totalHours : 0;

		// Monthly rates for time series & break-even calculation (power + maint + opportunity cost)
		const monthlyLocalPowerAndMaint = (monthlyHours * totalPowerDrawKw * electricityRate) + (hardwareCost * 0.05 / 12) + (hardwareCost * (costOfCapitalPercent / 100) / 12);
		const monthlyCloudTotal = (monthlyHours * effectiveCloudRate) + (storageSizeGb * activeProvider.storageRate);

		// Search for Break-Even month up to 84 months (7 years)
		let breakEvenMonthFound = Infinity;
		const maxSearchMonths = 84;

		for (let m = 0; m <= maxSearchMonths; m++) {
			const cumGrossLocal = hardwareCost + (monthlyLocalPowerAndMaint * m);
			// Resale credit offset applies at Month 36 (end of 3-year term)
			const cumResaleCredit = m >= 36 ? resaleValue : 0;
			const cumNetLocal = Math.max(0, cumGrossLocal - cumResaleCredit);
			const cumCloud = m * monthlyCloudTotal;

			if (m > 0 && cumCloud >= cumNetLocal && breakEvenMonthFound === Infinity) {
				breakEvenMonthFound = m;
			}
		}

		// Dynamically scale chart timeline to display the intersection point if found within 7 years
		let chartMaxMonths = Math.max(timePeriodMonths, 36);
		if (Number.isFinite(breakEvenMonthFound)) {
			chartMaxMonths = Math.max(chartMaxMonths, Math.min(84, Math.ceil(breakEvenMonthFound * 1.1)));
		}

		// Build monthly data series for chart
		const monthlyData = [];
		for (let m = 0; m <= chartMaxMonths; m++) {
			const cumGrossLocal = hardwareCost + (monthlyLocalPowerAndMaint * m);
			const cumResaleCredit = m >= 36 ? resaleValue : 0;
			const cumNetLocal = Math.max(0, cumGrossLocal - cumResaleCredit);
			const cumCloud = m * monthlyCloudTotal;

			monthlyData.push({
				month: m,
				grossLocal: cumGrossLocal,
				netLocal: cumNetLocal,
				cloud: cumCloud,
				resaleCredit: cumResaleCredit
			});
		}

		// Savings & TCO Comparison
		const localWins = netLocalTco < cloudTco;
		const netSavings = Math.abs(cloudTco - netLocalTco);
		const monthlyDifference = netSavings / timePeriodMonths;

		return {
			monthlyHours,
			totalHours,
			hardwareCost,
			electricityCost,
			maintenanceCost,
			opportunityCost,
			grossLocalTco,
			resaleValue,
			netLocalTco,
			localCostPerHour,
			effectiveCloudRate,
			cloudUsageCost,
			cloudStorageCost,
			cloudTco,
			cloudCostPerHour,
			localWins,
			netSavings,
			monthlyDifference,
			breakEvenMonths: breakEvenMonthFound === Infinity ? Infinity : breakEvenMonthFound,
			monthlyData,
			chartMaxMonths
		};
	}, [hoursPerDay, daysPerMonth, timePeriodMonths, electricityRate, storageSizeGb, systemCost, activeGpu, activeProvider, cloudGpuCount, resalePercent, costOfCapitalPercent]);

	return (
		<>
			{/* Preset Comparison Banner */}
			<div className="mb-8 bg-white border border-cyan-200 rounded-xl p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
				<div>
					<div className="flex items-center gap-2.5">
						<span className="text-xl">⚡</span>
						<h3 className="text-lg font-bold text-[#1A1A1A]">Compare Blackwell 96GB vs Cloud Renting Options</h3>
					</div>
					<p className="text-sm text-[#5E5E5E] font-medium mt-1.5 leading-relaxed">Quick-load 1x RTX Pro 6000 Blackwell (96GB) against 1x 96GB Cloud GPU or 2x RTX 6000 Ada (48GB x 2 = 96GB pooled).</p>
				</div>
				<div className="flex flex-wrap gap-3 w-full lg:w-auto shrink-0">
					<button
						type="button"
						onClick={() => applyPreset('blackwell-vs-cloud-96')}
						className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-cyan-500 text-white hover:bg-cyan-600 transition shadow-sm cursor-pointer"
					>
						1x Blackwell (96GB) vs 1x Cloud (96GB)
					</button>
					<button
						type="button"
						onClick={() => applyPreset('blackwell-vs-2x-ada')}
						className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-purple-600 text-white hover:bg-purple-700 transition shadow-sm cursor-pointer"
					>
						1x Blackwell vs 2x RTX 6000 Ada
					</button>
				</div>
			</div>

			{/* Active Comparison Status Bar */}
			<div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<span className="flex h-2.5 w-2.5 rounded-full bg-cyan-500 animate-pulse" />
					<span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400">Comparing:</span>
					<span className="text-sm font-extrabold text-[#1A1A1A]">
						🏠 Local {activeGpu.name.split(' - ')[0]} ({activeGpu.vram})
					</span>
					<span className="text-xs text-gray-400 font-mono">vs</span>
					<span className="text-sm font-extrabold text-cyan-600">
						☁️ Cloud {cloudGpuCount}x {activeProvider.providerName} {activeProvider.gpuModel} ({activeProvider.vram})
					</span>
				</div>
				<div className="text-xs font-mono bg-cyan-100 text-cyan-800 px-2.5 py-1 rounded-md font-bold uppercase">
					Active Cloud Option: {activeProvider.providerName}
				</div>
			</div>

			<div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
				{/* Left Column: User Controls & Sliders */}
				<div className="space-y-6">
					{/* Usage Pattern Card */}
					<div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-6">
						<div className="flex items-center gap-2.5">
							<span className="text-2xl">⚙️</span>
							<h3 className="text-xl font-bold text-[#1A1A1A]">Your Usage Pattern</h3>
						</div>

						{/* Hours per Day Slider */}
						<div className="space-y-2">
							<div className="flex justify-between items-center text-sm font-bold text-[#5E5E5E]">
								<span>Hours per Day</span>
								<InteractiveBadge
									value={hoursPerDay}
									min={1}
									max={24}
									step={1}
									unit="hrs"
									onChange={setHoursPerDay}
								/>
							</div>
							<CustomSlider
								min={1}
								max={24}
								step={1}
								value={hoursPerDay}
								onChange={setHoursPerDay}
							/>
							<div className="flex justify-between text-xs font-semibold text-[#8C8C8C] font-mono">
								<span>1 hour</span>
								<span>24 hours</span>
							</div>
						</div>

						{/* Days per Month Slider */}
						<div className="space-y-2">
							<div className="flex justify-between items-center text-sm font-bold text-[#5E5E5E]">
								<span>Days per Month</span>
								<InteractiveBadge
									value={daysPerMonth}
									min={1}
									max={30}
									step={1}
									unit="days"
									onChange={setDaysPerMonth}
								/>
							</div>
							<CustomSlider
								min={1}
								max={30}
								step={1}
								value={daysPerMonth}
								onChange={setDaysPerMonth}
							/>
							<div className="flex justify-between text-xs font-semibold text-[#8C8C8C] font-mono">
								<span>1 day</span>
								<span>30 days</span>
							</div>
						</div>

						{/* Evaluation Horizon Slider */}
						<div className="space-y-2">
							<div className="flex justify-between items-center text-sm font-bold text-[#5E5E5E]">
								<div className="flex items-center gap-2">
									<span>Evaluation Horizon</span>
									<span className="text-xs text-cyan-600 font-mono font-bold bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200">
										{(timePeriodMonths / 12).toFixed(1)} yrs
									</span>
								</div>
								<InteractiveBadge
									value={timePeriodMonths}
									min={1}
									max={84}
									step={1}
									unit="mo"
									onChange={setTimePeriodMonths}
								/>
							</div>

							{/* Quick Horizon Presets */}
							<div className="flex gap-2 flex-wrap pt-1">
								{[
									{ label: '1 Yr', months: 12 },
									{ label: '3 Yrs', months: 36 },
									{ label: '5 Yrs', months: 60 },
									{ label: '7 Yrs', months: 84 }
								].map((horizon) => (
									<button
										key={horizon.months}
										type="button"
										onClick={() => setTimePeriodMonths(horizon.months)}
										className={`px-3 py-1.5 rounded-lg text-xs font-mono font-extrabold transition cursor-pointer ${
											timePeriodMonths === horizon.months
												? 'bg-cyan-500 text-white shadow-sm'
												: 'bg-white border border-gray-250 text-[#5E5E5E] hover:text-[#1A1A1A] hover:border-gray-400'
										}`}
									>
										{horizon.label}
									</button>
								))}
							</div>

							<CustomSlider
								min={1}
								max={84}
								step={1}
								value={timePeriodMonths}
								onChange={setTimePeriodMonths}
							/>
							<div className="flex justify-between text-xs font-semibold text-[#8C8C8C] font-mono">
								<span>1 mo</span>
								<span>36 mo (3 yrs)</span>
								<span>60 mo (5 yrs)</span>
								<span>84 mo (7 yrs)</span>
							</div>
						</div>

						{/* Computed Monthly Hours Summary */}
						<div className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-4">
							<p className="font-mono text-xs uppercase tracking-wider font-bold text-[#8C8C8C]">Monthly Usage</p>
							<p className="text-2xl font-black text-cyan-700 mt-1 font-mono">
								<AnimatedCounter value={calculations.monthlyHours} formatter={(v) => `${Math.round(v)} hours`} />
							</p>
						</div>
					</div>

					{/* Select GPU Card */}
					<div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-6">
						<div className="flex items-center gap-2.5">
							<span className="text-2xl">🎮</span>
							<h3 className="text-xl font-bold text-[#1A1A1A]">Select Local GPU</h3>
						</div>

						<div>
							<label htmlFor="gpu-select" className="sr-only">GPU Model Option</label>
							<select
								id="gpu-select"
								value={selectedGpuId}
								onChange={(e) => setSelectedGpuId(e.target.value)}
								className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-[#1A1A1A] outline-none focus:border-cyan-500 cursor-pointer"
							>
								<optgroup label="Tier 1: Apple Silicon (Unified Memory)">
									{GPU_MODELS.filter(g => g.tier === 'Apple Silicon').map(g => (
										<option key={g.id} value={g.id}>{g.name}</option>
									))}
								</optgroup>
								<optgroup label="Tier 2: AMD Mini PCs (Budget Always-On)">
									{GPU_MODELS.filter(g => g.tier === 'AMD Mini PC').map(g => (
										<option key={g.id} value={g.id}>{g.name}</option>
									))}
								</optgroup>
								<optgroup label="Tier 3: Professional CUDA Workstations">
									{GPU_MODELS.filter(g => g.tier === 'NVIDIA CUDA Workstation').map(g => (
										<option key={g.id} value={g.id}>{g.name}</option>
									))}
								</optgroup>
								<optgroup label="Tier 4: Consumer & Used NVIDIA GPUs">
									{GPU_MODELS.filter(g => g.tier === 'NVIDIA CUDA GPU').map(g => (
										<option key={g.id} value={g.id}>{g.name}</option>
									))}
								</optgroup>
								<optgroup label="Tier 5: Enterprise AI Workstations & Servers">
									{GPU_MODELS.filter(g => g.tier === 'Enterprise AI Hardware').map(g => (
										<option key={g.id} value={g.id}>{g.name}</option>
									))}
								</optgroup>
							</select>
						</div>

						{/* GPU Metric displays */}
						<div className="grid grid-cols-2 gap-4">
							<div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
								<p className="text-xs font-semibold text-[#8C8C8C]">Hardware Cost</p>
								<p className="text-lg font-black text-emerald-600 mt-1 font-mono">{formatCurrency(activeGpu.cost)}</p>
							</div>
							<div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
								<p className="text-xs font-semibold text-[#8C8C8C]">Power Draw (TDP)</p>
								<p className="text-lg font-black text-amber-600 mt-1 font-mono">{activeGpu.tdp}W</p>
							</div>
						</div>

						{/* Sub card: 3-Year Resale Value % Slider */}
						<div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 space-y-3">
							<div className="flex justify-between items-center text-sm font-bold text-[#5E5E5E]">
								<span>3-Year Hardware Resale Value (%)</span>
								<InteractiveBadge
									value={resalePercent}
									min={0}
									max={50}
									step={5}
									unit="%"
									onChange={setResalePercent}
								/>
							</div>
							<CustomSlider
								min={0}
								max={50}
								step={5}
								value={resalePercent}
								onChange={setResalePercent}
							/>
							<div className="flex justify-between text-xs font-semibold text-[#8C8C8C] font-mono">
								<span>0% (Full loss)</span>
								<span>20% (Default)</span>
								<span>50% (High return)</span>
							</div>
							<p className="text-xs font-semibold text-emerald-700 font-mono mt-1 pt-1 border-t border-gray-100">
								Estimated Salvage Recovery: {formatCurrency(calculations.resaleValue)} after 36 months
							</p>
						</div>

						{/* Sub card: Annual Cost of Capital / Opportunity Cost (%) Slider */}
						<div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 space-y-3">
							<div className="flex justify-between items-center text-sm font-bold text-[#5E5E5E]">
								<span>Cost of Capital / Interest Rate (%/yr)</span>
								<InteractiveBadge
									value={costOfCapitalPercent}
									min={0}
									max={15}
									step={0.5}
									unit="%"
									onChange={setCostOfCapitalPercent}
								/>
							</div>
							<CustomSlider
								min={0}
								max={15}
								step={0.5}
								value={costOfCapitalPercent}
								onChange={setCostOfCapitalPercent}
							/>
							<div className="flex justify-between text-xs font-semibold text-[#8C8C8C] font-mono">
								<span>0% (Cash/Zero cost)</span>
								<span>5% (Treasury Yield)</span>
								<span>15% (High Debt/WACC)</span>
							</div>
							<p className="text-xs font-semibold text-amber-700 font-mono mt-1 pt-1 border-t border-gray-100">
								Opportunity Cost of Locked CapEx: +{formatCurrency(calculations.opportunityCost)} over {timePeriodMonths} mo
							</p>
						</div>

						{/* Sub card: System components price slider */}
						<div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 space-y-3">
							<div className="flex justify-between items-center text-sm font-bold text-[#5E5E5E]">
								<span>System components (CPU, RAM, Motherboard, etc.)</span>
								<InteractiveBadge
									value={systemCost}
									min={0}
									max={5000}
									step={50}
									prefix="$"
									onChange={setSystemCost}
								/>
							</div>
							<CustomSlider
								min={0}
								max={5000}
								step={50}
								value={systemCost}
								onChange={setSystemCost}
							/>
							<div className="flex justify-between text-xs font-semibold text-[#8C8C8C] font-mono">
								<span>$0</span>
								<span>$5,000</span>
							</div>
						</div>

						{/* Sub card: Electricity Rate Slider */}
						<div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 space-y-3">
							<div className="flex justify-between items-center text-sm font-bold text-[#5E5E5E]">
								<span>Local Electricity Rate</span>
								<InteractiveBadge
									value={electricityRate}
									min={0.05}
									max={0.60}
									step={0.01}
									prefix="$"
									unit="/kWh"
									onChange={setElectricityRate}
								/>
							</div>
							<CustomSlider
								min={0.05}
								max={0.60}
								step={0.01}
								value={electricityRate}
								onChange={setElectricityRate}
							/>
							<div className="flex justify-between text-xs font-semibold text-[#8C8C8C] font-mono">
								<span>$0.05/kWh</span>
								<span>$0.60/kWh</span>
							</div>
						</div>
					</div>

					{/* Select Cloud Provider Card */}
					<div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-6">
						<div className="flex items-center gap-2.5">
							<span className="text-2xl">☁️</span>
							<h3 className="text-xl font-bold text-[#1A1A1A]">Select Cloud Provider & GPU</h3>
						</div>

						<div>
							<label htmlFor="cloud-provider-select" className="sr-only">Compare Cloud Provider & GPU</label>
							<select
								id="cloud-provider-select"
								value={selectedProviderId}
								onChange={(e) => setSelectedProviderId(e.target.value)}
								className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-[#1A1A1A] outline-none focus:border-cyan-500 cursor-pointer"
							>
								{CLOUD_PROVIDERS_EXPLORER.map(provider => (
									<optgroup key={provider.id} label={provider.name}>
										{provider.gpus.map((gpu) => {
											const presetId = `${provider.id}-${gpu.gpuModel.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
											return (
												<option key={presetId} value={presetId}>
													{gpu.gpuModel} ({gpu.vram}) — ${gpu.rate.toFixed(2)}/hr
												</option>
											);
										})}
									</optgroup>
								))}
							</select>
						</div>

						{/* Multi-GPU Cloud Quantity Selector & Storage size slider */}
						<div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 space-y-5">
							<div className="space-y-2">
								<div className="flex justify-between items-center text-sm font-bold text-[#5E5E5E]">
									<span>Number of Cloud GPUs to Rent</span>
									<div className="flex gap-2">
										{[1, 2, 4, 8].map((qty) => (
											<button
												key={qty}
												type="button"
												onClick={() => setCloudGpuCount(qty)}
												className={`px-3 py-1 rounded-lg text-xs font-mono font-extrabold transition cursor-pointer ${
													cloudGpuCount === qty
														? 'bg-cyan-500 text-white shadow-sm'
														: 'bg-white border border-gray-250 text-[#5E5E5E] hover:text-[#1A1A1A]'
												}`}
											>
												{qty}x
											</button>
										))}
									</div>
								</div>
								<p className="text-xs font-semibold text-cyan-700 font-mono">
									Effective Hourly Rate: {cloudGpuCount}x @ ${activeProvider.rate.toFixed(2)} = ${calculations.effectiveCloudRate.toFixed(2)}/hr
								</p>
							</div>

							<div className="border-t border-gray-100 pt-4 space-y-3">
								<div className="flex justify-between items-center text-sm font-bold text-[#5E5E5E]">
									<span>Cloud Storage Size</span>
									<InteractiveBadge
										value={storageSizeGb}
										min={10}
										max={1200}
										step={10}
										unit="GB"
										onChange={setStorageSizeGb}
									/>
								</div>
								<CustomSlider
									min={10}
									max={1200}
									step={10}
									value={storageSizeGb}
									onChange={setStorageSizeGb}
								/>
								<div className="flex justify-between text-xs font-semibold text-[#8C8C8C] font-mono">
									<span>10 GB</span>
									<span>1,200 GB</span>
								</div>
							</div>
						</div>

						<div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
							<div className="flex justify-between text-sm">
								<span className="font-semibold text-[#8C8C8C]">Provider:</span>
								<span className="font-bold text-[#1A1A1A]">{activeProvider.providerName}</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="font-semibold text-[#8C8C8C]">Billing Model:</span>
								<span className="font-bold text-slate-800">
									{CLOUD_PROVIDERS_EXPLORER.find(p => p.id === activeProvider.providerId)?.billingUnit}
								</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="font-semibold text-[#8C8C8C]">Network Egress:</span>
								<span className="font-bold text-emerald-600">
									{CLOUD_PROVIDERS_EXPLORER.find(p => p.id === activeProvider.providerId)?.egress}
								</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="font-semibold text-[#8C8C8C]">Storage rate:</span>
								<span className="font-bold text-cyan-600 font-mono">
									${activeProvider.storageRate.toFixed(2)}/GB/mo
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Right Column: Output / Verdict Panels */}
				<div className="space-y-6">
					{/* Cost Analysis Card Styled like a Digital Receipt */}
					<div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-6 relative overflow-hidden shadow-sm">
						{/* Receipt Header */}
						<div className="text-center pb-4 border-b border-dashed border-slate-250">
							<h3 className="text-lg font-black text-[#1A1A1A] tracking-wider uppercase">GPU TCO RECEIPT</h3>
							<p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mt-1">Cost Analysis Breakdown</p>
							<div className="mt-2 text-xs font-extrabold text-cyan-650 text-cyan-600 uppercase tracking-wider">
								Comparing Local vs {activeProvider.providerName}
							</div>
						</div>

						{/* Local Hardware Breakdown */}
						<div className="space-y-3.5 pb-6 border-b border-dashed border-slate-250">
							<p className="text-xs font-mono font-bold text-[#8C8C8C] uppercase tracking-[0.2em]">LOCAL HARDWARE (1x {activeGpu.vram})</p>
							
							<div className="flex justify-between items-center text-sm text-[#5E5E5E]">
								<div className="flex items-center gap-2">
									<Cpu className="w-4 h-4 text-[#5A7A8F] shrink-0" strokeWidth={1.5} />
									<span>GPU Cost:</span>
								</div>
								<span className="font-mono font-bold text-[#1A1A1A]">{formatCurrency(activeGpu.cost)}</span>
							</div>
							
							<div className="flex justify-between items-center text-sm text-[#5E5E5E]">
								<div className="flex items-center gap-2">
									<Server className="w-4 h-4 text-[#5A7A8F] shrink-0" strokeWidth={1.5} />
									<span>System components:</span>
								</div>
								<span className="font-mono font-bold text-[#1A1A1A]">{formatCurrency(systemCost)}</span>
							</div>
							
							<div className="flex justify-between items-center text-sm text-[#5E5E5E]">
								<div className="flex items-center gap-2">
									<Zap className="w-4 h-4 text-[#5A7A8F] shrink-0" strokeWidth={1.5} />
									<span>Electricity ({timePeriodMonths} mo):</span>
								</div>
								<span className="font-mono font-bold text-[#1A1A1A]">{formatCurrency(calculations.electricityCost)}</span>
							</div>
							
							<div className="flex justify-between items-center text-sm text-[#5E5E5E]">
								<div className="flex items-center gap-2">
									<Wrench className="w-4 h-4 text-[#5A7A8F] shrink-0" strokeWidth={1.5} />
									<span>Maintenance budget:</span>
								</div>
								<span className="font-mono font-bold text-[#1A1A1A]">{formatCurrency(calculations.maintenanceCost)}</span>
							</div>

							{costOfCapitalPercent > 0 && (
								<div className="flex justify-between items-center text-sm text-amber-700 font-medium">
									<div className="flex items-center gap-2">
										<Coins className="w-4 h-4 text-[#C88D4E] shrink-0" strokeWidth={1.5} />
										<span>Cost of Capital ({costOfCapitalPercent}%/yr):</span>
									</div>
									<span className="font-mono font-bold">+{formatCurrency(calculations.opportunityCost)}</span>
								</div>
							)}

							<div className="flex justify-between items-center text-sm text-emerald-700 font-medium">
								<div className="flex items-center gap-2">
									<Tag className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={1.5} />
									<span>Less {timePeriodMonths >= 36 ? '3-Yr' : 'Est.'} Resale ({resalePercent}%):</span>
								</div>
								<span className="font-mono font-bold">-{formatCurrency(calculations.resaleValue)}</span>
							</div>

							<div className="flex justify-between items-center text-md font-extrabold text-[#1A1A1A] pt-4 border-t border-slate-200">
								<div className="flex items-center gap-2">
									<DollarSign className="w-4.5 h-4.5 text-[#1A1A1A] shrink-0" strokeWidth={1.5} />
									<span>Net Local TCO:</span>
								</div>
								<span className="text-xl sm:text-2xl text-emerald-600 font-mono font-black">
									<AnimatedCounter value={calculations.netLocalTco} formatter={formatCurrency} />
								</span>
							</div>
							
							<div className="flex justify-between text-xs text-[#8C8C8C] font-mono pl-6">
								<span>Cost per Hour:</span>
								<span className="text-emerald-600 font-bold">${calculations.localCostPerHour.toFixed(3)}/hr</span>
							</div>
						</div>

						{/* Cloud GPU Breakdown */}
						<div className="space-y-3.5 pt-2">
							<p className="text-xs font-mono font-bold text-[#8C8C8C] uppercase tracking-[0.2em]">{activeProvider.providerName} ({cloudGpuCount}x {activeProvider.gpuModel})</p>
							
							<div className="flex justify-between items-center text-sm text-[#5E5E5E]">
								<div className="flex items-center gap-2">
									<Cloud className="w-4 h-4 text-[#5A7A8F] shrink-0" strokeWidth={1.5} />
									<span>Usage ({cloudGpuCount}x @ ${activeProvider.rate}/hr):</span>
								</div>
								<span className="font-mono font-bold text-[#1A1A1A]">{formatCurrency(calculations.cloudUsageCost)}</span>
							</div>

							<div className="flex justify-between items-center text-sm text-[#5E5E5E]">
								<div className="flex items-center gap-2">
									<Database className="w-4 h-4 text-[#5A7A8F] shrink-0" strokeWidth={1.5} />
									<span>Storage ({timePeriodMonths} mo):</span>
								</div>
								<span className="font-mono font-bold text-[#1A1A1A]">{formatCurrency(calculations.cloudStorageCost)}</span>
							</div>

							<div className="flex justify-between items-center text-md font-extrabold text-[#1A1A1A] pt-4 border-t border-slate-200">
								<div className="flex items-center gap-2">
									<CreditCard className="w-4.5 h-4.5 text-[#1A1A1A] shrink-0" strokeWidth={1.5} />
									<span>Total Cloud Cost:</span>
								</div>
								<span className="text-xl sm:text-2xl text-cyan-600 font-mono font-black">
									<AnimatedCounter value={calculations.cloudTco} formatter={formatCurrency} />
								</span>
							</div>
							
							<div className="flex justify-between text-xs text-[#8C8C8C] font-mono pl-6">
								<span>Cost per Hour:</span>
								<span className="text-cyan-600 font-bold">${calculations.cloudCostPerHour.toFixed(3)}/hr</span>
							</div>
						</div>
					</div>

					{/* Verdict Card */}
					<div 
						className={`border-2 rounded-2xl transition duration-300 ${
							calculations.localWins 
								? 'border-emerald-500 bg-emerald-50/20 shadow-sm' 
								: 'border-cyan-500 bg-cyan-50/20 shadow-sm'
						}`}
					>
						<div className="p-6">
							<span className={`inline-flex rounded-full px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.24em] font-bold ${
								calculations.localWins 
									? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
									: 'bg-cyan-100 text-cyan-800 border border-cyan-300'
							}`}>
								{calculations.localWins ? '🏠 Local Wins!' : '☁️ Cloud Wins!'}
							</span>

							<h3 className="mt-4 text-2xl font-extrabold text-[#1A1A1A] leading-tight">
								{calculations.localWins ? (
									<>
										Local saves <span className="text-emerald-500 font-black"><AnimatedCounter value={calculations.netSavings} formatter={formatCurrency} /></span>
									</>
								) : (
									<>
										Cloud saves <span className="text-cyan-600 font-black"><AnimatedCounter value={calculations.netSavings} formatter={formatCurrency} /></span>
									</>
								)}
							</h3>

							<p className="mt-3 text-sm leading-relaxed text-[#5E5E5E] font-medium">
								{calculations.localWins 
									? `Local hardware pays off after ${Number.isFinite(calculations.breakEvenMonths) ? `${calculations.breakEvenMonths} months` : 'Never'}.`
									: 'Renting on demand prevents costly hardware depreciation and upfront CapEx.'
								}
							</p>

							{/* Direct Provider Link CTA inside Verdict Box */}
							<div className="mt-6 pt-5 border-t border-gray-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
								<div>
									<span className="text-[10px] text-[#8C8C8C] uppercase tracking-wider font-mono font-bold block">Selected Cloud Provider</span>
									<div className="flex items-center gap-2 mt-0.5">
										<span className="text-sm font-bold text-[#1A1A1A]">{activeProvider.providerName}</span>
										<span className="text-xs text-[#8C8C8C] font-mono">({cloudGpuCount}x {activeProvider.gpuModel})</span>
									</div>
								</div>
								<a
									href={activeProvider.affiliateUrl}
									target="_blank"
									rel="noopener noreferrer"
									className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 text-white ${
										calculations.localWins
											? 'bg-emerald-500 hover:bg-emerald-400 shadow-sm'
											: 'bg-cyan-500 hover:bg-cyan-400 shadow-sm'
									}`}
								>
									<span>{activeProvider.ctaText || `Deploy on ${activeProvider.providerName}`}</span>
									<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
									</svg>
								</a>
							</div>
						</div>
					</div>

					{/* Recommendation & Metrics Widgets */}
					<div className="grid grid-cols-2 gap-4">
						<div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
							<p className="text-xs text-[#8C8C8C] font-medium">Break-Even Point</p>
							<p className="text-2xl font-black text-[#1A1A1A] mt-1.5 font-mono">
								{Number.isFinite(calculations.breakEvenMonths)
									? calculations.breakEvenMonths > 12
										? `Mo ${calculations.breakEvenMonths} (${(calculations.breakEvenMonths / 12).toFixed(1)} yrs)`
										: `Month ${calculations.breakEvenMonths}`
									: '> 7 Years'}
							</p>
						</div>
						<div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
							<p className="text-xs text-[#8C8C8C] font-medium">Resale Value Recovery</p>
							<p className="text-2xl font-black text-emerald-600 mt-1.5 font-mono">
								{formatCurrency(calculations.resaleValue)}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Interactive Break-Even & Renting vs Owning Chart Section */}
			<div className="mt-12 bg-white border border-gray-100 rounded-xl shadow-sm p-6 lg:p-8 space-y-6">
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
					<div>
						<h3 className="text-2xl font-bold text-[#1A1A1A]">Renting vs. Owning Cumulative Cost Timeline</h3>
						<p className="text-[#8C8C8C] text-xs mt-1">
							Graph of cumulative expenditures over time (0 to 36 months). Intersecting lines graphically highlight the exact Break-Even point.
						</p>
					</div>
					<div className="flex items-center gap-4 text-xs font-mono">
						<div className="flex items-center gap-2">
							<span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_#10b981]"></span>
							<span className="text-[#5E5E5E] font-bold">Local Owning Net TCO</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="w-3 h-3 rounded-full bg-cyan-500 inline-block shadow-[0_0_8px_#22d3ee]"></span>
							<span className="text-[#5E5E5E] font-bold">Cloud Renting ({cloudGpuCount}x)</span>
						</div>
					</div>
				</div>

				<GpuBreakEvenChart
					data={calculations.monthlyData}
					breakEvenMonth={calculations.breakEvenMonths}
					maxMonths={calculations.chartMaxMonths}
					resalePercent={resalePercent}
				/>
			</div>

			{/* Interactive Cloud GPU Directory Section */}
			<div className="mt-12 border-t border-gray-200/80 pt-12 space-y-8">
				<div>
					<h3 className="text-2xl font-bold text-[#1A1A1A] sm:text-3xl">Cloud GPU Directory & Price Explorer</h3>
					<p className="text-[#5E5E5E] text-sm mt-2">
						Filter and search through detailed specifications, egress policies, storage costs, and hourly rates of 12 major cloud GPU services. Click "Compare" on any GPU configuration to load it into the TCO calculator above.
					</p>
				</div>

				<CloudGpuDirectory
					selectedPresetId={selectedProviderId}
					onSelectPreset={(presetId) => {
						setSelectedProviderId(presetId);
						window.scrollTo({ top: 0, behavior: 'smooth' });
					}}
				/>
			</div>
		</>
	);
}

function CloudGpuDirectory({
	onSelectPreset,
	selectedPresetId
}: {
	onSelectPreset: (presetId: string) => void;
	selectedPresetId: string;
}) {
	const [searchTerm, setSearchTerm] = useState('');
	const [activeTab, setActiveTab] = useState<'All' | 'Enterprise' | 'Standard' | 'Decentralized'>('All');

	const filteredProviders = useMemo(() => {
		return CLOUD_PROVIDERS_EXPLORER.map(provider => {
			// Filter GPU configs by search term
			const matchingGpus = provider.gpus.filter(gpu =>
				gpu.gpuModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
				provider.name.toLowerCase().includes(searchTerm.toLowerCase())
			);

			const matchesTab = activeTab === 'All' || provider.type === activeTab;
			const matchesSearch = searchTerm === '' ||
				provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				provider.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
				matchingGpus.length > 0;

			if (matchesTab && matchesSearch) {
				return {
					...provider,
					gpus: matchingGpus.length > 0 ? matchingGpus : provider.gpus
				};
			}
			return null;
		}).filter((p): p is CloudProviderDetail => p !== null);
	}, [searchTerm, activeTab]);

	return (
		<div className="space-y-6">
			{/* Filters Bar */}
			<div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
				<div className="flex flex-wrap gap-2">
					{(['All', 'Enterprise', 'Standard', 'Decentralized'] as const).map(tab => (
						<button
							key={tab}
							type="button"
							onClick={() => setActiveTab(tab)}
							className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
								activeTab === tab
									? 'bg-cyan-500 text-white shadow-sm'
									: 'bg-white border border-gray-250 text-[#5E5E5E] hover:text-[#1A1A1A] hover:border-gray-400'
							}`}
						>
							{tab}
						</button>
					))}
				</div>

				<div className="w-full sm:w-72 relative">
					<input
						type="text"
						placeholder="Search provider or GPU..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full pl-4 pr-10 py-2.5 rounded-xl text-xs bg-white border border-gray-200 text-[#1A1A1A] placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition"
					/>
					<span className="absolute right-3 top-3 text-[#8C8C8C] text-xs">🔍</span>
				</div>
			</div>

			{/* List layout of Providers */}
			<div className="space-y-8">
				{filteredProviders.length === 0 ? (
					<div className="text-center py-12 bg-white border border-gray-150 rounded-2xl">
						<p className="text-[#8C8C8C] text-sm">No GPU cloud services found matching your criteria.</p>
					</div>
				) : (
					filteredProviders.map(p => (
						<div key={p.id} className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 lg:p-8 space-y-6 transition-all duration-300 hover:border-cyan-500 hover:-translate-y-1">
							{/* Provider header info */}
							<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
								<div className="space-y-2">
									<div className="flex items-center gap-3">
										<h4 className="text-xl font-bold text-[#1A1A1A]">{p.name}</h4>
										<span className={`text-[9px] uppercase tracking-widest font-mono font-bold px-2.5 py-0.5 rounded-full ${
											p.type === 'Enterprise'
												? 'bg-purple-100 text-purple-700 border border-purple-300'
												: p.type === 'Decentralized'
													? 'bg-amber-100 text-amber-700 border border-amber-300'
													: 'bg-cyan-100 text-cyan-700 border border-cyan-300'
										}`}>
											{p.type}
										</span>
									</div>
									<p className="text-xs text-[#5E5E5E] max-w-3xl leading-5">{p.description}</p>
								</div>

								<a
									href={p.affiliateUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-cyan-700 hover:text-cyan-800 border border-cyan-300 bg-cyan-50 rounded-xl transition"
								>
									{p.ctaText || 'Visit site →'}
								</a>
							</div>

							{/* Provider specs meta */}
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono text-[#8C8C8C]">
								<div className="bg-gray-50/50 p-3.5 rounded-xl border border-gray-100">
									<span className="text-[10px] uppercase tracking-wider block">Billing Unit</span>
									<span className="text-[#1A1A1A] mt-1 block font-bold">{p.billingUnit}</span>
								</div>
								<div className="bg-gray-50/50 p-3.5 rounded-xl border border-gray-100">
									<span className="text-[10px] uppercase tracking-wider block">Network Egress</span>
									<span className="text-emerald-600 mt-1 block font-bold">{p.egress}</span>
								</div>
								<div className="bg-gray-50/50 p-3.5 rounded-xl border border-gray-100">
									<span className="text-[10px] uppercase tracking-wider block">Storage Cost</span>
									<span className="text-cyan-600 mt-1 block font-bold">{p.storageCost}</span>
								</div>
							</div>

							{/* GPU Configs Table/List */}
							<div className="overflow-x-auto rounded-xl border border-gray-150 bg-gray-50/20">
								<table className="w-full text-left border-collapse min-w-[600px]">
									<thead>
										<tr className="border-b border-gray-150 bg-gray-50/50 text-[10px] font-mono uppercase tracking-wider text-[#8C8C8C]">
											<th className="py-3 px-4">GPU Model</th>
											<th className="py-3 px-4">VRAM</th>
											<th className="py-3 px-4 text-right">Rate ($/hr)</th>
											<th className="py-3 px-4 text-center">Alternatives / Spot</th>
											<th className="py-3 px-4 text-right">Compare</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-100 text-xs font-mono">
										{p.gpus.map((gpu) => {
											const presetId = `${p.id}-${gpu.gpuModel.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
											const isCurrentlySelected = selectedPresetId === presetId;

											return (
												<tr key={gpu.gpuModel} className={`hover:bg-slate-100/30 transition ${isCurrentlySelected ? 'bg-cyan-500/5' : ''}`}>
													<td className="py-3.5 px-4 font-semibold text-[#5E5E5E]">{gpu.gpuModel}</td>
													<td className="py-3.5 px-4 text-[#5E5E5E]">{gpu.vram}</td>
													<td className="py-3.5 px-4 text-right text-cyan-600 font-bold">
														${gpu.rate.toFixed(2)}/hr
													</td>
													<td className="py-3.5 px-4 text-center text-[#8C8C8C] text-[10px]">
														{gpu.spotRate ? (
															<span className="text-[#C88D4E]">Spot: ${gpu.spotRate.toFixed(2)}/hr</span>
														) : gpu.communityRate ? (
															<span className="text-indigo-650 font-semibold">P2P: ${gpu.communityRate.toFixed(2)}/hr</span>
														) : gpu.note ? (
															<span>{gpu.note}</span>
														) : (
															'—'
														)}
													</td>
													<td className="py-3.5 px-4 text-right">
														<button
															type="button"
															onClick={() => onSelectPreset(presetId)}
															className={`px-3 py-1.5 rounded-lg font-bold text-[10px] transition cursor-pointer ${
																isCurrentlySelected
																	? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold'
																	: 'bg-cyan-500 text-white hover:bg-cyan-600 shadow-sm'
															}`}
														>
															{isCurrentlySelected ? 'Selected' : 'Compare'}
														</button>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}

interface ChartPoint {
	month: number;
	grossLocal: number;
	netLocal: number;
	cloud: number;
	resaleCredit: number;
}

function GpuBreakEvenChart({
	data,
	breakEvenMonth,
	maxMonths,
	resalePercent
}: {
	data: ChartPoint[];
	breakEvenMonth: number;
	maxMonths: number;
	resalePercent: number;
}) {
	const [hoverIndex, setHoverIndex] = useState<number | null>(null);
	const [isHoveredBreakEven, setIsHoveredBreakEven] = useState(false);

	const width = 800;
	const height = 340;
	const padding = { top: 45, right: 30, bottom: 40, left: 65 };
	const chartWidth = width - padding.left - padding.right;
	const chartHeight = height - padding.top - padding.bottom;

	const maxCost = useMemo(() => {
		let maxVal = 0;
		data.forEach(d => {
			if (d.netLocal > maxVal) maxVal = d.netLocal;
			if (d.cloud > maxVal) maxVal = d.cloud;
			if (d.grossLocal > maxVal) maxVal = d.grossLocal;
		});
		return Math.max(maxVal * 1.05, 1000);
	}, [data]);

	// Clean round Y-axis tick intervals
	const { yTicks, yMax } = useMemo(() => {
		let step = 1000;
		if (maxCost > 100000) step = 20000;
		else if (maxCost > 50000) step = 10000;
		else if (maxCost > 20000) step = 5000;
		else if (maxCost > 10000) step = 2000;
		else if (maxCost > 4000) step = 1000;
		else if (maxCost > 1500) step = 500;
		else step = 250;

		const ceiling = Math.ceil(maxCost / step) * step;
		const ticks = [];
		for (let v = 0; v <= ceiling; v += step) {
			ticks.push(v);
		}
		return { yTicks: ticks, yMax: ceiling };
	}, [maxCost]);

	const xScale = (m: number) => padding.left + (m / Math.max(1, maxMonths)) * chartWidth;
	const yScale = (val: number) => padding.top + chartHeight - (val / Math.max(1, yMax)) * chartHeight;

	// SVG Path generation (Lines)
	const localPath = useMemo(() => {
		return data.reduce((acc, point, idx) => {
			const x = xScale(point.month);
			const y = yScale(point.netLocal);
			return idx === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`;
		}, '');
	}, [data, maxMonths, yMax]);

	const cloudPath = useMemo(() => {
		return data.reduce((acc, point, idx) => {
			const x = xScale(point.month);
			const y = yScale(point.cloud);
			return idx === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`;
		}, '');
	}, [data, maxMonths, yMax]);

	// SVG Path generation (Area shapes)
	const localAreaPath = useMemo(() => {
		if (data.length === 0) return '';
		const firstX = xScale(data[0].month);
		const lastX = xScale(data[data.length - 1].month);
		const zeroY = yScale(0);
		return `${localPath} L ${lastX.toFixed(1)} ${zeroY.toFixed(1)} L ${firstX.toFixed(1)} ${zeroY.toFixed(1)} Z`;
	}, [data, localPath, maxMonths, yMax]);

	const cloudAreaPath = useMemo(() => {
		if (data.length === 0) return '';
		const firstX = xScale(data[0].month);
		const lastX = xScale(data[data.length - 1].month);
		const zeroY = yScale(0);
		return `${cloudPath} L ${lastX.toFixed(1)} ${zeroY.toFixed(1)} L ${firstX.toFixed(1)} ${zeroY.toFixed(1)} Z`;
	}, [data, cloudPath, maxMonths, yMax]);

	// Break-even coordinates
	const breakEvenX = Number.isFinite(breakEvenMonth) && breakEvenMonth <= maxMonths ? xScale(breakEvenMonth) : null;
	const breakEvenPoint = Number.isFinite(breakEvenMonth) && breakEvenMonth <= maxMonths ? data.find(d => d.month === breakEvenMonth) : null;
	const breakEvenY = breakEvenPoint ? yScale(breakEvenPoint.netLocal) : null;

	const activePoint = hoverIndex !== null && data[hoverIndex] ? data[hoverIndex] : null;

	return (
		<div className="relative w-full">
			<svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
				{/* Gradient definitions for area fills */}
				<defs>
					<linearGradient id="localAreaGradient" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
						<stop offset="100%" stopColor="#10b981" stopOpacity="0" />
					</linearGradient>
					<linearGradient id="cloudAreaGradient" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
						<stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
					</linearGradient>
				</defs>

				{/* Subtle dashed horizontal grid lines aligned with Y-axis ticks */}
				{yTicks.map((val) => {
					const y = yScale(val);
					const label = val === 0 ? '$0' : val >= 1000 ? (val % 1000 === 0 ? `$${val / 1000}k` : `$${(val / 1000).toFixed(1)}k`) : `$${val}`;
					return (
						<g key={val}>
							<line 
								x1={padding.left} 
								y1={y} 
								x2={width - padding.right} 
								y2={y} 
								stroke="#e5e7eb" 
								strokeDasharray="3 3" 
							/>
							<text x={padding.left - 10} y={y + 4} textAnchor="end" className="text-xs font-mono font-bold fill-slate-400">
								{label}
							</text>
						</g>
					);
				})}

				{/* Vertical Gridlines & X-Axis Labels */}
				{Array.from({ length: Math.floor(maxMonths / 12) + 1 }, (_, i) => i * 12).map((m) => {
					const x = xScale(m);
					return (
						<g key={m}>
							<line x1={x} y1={padding.top} x2={x} y2={height - padding.bottom} stroke="rgba(0,0,0,0.04)" />
							<text x={x} y={height - padding.bottom + 22} textAnchor="middle" className="text-xs font-mono font-bold fill-slate-400">
								m{m}
							</text>
						</g>
					);
				})}

				{/* Area chart gradients */}
				<path d={cloudAreaPath} fill="url(#cloudAreaGradient)" />
				<path d={localAreaPath} fill="url(#localAreaGradient)" />

				{/* Cloud TCO Line (Cyan) */}
				<path d={cloudPath} fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />

				{/* Local Owning Net TCO Line (Emerald) */}
				<path d={localPath} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />

				{/* Break-Even Point glowing vertical marker & pulsing dot */}
				{breakEvenX !== null && breakEvenY !== null && (
					<g 
						className="cursor-pointer"
						onMouseEnter={() => setIsHoveredBreakEven(true)}
						onMouseLeave={() => setIsHoveredBreakEven(false)}
					>
						{/* Glowing vertical marker */}
						<line x1={breakEvenX} y1={padding.top} x2={breakEvenX} y2={height - padding.bottom} stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 4" />
						
						{/* Pulsing ring */}
						<circle 
							cx={breakEvenX} 
							cy={breakEvenY} 
							r="14" 
							fill="#f59e0b" 
							className="animate-ping opacity-35" 
							style={{ transformOrigin: `${breakEvenX}px ${breakEvenY}px` }} 
						/>
						{/* Pulsing dot intersection */}
						<circle cx={breakEvenX} cy={breakEvenY} r="8" fill="#f59e0b" className="drop-shadow-[0_0_8px_#f59e0b]" />
						<circle cx={breakEvenX} cy={breakEvenY} r="4" fill="#ffffff" />
						
						{/* Static Label (Optional indicator if not hovered) */}
						<g transform={`translate(${Math.min(breakEvenX, width - 150)}, ${padding.top - 20})`}>
							<rect x="-10" y="-14" width="145" height="22" rx="11" fill="#f59e0b" />
							<text x="62.5" y="1" textAnchor="middle" className="text-[10px] font-black font-sans fill-slate-950 uppercase tracking-wider">
								★ Break-Even
							</text>
						</g>
					</g>
				)}

				{/* 36-Month Resale Offset Marker (Floating Pill with shadow-md to avoid intersections) */}
				{maxMonths >= 36 && data.find(d => d.month === 36) && (() => {
					const pt36 = data.find(d => d.month === 36)!;
					const x36 = xScale(36);
					const y36 = yScale(pt36.netLocal);
					return (
						<g transform={`translate(${x36}, ${y36})`}>
							<line x1="0" y1="0" x2="0" y2="-45" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" />
							<circle cx="0" cy="0" r="4.5" fill="#10b981" />
							<g transform="translate(-75, -70)" className="filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.15)]">
								<rect width="150" height="24" rx="12" fill="#ffffff" stroke="#10b981" strokeWidth="1.5" />
								<text x="75" y="15" textAnchor="middle" className="text-[9px] font-black font-sans fill-[#1a1a1a] tracking-wider uppercase">
									💵 RESALE OFFSET (-{resalePercent}%)
								</text>
							</g>
						</g>
					);
				})()}

				{/* Hover Overlay Nodes */}
				{data.map((pt, idx) => {
					const cx = xScale(pt.month);
					const cyLocal = yScale(pt.netLocal);
					const cyCloud = yScale(pt.cloud);

					return (
						<g key={pt.month} onMouseEnter={() => setHoverIndex(idx)} className="cursor-pointer">
							<rect x={cx - 10} y={padding.top} width="20" height={chartHeight} fill="transparent" />
							{hoverIndex === idx && (
								<line x1={cx} y1={padding.top} x2={cx} y2={height - padding.bottom} stroke="rgba(0,0,0,0.15)" strokeDasharray="2 2" />
							)}
							<circle cx={cx} cy={cyLocal} r={hoverIndex === idx ? "6" : "3.5"} fill="#10b981" />
							<circle cx={cx} cy={cyCloud} r={hoverIndex === idx ? "6" : "3.5"} fill="#22d3ee" />
						</g>
					);
				})}
			</svg>

			{/* Floating Tooltip for Break-Even Dot Hover */}
			{isHoveredBreakEven && breakEvenPoint && breakEvenX !== null && breakEvenY !== null && (
				<div 
					className="absolute z-30 pointer-events-none bg-slate-900 text-white rounded-lg p-2.5 text-xs font-mono shadow-md border border-slate-700 max-w-[200px]"
					style={{
						left: `${(breakEvenX / width) * 100}%`,
						top: `${(breakEvenY / height) * 100}%`,
						transform: 'translate(-50%, -120%)',
					}}
				>
					<div className="font-extrabold text-[#f59e0b] flex items-center gap-1">
						<Sparkles className="w-3.5 h-3.5 inline text-[#f59e0b]" />
						<span>Break-Even Point</span>
					</div>
					<div className="mt-1.5 border-t border-slate-800 pt-1">
						<div className="flex justify-between gap-4 text-slate-400">
							<span>Period:</span>
							<span className="font-bold text-white">Month {breakEvenMonth}</span>
						</div>
						<div className="flex justify-between gap-4 text-emerald-400 font-bold">
							<span>Local TCO:</span>
							<span>{formatCurrency(breakEvenPoint.netLocal)}</span>
						</div>
						<div className="flex justify-between gap-4 text-cyan-400 font-bold">
							<span>Cloud TCO:</span>
							<span>{formatCurrency(breakEvenPoint.cloud)}</span>
						</div>
					</div>
				</div>
			)}

			{/* Interactive Hover Tooltip Card */}
			{activePoint ? (
				<div className="mt-4 bg-white border border-gray-150 rounded-xl p-4 text-sm font-mono flex flex-wrap justify-between items-center gap-4 shadow-sm">
					<span className="text-[#1A1A1A] font-extrabold text-base">Month {activePoint.month}</span>
					<span className="text-[#1A1A1A] font-bold">Local Net TCO: {formatCurrency(activePoint.netLocal)}</span>
					<span className="text-cyan-600 font-bold">Cloud TCO: {formatCurrency(activePoint.cloud)}</span>
					<span className="text-amber-700 font-bold">
						{activePoint.cloud > activePoint.netLocal
							? `Local Net Savings: ${formatCurrency(activePoint.cloud - activePoint.netLocal)}`
							: `Cloud Net Savings: ${formatCurrency(activePoint.netLocal - activePoint.cloud)}`}
					</span>
				</div>
			) : (
				<div className="mt-4 bg-white border border-gray-150 rounded-xl p-3 text-xs font-mono text-[#8C8C8C] text-center shadow-sm">
					Hover over any month on the graph to inspect exact TCO numbers & savings breakdown.
				</div>
			)}
		</div>
	);
}
