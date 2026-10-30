import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useMotionValue, animate } from 'framer-motion';
import { Cpu, Server, Zap, Wrench, Coins, Tag, Database, DollarSign, Cloud, CreditCard, Sparkles, KeyRound, Receipt, SlidersHorizontal, Search, ArrowLeftRight } from 'lucide-react';
import { formatCurrency } from '../../../lib/calculators/format';

interface GpuModel {
	id: string;
	name: string;
	/** Street price used in the model. */
	cost: number;
	/** Launch list price, when the vendor published one. Drives the street-deviation readout. */
	msrp?: number;
	tdp: number; // in Watts
	vram: string;
	bandwidth?: string;
	tier: string;
	vendor: 'NVIDIA' | 'AMD' | 'Intel' | 'Apple';
	/** Accelerators inside the box. NVIDIA AI Enterprise is licensed per GPU, not per system. */
	gpus: number;
	isTurnKey: boolean;
	/** Observed market range or caveat carried from the valuation report. */
	marketNote?: string;
}

/**
 * NVIDIA AI Enterprise is licensed per GPU per year. Volume tiers from the 2026 valuation report:
 * $4,500 list under 100 GPUs, then $3,825 / $3,375 / $2,925 at 100-500 / 500-2,000 / 2,000+.
 */
function nvaieTier(fleetGpus: number): { rate: number; label: string } {
	if (fleetGpus >= 2000) return { rate: 2925, label: '2,000+ GPUs' };
	if (fleetGpus >= 500) return { rate: 3375, label: '500–2,000 GPUs' };
	if (fleetGpus >= 100) return { rate: 3825, label: '100–500 GPUs' };
	return { rate: 4500, label: 'under 100 GPUs' };
}

/** Production NIM, orchestration and hypervisor support are what NVAIE buys; GeForce parts do not need it. */
function needsNvaie(gpu: GpuModel): boolean {
	return gpu.vendor === 'NVIDIA' && (gpu.tier === 'Enterprise AI Hardware' || gpu.tier === 'Professional Workstation');
}

const GPU_TIERS = [
	'Tier 1: Apple Silicon (Unified Memory)',
	'Tier 2: x86 Mini PCs (Shared Memory)',
	'Tier 3: Consumer Cards (Street Price)',
	'Tier 4: Prosumer Rigs (Contiguous VRAM)',
	'Tier 5: Certified Workstation Accelerators',
	'Tier 6: Data-Center Accelerators & Nodes'
] as const;

const TIER_LABELS: Record<string, string> = {
	'Apple Silicon': GPU_TIERS[0],
	'AMD Mini PC': GPU_TIERS[1],
	'NVIDIA CUDA GPU': GPU_TIERS[2],
	'NVIDIA CUDA Workstation': GPU_TIERS[3],
	'Professional Workstation': GPU_TIERS[4],
	'Enterprise AI Hardware': GPU_TIERS[5]
};

const GPU_MODELS: GpuModel[] = [
	// TIER 1: Apple Silicon (Unified Memory)
	{ id: 'mac-mini-m4-pro-48', name: 'Mac Mini M4 Pro (48GB) — $1,499', cost: 1499, tdp: 65, vram: '48GB', tier: 'Apple Silicon', vendor: 'Apple', gpus: 1, isTurnKey: true },
	{ id: 'mac-mini-m4-pro-64', name: 'Mac Mini M4 Pro (64GB) — $1,799', cost: 1799, tdp: 65, vram: '64GB', tier: 'Apple Silicon', vendor: 'Apple', gpus: 1, isTurnKey: true },
	{ id: 'mac-studio-m4-max-128', name: 'Mac Studio M4 Max (128GB) — $3,699', cost: 3699, tdp: 120, vram: '128GB', tier: 'Apple Silicon', vendor: 'Apple', gpus: 1, isTurnKey: true },
	{ id: 'mac-studio-m5-ultra-96', name: 'Mac Studio M5 Ultra (96GB, 1.2 TB/s) — $5,499', cost: 5499, msrp: 5499, tdp: 250, vram: '96GB', bandwidth: '1,200 GB/s', tier: 'Apple Silicon', vendor: 'Apple', gpus: 1, isTurnKey: true, marketNote: 'Apple does not publish a board TDP; 250W envelope assumed.' },

	// TIER 2: x86 mini PCs (shared memory)
	{ id: 'beelink-ser9-64', name: 'Beelink SER9 (64GB DDR5) — $799', cost: 799, tdp: 25, vram: '64GB Shared', tier: 'AMD Mini PC', vendor: 'AMD', gpus: 1, isTurnKey: true },
	{ id: 'strix-halo-128', name: 'Strix Halo Mini PC (128GB LPDDR5x) — $3,099', cost: 3099, msrp: 2999, tdp: 85, vram: '128GB Shared', bandwidth: '~500 GB/s', tier: 'AMD Mini PC', vendor: 'AMD', gpus: 1, isTurnKey: true, marketNote: 'Turnkey 128GB shared-memory box for quantized inference.' },
	{ id: 'dgx-spark-64', name: 'NVIDIA DGX Spark 64GB (OEM SKU) — $4,999', cost: 4999, msrp: 4999, tdp: 140, vram: '64GB Unified', bandwidth: '~273 GB/s', tier: 'AMD Mini PC', vendor: 'NVIDIA', gpus: 1, isTurnKey: true, marketNote: '64GB SKU introduced to hold an offering under $5,000.' },
	{ id: 'dgx-spark-128', name: 'NVIDIA DGX Spark 128GB — $6,950', cost: 6950, msrp: 3999, tdp: 240, vram: '128GB Unified', bandwidth: '~273 GB/s', tier: 'AMD Mini PC', vendor: 'NVIDIA', gpus: 1, isTurnKey: true, marketNote: 'MSRP moved $3,999 → $4,699 → $6,950 on memory supply.' },

	// TIER 3: Consumer cards at street price
	{ id: 'arc-b570', name: 'Intel Arc B570 (10GB) — $260', cost: 260, msrp: 219, tdp: 150, vram: '10GB', bandwidth: '~380 GB/s', tier: 'NVIDIA CUDA GPU', vendor: 'Intel', gpus: 1, isTurnKey: false },
	{ id: 'arc-b580', name: 'Intel Arc B580 (12GB) — $310', cost: 310, msrp: 249, tdp: 190, vram: '12GB', bandwidth: '~456 GB/s', tier: 'NVIDIA CUDA GPU', vendor: 'Intel', gpus: 1, isTurnKey: false },
	{ id: 'rtx-5050', name: 'NVIDIA RTX 5050 (8GB) — $305', cost: 305, msrp: 249, tdp: 130, vram: '8GB', bandwidth: '~448 GB/s', tier: 'NVIDIA CUDA GPU', vendor: 'NVIDIA', gpus: 1, isTurnKey: false },
	{ id: 'rtx-5060', name: 'NVIDIA RTX 5060 (8GB) — $450', cost: 450, msrp: 299, tdp: 145, vram: '8GB', bandwidth: '~448 GB/s', tier: 'NVIDIA CUDA GPU', vendor: 'NVIDIA', gpus: 1, isTurnKey: false },
	{ id: 'rx-9060-xt-16', name: 'AMD Radeon RX 9060 XT (16GB) — $460', cost: 460, msrp: 349, tdp: 180, vram: '16GB', bandwidth: '~320 GB/s', tier: 'NVIDIA CUDA GPU', vendor: 'AMD', gpus: 1, isTurnKey: false },
	{ id: 'rtx-5060-ti-16', name: 'NVIDIA RTX 5060 Ti (16GB) — $730', cost: 730, msrp: 429, tdp: 180, vram: '16GB', bandwidth: '~448 GB/s', tier: 'NVIDIA CUDA GPU', vendor: 'NVIDIA', gpus: 1, isTurnKey: false, marketNote: '+70% over launch, driven by local inference demand.' },
	{ id: 'rx-9070', name: 'AMD Radeon RX 9070 (16GB) — $635', cost: 635, msrp: 549, tdp: 220, vram: '16GB', bandwidth: '~576 GB/s', tier: 'NVIDIA CUDA GPU', vendor: 'AMD', gpus: 1, isTurnKey: false },
	{ id: 'rtx-5070', name: 'NVIDIA RTX 5070 (12GB) — $805', cost: 805, msrp: 549, tdp: 250, vram: '12GB', bandwidth: '~672 GB/s', tier: 'NVIDIA CUDA GPU', vendor: 'NVIDIA', gpus: 1, isTurnKey: false },
	{ id: 'rx-9070-xt', name: 'AMD Radeon RX 9070 XT (16GB) — $895', cost: 895, msrp: 599, tdp: 280, vram: '16GB', bandwidth: '~640 GB/s', tier: 'NVIDIA CUDA GPU', vendor: 'AMD', gpus: 1, isTurnKey: false, marketNote: 'Factory-overclocked boards run $950–$1,038.' },
	{ id: 'rtx-5070-ti', name: 'NVIDIA RTX 5070 Ti (16GB) — $1,100', cost: 1100, msrp: 749, tdp: 300, vram: '16GB', bandwidth: '~896 GB/s', tier: 'NVIDIA CUDA GPU', vendor: 'NVIDIA', gpus: 1, isTurnKey: false },
	{ id: 'rtx-5080', name: 'NVIDIA RTX 5080 (16GB) — $1,550', cost: 1550, msrp: 999, tdp: 400, vram: '16GB', bandwidth: '~1,024 GB/s', tier: 'NVIDIA CUDA GPU', vendor: 'NVIDIA', gpus: 1, isTurnKey: false, marketNote: 'Channel average; OC boards list at $2,099.' },
	{ id: 'rtx-5090', name: 'NVIDIA RTX 5090 (32GB) — $4,700', cost: 4700, msrp: 1999, tdp: 575, vram: '32GB', bandwidth: '~1,792 GB/s', tier: 'NVIDIA CUDA GPU', vendor: 'NVIDIA', gpus: 1, isTurnKey: false, marketNote: 'Distributor listings $6,010; secondary market has cleared $9,344.' },
	{ id: 'used-rtx-3090', name: 'Used RTX 3090 (24GB) — $699', cost: 699, tdp: 350, vram: '24GB', tier: 'NVIDIA CUDA GPU', vendor: 'NVIDIA', gpus: 1, isTurnKey: false },
	{ id: 'used-dual-rtx-3090', name: 'Dual Used RTX 3090s (48GB) — $1,398', cost: 1398, tdp: 700, vram: '48GB', tier: 'NVIDIA CUDA GPU', vendor: 'NVIDIA', gpus: 2, isTurnKey: false, marketNote: 'Two 24GB buses; model must shard across PCIe.' },

	// TIER 4: Prosumer rigs where contiguous VRAM is the deciding metric
	{ id: 'dual-rtx-5080-rig', name: 'Dual RTX 5080 Rig (32GB pooled) — $3,500', cost: 3500, msrp: 1998, tdp: 800, vram: '32GB', bandwidth: '1,024 GB/s per card', tier: 'NVIDIA CUDA Workstation', vendor: 'NVIDIA', gpus: 2, isTurnKey: true, marketNote: 'Street range $2,800–$4,200 depending on board partner.' },
	{ id: 'single-rtx-5090-rig', name: 'Single RTX 5090 Rig (32GB contiguous) — $4,700', cost: 4700, msrp: 1999, tdp: 650, vram: '32GB', bandwidth: '~1,792 GB/s', tier: 'NVIDIA CUDA Workstation', vendor: 'NVIDIA', gpus: 1, isTurnKey: true, marketNote: 'Pays a premium to avoid sharding a model across two PCIe slots.' },

	// TIER 5: Certified workstation accelerators
	{ id: 'rtx-a400', name: 'NVIDIA RTX A400 (4GB) — $220', cost: 220, msrp: 220, tdp: 50, vram: '4GB', bandwidth: '~96 GB/s', tier: 'Professional Workstation', vendor: 'NVIDIA', gpus: 1, isTurnKey: false },
	{ id: 'rtx-a1000', name: 'NVIDIA RTX A1000 (8GB) — $620', cost: 620, msrp: 450, tdp: 50, vram: '8GB', bandwidth: '~160 GB/s', tier: 'Professional Workstation', vendor: 'NVIDIA', gpus: 1, isTurnKey: false },
	{ id: 'radeon-pro-w7500', name: 'AMD Radeon PRO W7500 (8GB) — $458', cost: 458, msrp: 429, tdp: 70, vram: '8GB', bandwidth: '~176 GB/s', tier: 'Professional Workstation', vendor: 'AMD', gpus: 1, isTurnKey: false },
	{ id: 'rtx-4000-ada', name: 'NVIDIA RTX 4000 Ada (20GB, single slot) — $1,940', cost: 1940, msrp: 1250, tdp: 130, vram: '20GB', bandwidth: '~360 GB/s', tier: 'Professional Workstation', vendor: 'NVIDIA', gpus: 1, isTurnKey: false },
	{ id: 'rtx-pro-2000-blackwell', name: 'NVIDIA RTX PRO 2000 Blackwell (16GB) — $1,820', cost: 1820, msrp: 1499, tdp: 140, vram: '16GB', bandwidth: '~448 GB/s', tier: 'Professional Workstation', vendor: 'NVIDIA', gpus: 1, isTurnKey: false },
	{ id: 'radeon-pro-w7800', name: 'AMD Radeon PRO W7800 (32GB) — $2,360', cost: 2360, msrp: 2499, tdp: 260, vram: '32GB', bandwidth: '~576 GB/s', tier: 'Professional Workstation', vendor: 'AMD', gpus: 1, isTurnKey: false },
	{ id: 'rtx-pro-4000-blackwell', name: 'NVIDIA RTX PRO 4000 Blackwell (24GB) — $3,430', cost: 3430, msrp: 2999, tdp: 200, vram: '24GB', bandwidth: '~672 GB/s', tier: 'Professional Workstation', vendor: 'NVIDIA', gpus: 1, isTurnKey: false },
	{ id: 'rtx-5000-ada', name: 'NVIDIA RTX 5000 Ada (32GB) — $4,700', cost: 4700, msrp: 4000, tdp: 250, vram: '32GB', bandwidth: '~576 GB/s', tier: 'Professional Workstation', vendor: 'NVIDIA', gpus: 1, isTurnKey: false },
	{ id: 'radeon-pro-w7900', name: 'AMD Radeon PRO W7900 (48GB) — $4,140', cost: 4140, msrp: 3999, tdp: 295, vram: '48GB', bandwidth: '~864 GB/s', tier: 'Professional Workstation', vendor: 'AMD', gpus: 1, isTurnKey: false, marketNote: '48GB of ECC for roughly half the RTX 6000 Ada price.' },
	{ id: 'rtx-pro-4500-blackwell', name: 'NVIDIA RTX PRO 4500 Blackwell (32GB) — $5,090', cost: 5090, msrp: 4499, tdp: 200, vram: '32GB', bandwidth: '~896 GB/s', tier: 'Professional Workstation', vendor: 'NVIDIA', gpus: 1, isTurnKey: false },
	{ id: 'rtx-6000-ada', name: 'NVIDIA RTX 6000 Ada (48GB ECC) — $8,000', cost: 8000, msrp: 6799, tdp: 300, vram: '48GB', bandwidth: '~960 GB/s', tier: 'Professional Workstation', vendor: 'NVIDIA', gpus: 1, isTurnKey: false, marketNote: 'Authorised channel holds $7,200–$8,799.' },
	{ id: 'rtx-pro-5000-blackwell', name: 'NVIDIA RTX PRO 5000 Blackwell (48GB) — $8,980', cost: 8980, msrp: 7999, tdp: 300, vram: '48GB', bandwidth: '~1,344 GB/s', tier: 'Professional Workstation', vendor: 'NVIDIA', gpus: 1, isTurnKey: false },
	{ id: 'rtx-pro-6000-blackwell', name: 'NVIDIA RTX PRO 6000 Blackwell (96GB ECC) — $16,000', cost: 16000, msrp: 8565, tdp: 600, vram: '96GB', bandwidth: '~1,792 GB/s', tier: 'Professional Workstation', vendor: 'NVIDIA', gpus: 1, isTurnKey: false, marketNote: 'List moved $8,565 → $13,250 → $16,000; retail packs reach $19,977.' },

	// TIER 6: Data-center accelerators and nodes
	{ id: 'nvidia-l4', name: 'NVIDIA L4 PCIe (24GB) — $1,250', cost: 1250, tdp: 75, vram: '24GB', tier: 'Enterprise AI Hardware', vendor: 'NVIDIA', gpus: 1, isTurnKey: false, marketNote: 'Carry-over estimate; the 2026 valuation does not quote the L4.' },
	{ id: 'nvidia-l40s-pcie', name: 'NVIDIA L40S PCIe (48GB) — $11,250', cost: 11250, tdp: 350, vram: '48GB', bandwidth: '~864 GB/s', tier: 'Enterprise AI Hardware', vendor: 'NVIDIA', gpus: 1, isTurnKey: false, marketNote: 'CDW lists $10,497–$12,000; standard GDDR6 avoids HBM packaging.' },
	{ id: 'amd-mi300x', name: 'AMD Instinct MI300X (192GB HBM3) — $17,500', cost: 17500, tdp: 750, vram: '192GB', bandwidth: '~5.3 TB/s', tier: 'Enterprise AI Hardware', vendor: 'AMD', gpus: 1, isTurnKey: false, marketNote: 'OAM module $15,000–$20,000; TDP not stated in the report.' },
	{ id: 'amd-mi325x', name: 'AMD Instinct MI325X (288GB HBM3e) — $20,500', cost: 20500, tdp: 1000, vram: '288GB', bandwidth: '~6.0 TB/s', tier: 'Enterprise AI Hardware', vendor: 'AMD', gpus: 1, isTurnKey: false, marketNote: 'OAM module $17,999–$22,999; TDP not stated in the report.' },
	{ id: 'intel-gaudi-3', name: 'Intel Gaudi 3 (128GB HBM2e) — $14,000', cost: 14000, tdp: 600, vram: '128GB', bandwidth: '~3.7 TB/s', tier: 'Enterprise AI Hardware', vendor: 'Intel', gpus: 1, isTurnKey: false, marketNote: 'PCIe card $8,000–$12,000; mezzanine sits at $15,625 in the 8-chip kit.' },
	{ id: 'nvidia-h100-pcie', name: 'NVIDIA H100 PCIe (80GB HBM3) — $28,500', cost: 28500, tdp: 350, vram: '80GB', bandwidth: '~3.35 TB/s', tier: 'Enterprise AI Hardware', vendor: 'NVIDIA', gpus: 1, isTurnKey: false, marketNote: '$25,000–$32,000 per PCIe unit.' },
	{ id: 'nvidia-h200-nvl', name: 'NVIDIA H200 NVL (141GB HBM3e) — $31,500', cost: 31500, tdp: 600, vram: '141GB', bandwidth: '~4.8 TB/s', tier: 'Enterprise AI Hardware', vendor: 'NVIDIA', gpus: 1, isTurnKey: false, marketNote: '60% more memory than H100 at 4.8 TB/s.' },
	{ id: 'nvidia-b200-sxm', name: 'NVIDIA B200 SXM (180GB HBM3e) — $35,000', cost: 35000, tdp: 1000, vram: '180GB', bandwidth: '~8.0 TB/s', tier: 'Enterprise AI Hardware', vendor: 'NVIDIA', gpus: 1, isTurnKey: false, marketNote: 'BOM $6,000–$7,000; wholesale $30,000–$40,000 sustains ~80% margin.' },
	{ id: 'quad-nvidia-l40s', name: '4x NVIDIA L40S Node (192GB) — $45,000', cost: 45000, tdp: 1400, vram: '192GB', tier: 'Enterprise AI Hardware', vendor: 'NVIDIA', gpus: 4, isTurnKey: true },
	{ id: 'quad-rtx-4090-node', name: '4x RTX 4090 DIY Node (96GB) — $10,500', cost: 10500, tdp: 1800, vram: '96GB', tier: 'Enterprise AI Hardware', vendor: 'NVIDIA', gpus: 4, isTurnKey: true, marketNote: 'Carry-over estimate; the 2026 valuation does not quote the RTX 4090.' },
	{ id: 'octa-nvidia-h100', name: '8x H100 SXM HGX Server (640GB) — $250,000', cost: 250000, tdp: 10200, vram: '640GB', bandwidth: '900 GB/s NVLink 4', tier: 'Enterprise AI Hardware', vendor: 'NVIDIA', gpus: 8, isTurnKey: true, marketNote: 'Complete 8-GPU servers clear at $215,000–$285,000.' },
	{ id: 'octa-nvidia-h200', name: '8x H200 SXM HGX Server (1,128GB) — $337,500', cost: 337500, tdp: 11000, vram: '1,128GB', bandwidth: '900 GB/s NVLink 4', tier: 'Enterprise AI Hardware', vendor: 'NVIDIA', gpus: 8, isTurnKey: true, marketNote: 'Lenovo and Gigabyte list $308,000–$367,000.' },
	{ id: 'octa-amd-mi300x', name: '8x MI300X Server (1,536GB HBM3) — $249,999', cost: 249999, tdp: 6000, vram: '1,536GB', bandwidth: '896 GB/s Infinity Fabric', tier: 'Enterprise AI Hardware', vendor: 'AMD', gpus: 8, isTurnKey: true, marketNote: 'Supermicro AS-8125GS; $35,000–$65,000 under equivalent Hopper.' },
	{ id: 'octa-amd-mi325x', name: '8x MI325X Server (2,304GB HBM3e) — $262,500', cost: 262500, tdp: 8000, vram: '2,304GB', bandwidth: '896 GB/s Infinity Fabric', tier: 'Enterprise AI Hardware', vendor: 'AMD', gpus: 8, isTurnKey: true, marketNote: 'Supermicro 8-GPU lists $261,600–$263,425.' },
	{ id: 'octa-intel-gaudi-3', name: '8x Gaudi 3 Kit (1,024GB HBM2e) — $125,000', cost: 125000, tdp: 4800, vram: '1,024GB', bandwidth: '3.7 TB/s per chip', tier: 'Enterprise AI Hardware', vendor: 'Intel', gpus: 8, isTurnKey: true, marketNote: '24 on-die 200GbE RoCE ports remove the external fabric switch.' },
	{ id: 'octa-nvidia-b200', name: '8x B200 HGX Server (1,440GB HBM3e) — $515,000', cost: 515000, tdp: 12000, vram: '1,440GB', bandwidth: '1,800 GB/s NVLink 5', tier: 'Enterprise AI Hardware', vendor: 'NVIDIA', gpus: 8, isTurnKey: true, marketNote: 'Base HGX B200; specialised builds reach $795,000.' },
	{ id: 'dgx-b300', name: 'DGX B300 8-GPU Chassis (2.3TB agg.) — $325,000', cost: 325000, tdp: 14000, vram: '2,304GB', bandwidth: '1,800 GB/s NVLink 5', tier: 'Enterprise AI Hardware', vendor: 'NVIDIA', gpus: 8, isTurnKey: true, marketNote: 'Requires direct liquid cooling; integrated deployments reach $775,000.' }
];

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
			{/* Background track */}
			<div className="absolute left-0 right-0 h-1.5 bg-[#E8E8EB] pointer-events-none" />
			{/* Active fill */}
			<div
				className="absolute left-0 h-1.5 bg-[#111114] pointer-events-none"
				style={{ width: `${pct}%` }}
			/>
			{/* Drawn thumb */}
			<span
				aria-hidden="true"
				className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-[#111114] bg-white transition-transform duration-150 group-focus-within:scale-110 group-focus-within:border-[#8A5A12] group-hover:scale-110"
				style={{ left: `calc(${pct}% - 8px)` }}
			/>
			{/*
			 * The native input is invisible and sits on top, so the browser's own track/thumb styles
			 * (which the site's global sheet repaints with !important) can never cover the drawn one.
			 * Keyboard and pointer behaviour are untouched.
			 */}
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => onChange(Number(e.target.value))}
				aria-label="slider"
				className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0"
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
		<div className="flex items-center gap-1.5 bg-white rounded-sm px-2 py-1 border border-[#D6D6DB] focus-within:border-[#8A5A12] focus-within:ring-1 focus-within:ring-[#E8A33D] transition-[border-color,background-color,box-shadow,transform] shrink-0">
			{prefix && <span className="text-xs text-gray-400 font-mono tabular-nums font-bold">{prefix}</span>}
			<input
				type="number"
				min={min}
				max={max}
				step={step}
				value={inputValue}
				onChange={handleInputChange}
				onBlur={handleBlur}
				className="w-auto min-w-[4rem] bg-transparent text-right font-mono tabular-nums text-sm font-bold text-[#8A5A12] focus:outline-none border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
				style={{ width: `calc(${Math.max(3, inputValue.length)}ch + 2.4rem)` }}
			/>
			{unit && <span className="text-xs text-gray-400 font-mono tabular-nums font-bold uppercase">{unit}</span>}
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

	return <span ref={ref} className="font-mono tabular-nums">{formatter(value)}</span>;
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

	// Operating-cost model carried from the 2026 valuation report
	const [softwareLicensingOn, setSoftwareLicensingOn] = useState<boolean>(true);
	const [fleetGpuCount, setFleetGpuCount] = useState<number>(1);
	const [maintenanceRatePercent, setMaintenanceRatePercent] = useState<number>(5);
	const [facilityCost, setFacilityCost] = useState<number>(0);
	const [cloudNvaieSurcharge, setCloudNvaieSurcharge] = useState<boolean>(false);

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

	const nvaiePrice = useMemo(() => nvaieTier(fleetGpuCount), [fleetGpuCount]);
	const licensingApplies = softwareLicensingOn && needsNvaie(activeGpu);

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
		const years = timePeriodMonths / 12;

		// Local Cost Calculations. Facility integration sits in capex because it is paid once, at rack-in.
		const gpuCost = activeGpu.cost;
		const hardwareCost = gpuCost + systemCost + facilityCost;
		const totalPowerDrawKw = (activeGpu.tdp + 250) / 1000; // 250W base system draw
		const electricityCost = totalHours * totalPowerDrawKw * electricityRate;
		const maintenanceCost = (gpuCost + systemCost) * (maintenanceRatePercent / 100) * years;

		// NVIDIA AI Enterprise is licensed per GPU per year, so an 8-GPU node bills eight seats.
		const licensingCost = licensingApplies ? nvaiePrice.rate * activeGpu.gpus * years : 0;

		// Cost of Capital / Opportunity Cost of Upfront CapEx
		const opportunityCost = hardwareCost * (costOfCapitalPercent / 100) * years;

		const grossLocalTco = hardwareCost + electricityCost + maintenanceCost + licensingCost + opportunityCost;

		// Resale Value (Salvage Credit) — priced off the accelerator, not the rack work around it.
		const resaleValue = gpuCost * (resalePercent / 100);
		const netLocalTco = Math.max(0, grossLocalTco - resaleValue);
		const localCostPerHour = totalHours > 0 ? netLocalTco / totalHours : 0;

		// Cloud Cost Calculations (scaled by cloudGpuCount)
		const cloudRatePerGpu = activeProvider.rate + (cloudNvaieSurcharge ? 1 : 0);
		const effectiveCloudRate = cloudRatePerGpu * cloudGpuCount;
		const cloudUsageCost = totalHours * effectiveCloudRate;
		const cloudStorageCost = storageSizeGb * activeProvider.storageRate * timePeriodMonths;
		
		const cloudTco = cloudUsageCost + cloudStorageCost;
		const cloudCostPerHour = totalHours > 0 ? cloudTco / totalHours : 0;

		// Monthly rates for time series & break-even calculation
		const monthlyLocalPowerAndMaint =
			(monthlyHours * totalPowerDrawKw * electricityRate) +
			((gpuCost + systemCost) * (maintenanceRatePercent / 100) / 12) +
			(hardwareCost * (costOfCapitalPercent / 100) / 12) +
			(licensingApplies ? (nvaiePrice.rate * activeGpu.gpus) / 12 : 0);
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
			gpuCost,
			hardwareCost,
			electricityCost,
			maintenanceCost,
			licensingCost,
			opportunityCost,
			grossLocalTco,
			resaleValue,
			netLocalTco,
			localCostPerHour,
			effectiveCloudRate,
			cloudRatePerGpu,
			cloudUsageCost,
			cloudStorageCost,
			cloudTco,
			cloudCostPerHour,
			localWins,
			netSavings,
			monthlyDifference,
			breakEvenMonths: breakEvenMonthFound === Infinity ? Infinity : breakEvenMonthFound,
			monthlyData,
			chartMaxMonths,
			streetPremiumPct: activeGpu.msrp ? ((gpuCost - activeGpu.msrp) / activeGpu.msrp) * 100 : null,
			licensingShareOfCapex: hardwareCost > 0 ? (licensingCost / hardwareCost) * 100 : 0,
			licensedSeats: licensingApplies ? activeGpu.gpus : 0,
			composition: [
				{ key: 'hardware', label: 'Hardware', value: hardwareCost, swatch: 'bg-[#111114]' },
				{ key: 'licences', label: 'Licences', value: licensingCost, swatch: 'bg-[#8A5A12]' },
				{ key: 'power', label: 'Power', value: electricityCost, swatch: 'bg-[#E8A33D]' },
				{ key: 'maintenance', label: 'Maintenance', value: maintenanceCost, swatch: 'bg-[#A1A1AA]' },
				{ key: 'capital', label: 'Capital', value: opportunityCost, swatch: 'bg-[#D4D4D8]' }
			]
		};
	}, [hoursPerDay, daysPerMonth, timePeriodMonths, electricityRate, storageSizeGb, systemCost, facilityCost, activeGpu, activeProvider, cloudGpuCount, resalePercent, costOfCapitalPercent, maintenanceRatePercent, licensingApplies, nvaiePrice, cloudNvaieSurcharge]);

	return (
		<>
			{/* Gutter: the bay is a light surface mounted in a dark panel, so it needs its own air. */}
			<div className="px-5 py-7 sm:px-8 sm:py-10">
			{/* Answer first: the verdict, before any control */}
			<div className="verdict-band mb-8 bg-[#0E1116] px-6 py-7 text-white sm:px-8 sm:py-9">
				<div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
					<div className="min-w-0">
						<p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] vb-dim">
							Verdict · {timePeriodMonths} month horizon
						</p>
						<p className="mt-3 text-[30px] font-bold leading-none tracking-tight sm:text-[40px]">
							<span className="vb-soft">{calculations.localWins ? 'Owning saves' : 'Renting saves'}</span>{' '}
							<span className={calculations.localWins ? 'text-emerald-400' : 'text-[#F0B457]'}>
								<AnimatedCounter value={calculations.netSavings} formatter={formatCurrency} />
							</span>
						</p>
						<p className="mt-3 max-w-xl text-sm leading-6 vb-soft">
							{calculations.localWins
								? Number.isFinite(calculations.breakEvenMonths)
									? `Break-even lands at month ${calculations.breakEvenMonths}. Every month past it is margin.`
									: 'Break-even sits beyond the 84-month search window at this utilisation.'
								: 'No break-even inside 84 months at this utilisation — the hardware never repays itself.'}
						</p>

						{/* Two bars, same scale: the whole comparison in one glance */}
						<div className="mt-6 space-y-3">
							{[
								{ label: 'Owned', value: calculations.netLocalTco, tone: 'bg-emerald-400' },
								{ label: 'Rented', value: calculations.cloudTco, tone: 'bg-cyan-400' }
							].map((row) => (
								<div key={row.label} className="flex items-center gap-3">
									<span className="w-14 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] vb-dim">{row.label}</span>
									<div className="h-1.5 min-w-0 flex-1 bg-white/[0.08]">
										<div
											className={`${row.tone} transition-[width] duration-500 ease-out`}
											style={{ width: `${Math.min(100, (row.value / Math.max(1, Math.max(calculations.netLocalTco, calculations.cloudTco))) * 100)}%`, height: '100%' }}
										/>
									</div>
									<span className="w-24 shrink-0 text-right font-mono tabular-nums text-[11px] font-bold vb-bright">
										{formatCurrency(row.value)}
									</span>
								</div>
							))}
						</div>
					</div>

					{/* The three numbers that decide it */}
					<div className="grid shrink-0 grid-cols-3 gap-x-6 gap-y-4 border-t border-white/10 pt-6 sm:gap-x-10 xl:border-l xl:border-t-0 xl:pl-10 xl:pt-0">
						{[
							{ label: 'Owned $/hr', value: `$${calculations.localCostPerHour.toFixed(2)}` },
							{ label: 'Rented $/hr', value: `$${calculations.cloudCostPerHour.toFixed(2)}` },
							{
								label: 'Street vs list',
								value: calculations.streetPremiumPct === null
									? 'n/a'
									: `${calculations.streetPremiumPct > 0 ? '+' : ''}${calculations.streetPremiumPct.toFixed(0)}%`
							}
						].map((stat) => (
							<div key={stat.label}>
								<p className="font-mono text-[9px] uppercase tracking-[0.18em] vb-dim">{stat.label}</p>
								<p className="mt-1 font-mono tabular-nums text-lg font-bold text-white">{stat.value}</p>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Preset Comparison Banner */}
			<div className="mb-8 bg-white border border-[#E3E3E7] rounded-lg p-6 sm:p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
				<div>
					<div className="flex items-center gap-2.5">
						<ArrowLeftRight className="h-4 w-4 text-[#111114]" strokeWidth={1.75} />
						<h3 className="text-lg font-bold text-[#111114]">Compare Blackwell 96GB vs Cloud Renting Options</h3>
					</div>
					<p className="text-sm text-[#716F6F] font-medium mt-1.5 leading-relaxed">Quick-load 1x RTX Pro 6000 Blackwell (96GB) against 1x 96GB Cloud GPU or 2x RTX 6000 Ada (48GB x 2 = 96GB pooled).</p>
				</div>
				<div className="flex flex-wrap gap-3 w-full lg:w-auto shrink-0">
					<button
						type="button"
						onClick={() => applyPreset('blackwell-vs-cloud-96')}
						className="px-4 py-2.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-[0.12em] bg-[#111114] text-white hover:bg-[#2A2A32] transition cursor-pointer"
					>
						1x Blackwell (96GB) vs 1x Cloud (96GB)
					</button>
					<button
						type="button"
						onClick={() => applyPreset('blackwell-vs-2x-ada')}
						className="px-4 py-2.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-[0.12em] border border-[#D6D6DB] bg-white text-[#111114] hover:bg-[#F4F4F6] transition cursor-pointer"
					>
						1x Blackwell vs 2x RTX 6000 Ada
					</button>
				</div>
			</div>

			{/* Active Comparison Status Bar */}
			<div className="mb-6 bg-[#FAFAFA] border border-[#E3E3E7] rounded-lg px-4 py-3.5 sm:px-5 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
				<div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
					<span className="flex h-2 w-2 rounded-full bg-[#111114] animate-pulse motion-reduce:animate-none" />
					<span className="text-xs font-mono tabular-nums font-bold uppercase tracking-wider text-gray-400">Comparing:</span>
					<span className="text-sm font-bold text-[#111114]">
						LOCAL · {activeGpu.name.split(' — ')[0]}
					</span>
					<span className="text-xs text-gray-400 font-mono tabular-nums">vs</span>
					<span className="text-sm font-bold text-[#3F3F46]">
						CLOUD · {cloudGpuCount}x {activeProvider.providerName} {activeProvider.gpuModel}
					</span>
				</div>
				<div className="self-start lg:self-auto text-[10px] font-mono tabular-nums bg-white text-[#3F3F46] border border-[#E3E3E7] px-2.5 py-1 rounded-sm font-bold uppercase tracking-[0.12em]">
					Active Cloud Option: {activeProvider.providerName}
				</div>
			</div>

			<div className="space-y-6">
					{/* Usage Pattern Card */}
					<div className="bg-white border border-[#E3E3E7] rounded-lg p-6 sm:p-7 space-y-7">
						<div className="flex items-center gap-3 border-b border-[#E3E3E7] pb-4">
							<SlidersHorizontal className="h-4 w-4 shrink-0 text-[#111114]" strokeWidth={1.75} />
							<h3 className="text-[12px] font-mono font-bold uppercase tracking-[0.18em] text-[#111114]">Your workload · both sides</h3>
						</div>

						{/* Hours per Day Slider */}
						<div className="space-y-2">
							<div className="flex justify-between items-center text-[13px] font-semibold text-[#3F3F46]">
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
							<div className="flex justify-between text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#71717A] font-mono tabular-nums">
								<span>1 hour</span>
								<span>24 hours</span>
							</div>
						</div>

						{/* Days per Month Slider */}
						<div className="space-y-2">
							<div className="flex justify-between items-center text-[13px] font-semibold text-[#3F3F46]">
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
							<div className="flex justify-between text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#71717A] font-mono tabular-nums">
								<span>1 day</span>
								<span>30 days</span>
							</div>
						</div>

						{/* Evaluation Horizon Slider */}
						<div className="space-y-2">
							<div className="flex justify-between items-center text-[13px] font-semibold text-[#3F3F46]">
								<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
									<span className="whitespace-nowrap">Evaluation Horizon</span>
									<span className="shrink-0 whitespace-nowrap text-[10px] text-[#8A5A12] font-mono tabular-nums font-bold bg-[#FDF6EA] px-2 py-0.5 rounded-sm border border-[#EBD9B8]">
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
										className={`px-3 py-1.5 rounded-lg text-xs font-mono tabular-nums font-extrabold transition cursor-pointer ${
											timePeriodMonths === horizon.months
												? 'bg-[#111114] text-white'
												: 'bg-white border border-[#D6D6DB] text-[#716F6F] hover:text-[#111114] hover:border-gray-400'
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
							<div className="flex justify-between text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#71717A] font-mono tabular-nums">
								<span>1 mo</span>
								<span>36 mo (3 yrs)</span>
								<span>60 mo (5 yrs)</span>
								<span>84 mo (7 yrs)</span>
							</div>
						</div>

						{/* Computed Monthly Hours Summary */}
						<div className="rounded-lg border border-[#E3E3E7] bg-[#FAFAFA] p-4">
							<p className="font-mono tabular-nums text-xs uppercase tracking-wider font-bold text-[#8C8C8C]">Monthly Usage</p>
							<p className="mt-1 font-mono tabular-nums text-2xl font-bold tracking-tight text-[#111114]">
								<AnimatedCounter value={calculations.monthlyHours} formatter={(v) => `${Math.round(v)} hours`} />
							</p>
						</div>
					</div>

				{/* The two paths, side by side. Each column owns its own inputs. */}
				<div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
					<div className="space-y-6">
						{/* Track 1 — what owning costs */}
						<div className="rounded-lg border border-[#D6E4DB] border-l-4 border-l-emerald-600 bg-[#F6FAF7] px-4 py-3 flex items-end justify-between gap-4">
							<div className="min-w-0">
								<p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-800">Own it · on-premise</p>
								<p className="mt-1 text-xs font-medium leading-5 text-[#52525B]">Capital, power, maintenance and licences — paid whether or not a job runs.</p>
							</div>
							<p className="shrink-0 font-mono text-lg font-bold tabular-nums text-[#111114]">
								${calculations.localCostPerHour.toFixed(2)}<span className="text-[11px] font-semibold text-[#52525B]">/hr</span>
							</p>
						</div>
						{/* Select GPU Card */}
						<div className="bg-white border border-[#E3E3E7] rounded-lg p-6 sm:p-7 space-y-7 border-l-4 border-l-emerald-600">
							<div className="flex items-center gap-3 border-b border-[#E3E3E7] pb-4">
								<Cpu className="h-4 w-4 shrink-0 text-[#111114]" strokeWidth={1.75} />
								<h3 className="text-[12px] font-mono font-bold uppercase tracking-[0.18em] text-[#111114]">On-premise hardware</h3>
							</div>

							<div>
								<label htmlFor="gpu-select" className="sr-only">GPU Model Option</label>
								<select
									id="gpu-select"
									value={selectedGpuId}
									onChange={(e) => setSelectedGpuId(e.target.value)}
									className="w-full rounded-lg border border-[#E3E3E7] bg-white px-4 py-3 text-sm font-bold text-[#111114] outline-none focus:border-[#8A5A12] cursor-pointer"
								>
									{Object.entries(TIER_LABELS).map(([tier, label]) => {
										const models = GPU_MODELS.filter(g => g.tier === tier);
										if (models.length === 0) return null;
										return (
											<optgroup key={tier} label={label}>
												{models.map(g => (
													<option key={g.id} value={g.id}>{g.name}</option>
												))}
											</optgroup>
										);
									})}
								</select>
							</div>

							{/* Street price vs launch list, carried from the 2026 valuation */}
							<div className="grid grid-cols-2 gap-4">
								<div className="rounded-lg border border-[#E3E3E7] bg-[#FAFAFA] p-4">
									<p className="text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#71717A]">Street Cost</p>
									<p className="text-lg font-black text-emerald-600 mt-1 font-mono tabular-nums">{formatCurrency(activeGpu.cost)}</p>
									<p className="text-[11px] font-mono tabular-nums text-[#8C8C8C] mt-1">
										{activeGpu.msrp ? `List ${formatCurrency(activeGpu.msrp)}` : 'No published list price'}
									</p>
								</div>
								<div className="rounded-lg border border-[#E3E3E7] bg-[#FAFAFA] p-4">
									<p className="text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#71717A]">Street vs List</p>
									<p className={`text-lg font-black mt-1 font-mono tabular-nums ${
										calculations.streetPremiumPct === null
											? 'text-[#716F6F]'
											: calculations.streetPremiumPct > 0 ? 'text-red-600' : 'text-emerald-600'
									}`}>
										{calculations.streetPremiumPct === null
											? 'n/a'
											: `${calculations.streetPremiumPct > 0 ? '+' : ''}${calculations.streetPremiumPct.toFixed(0)}%`}
									</p>
									<p className="text-[11px] font-mono tabular-nums text-[#8C8C8C] mt-1">consumer tier averages +28%</p>
								</div>
								<div className="rounded-lg border border-[#E3E3E7] bg-[#FAFAFA] p-4">
									<p className="text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#71717A]">Power Draw (TDP)</p>
									<p className="text-lg font-black text-amber-600 mt-1 font-mono tabular-nums">{activeGpu.tdp}W</p>
									<p className="text-[11px] font-mono tabular-nums text-[#8C8C8C] mt-1">+250W chassis base</p>
								</div>
								<div className="rounded-lg border border-[#E3E3E7] bg-[#FAFAFA] p-4">
									<p className="text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#71717A]">VRAM / Bandwidth</p>
									<p className="text-lg font-black text-[#111114] mt-1 font-mono tabular-nums">{activeGpu.vram}</p>
									<p className="text-[11px] font-mono tabular-nums text-[#8C8C8C] mt-1">{activeGpu.bandwidth || 'not published'}</p>
								</div>
							</div>

							{activeGpu.marketNote && (
								<p className="text-xs font-semibold text-[#5A7A8F] bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
									{activeGpu.marketNote}
								</p>
							)}

							{/* Sub card: 3-Year Resale Value % Slider */}
							<div className="bg-white border border-[#E3E3E7] rounded-lg p-5 sm:p-6 space-y-3.5">
								<div className="flex justify-between items-center text-[13px] font-semibold text-[#3F3F46]">
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
								<div className="flex justify-between text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#71717A] font-mono tabular-nums">
									<span>0% (Full loss)</span>
									<span>20% (Default)</span>
									<span>50% (High return)</span>
								</div>
								<p className="text-xs font-semibold text-emerald-700 font-mono tabular-nums mt-1 pt-1 border-t border-[#E3E3E7]">
									Estimated Salvage Recovery: {formatCurrency(calculations.resaleValue)} after 36 months
								</p>
							</div>

							{/* Sub card: Annual Cost of Capital / Opportunity Cost (%) Slider */}
							<div className="bg-white border border-[#E3E3E7] rounded-lg p-5 sm:p-6 space-y-3.5">
								<div className="flex justify-between items-center text-[13px] font-semibold text-[#3F3F46]">
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
								<div className="flex justify-between text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#71717A] font-mono tabular-nums">
									<span>0% (Cash/Zero cost)</span>
									<span>5% (Treasury Yield)</span>
									<span>15% (High Debt/WACC)</span>
								</div>
								<p className="text-xs font-semibold text-amber-700 font-mono tabular-nums mt-1 pt-1 border-t border-[#E3E3E7]">
									Opportunity Cost of Locked CapEx: +{formatCurrency(calculations.opportunityCost)} over {timePeriodMonths} mo
								</p>
							</div>

							{/* Sub card: System components price slider */}
							<div className="bg-white border border-[#E3E3E7] rounded-lg p-5 sm:p-6 space-y-3.5">
								<div className="flex justify-between items-center text-[13px] font-semibold text-[#3F3F46]">
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
								<div className="flex justify-between text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#71717A] font-mono tabular-nums">
									<span>$0</span>
									<span>$5,000</span>
								</div>
							</div>

							{/* Sub card: Electricity Rate Slider */}
							<div className="bg-white border border-[#E3E3E7] rounded-lg p-5 sm:p-6 space-y-3.5">
								<div className="flex justify-between items-center text-[13px] font-semibold text-[#3F3F46]">
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
								<div className="flex justify-between text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#71717A] font-mono tabular-nums">
									<span>$0.05/kWh</span>
									<span>$0.60/kWh</span>
								</div>
							</div>
						</div>

						{/* Operating cost model card */}
						<div className="bg-white border border-[#E3E3E7] rounded-lg p-6 space-y-5 border-l-4 border-l-cyan-600">
							<div className="flex items-center gap-3 border-b border-[#E3E3E7] pb-4">
								<Receipt className="h-4 w-4 shrink-0 text-[#111114]" strokeWidth={1.75} />
								<h3 className="text-[12px] font-mono font-bold uppercase tracking-[0.18em] text-[#111114]">On-premise running cost</h3>
							</div>

							{/* NVIDIA AI Enterprise licensing */}
							<label className="flex items-start gap-3 cursor-pointer">
								<input
									type="checkbox"
									checked={softwareLicensingOn}
									onChange={(e) => setSoftwareLicensingOn(e.target.checked)}
									className="mt-0.5 h-4 w-4 shrink-0 accent-[#111114] cursor-pointer"
								/>
								<span className="min-w-0">
									<span className="block text-sm font-bold text-[#111114]">NVIDIA AI Enterprise licence</span>
									<span className="mt-0.5 block text-xs font-medium text-[#716F6F] leading-5">
										{needsNvaie(activeGpu)
											? `${formatCurrency(nvaiePrice.rate)}/GPU/yr at the ${nvaiePrice.label} tier × ${activeGpu.gpus} GPU${activeGpu.gpus > 1 ? 's' : ''} in this system.`
											: 'Not required by this part. The toggle bills NVIDIA data-center and certified workstation accelerators only.'}
									</span>
								</span>
							</label>

							{/* Fleet size drives the volume tier */}
							<div className="flex justify-between items-center gap-3 text-[13px] font-semibold text-[#3F3F46]">
								<span className="leading-5">GPUs under management<span className="block text-[11px] font-mono tabular-nums font-semibold text-[#8C8C8C]">sets the NVAIE volume tier</span></span>
								<InteractiveBadge
									value={fleetGpuCount}
									min={1}
									max={5000}
									step={1}
									unit="gpus"
									onChange={setFleetGpuCount}
								/>
							</div>
							<p className="text-[11px] font-mono tabular-nums font-semibold text-[#3F3F46] bg-[#FAFAFA] border border-[#E3E3E7] rounded-lg px-3 py-2">
								Tier in force: {nvaiePrice.label} — {formatCurrency(nvaiePrice.rate)}/GPU/yr. Volume tiers start at 100 GPUs.
							</p>

							<div className="border-t border-[#E3E3E7] pt-4 space-y-3">
								<div className="flex justify-between items-center gap-3 text-[13px] font-semibold text-[#3F3F46]">
									<span className="leading-5">Maintenance reserve<span className="block text-[11px] font-mono tabular-nums font-semibold text-[#8C8C8C]">% of hardware cost per year</span></span>
									<InteractiveBadge
										value={maintenanceRatePercent}
										min={0}
										max={20}
										step={0.5}
										unit="%"
										onChange={setMaintenanceRatePercent}
									/>
								</div>
								<CustomSlider
									min={0}
									max={20}
									step={0.5}
									value={maintenanceRatePercent}
									onChange={setMaintenanceRatePercent}
								/>
								<p className="text-[11px] font-mono tabular-nums font-semibold text-[#8C8C8C]">
									Extended 3-year OEM coverage prices at ~8% of system cost; claim rates are climbing.
								</p>
							</div>

							<div className="border-t border-[#E3E3E7] pt-4 space-y-3">
								<div className="flex justify-between items-center gap-3 text-[13px] font-semibold text-[#3F3F46]">
									<span className="leading-5">Rack commissioning<span className="block text-[11px] font-mono tabular-nums font-semibold text-[#8C8C8C]">one-time facility & integration</span></span>
									<InteractiveBadge
										value={facilityCost}
										min={0}
										max={50000}
										step={250}
										prefix="$"
										onChange={setFacilityCost}
									/>
								</div>
								<CustomSlider
									min={0}
									max={50000}
									step={250}
									value={facilityCost}
									onChange={setFacilityCost}
								/>
								<p className="text-[11px] font-mono tabular-nums font-semibold text-[#8C8C8C]">
									Commissioning runs $4,950–$7,500 per rack. Liquid-cooling retrofits are excluded.
								</p>
							</div>

						</div>
					</div>
					<div className="space-y-6">
						{/* Track 2 — what renting costs */}
						<div className="rounded-lg border border-[#CFE3EA] border-l-4 border-l-cyan-600 bg-[#F5FAFC] px-4 py-3 flex items-end justify-between gap-4">
							<div className="min-w-0">
								<p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-800">Rent it · cloud</p>
								<p className="mt-1 text-xs font-medium leading-5 text-[#52525B]">Rate × hours, plus storage and licence surcharges.</p>
							</div>
							<p className="shrink-0 font-mono text-lg font-bold tabular-nums text-[#111114]">
								${calculations.cloudCostPerHour.toFixed(2)}<span className="text-[11px] font-semibold text-[#52525B]">/hr</span>
							</p>
						</div>
						{/* Select Cloud Provider Card */}
						<div className="bg-white border border-[#E3E3E7] rounded-lg p-6 sm:p-7 space-y-7 border-l-4 border-l-emerald-600">
							<div className="flex items-center gap-3 border-b border-[#E3E3E7] pb-4">
								<Cloud className="h-4 w-4 shrink-0 text-[#111114]" strokeWidth={1.75} />
								<h3 className="text-[12px] font-mono font-bold uppercase tracking-[0.18em] text-[#111114]">Rented capacity</h3>
							</div>

							<div>
								<label htmlFor="cloud-provider-select" className="sr-only">Compare Cloud Provider & GPU</label>
								<select
									id="cloud-provider-select"
									value={selectedProviderId}
									onChange={(e) => setSelectedProviderId(e.target.value)}
									className="w-full rounded-lg border border-[#E3E3E7] bg-white px-4 py-3 text-sm font-bold text-[#111114] outline-none focus:border-[#8A5A12] cursor-pointer"
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
							<div className="bg-white border border-[#E3E3E7] rounded-lg p-5 space-y-5">
								<div className="space-y-2">
									<div className="flex justify-between items-center text-[13px] font-semibold text-[#3F3F46]">
										<span>Number of Cloud GPUs to Rent</span>
										<div className="flex gap-2">
											{[1, 2, 4, 8].map((qty) => (
												<button
													key={qty}
													type="button"
													onClick={() => setCloudGpuCount(qty)}
													className={`px-3 py-1 rounded-lg text-xs font-mono tabular-nums font-extrabold transition cursor-pointer ${
														cloudGpuCount === qty
															? 'bg-[#111114] text-white'
															: 'bg-white border border-[#D6D6DB] text-[#716F6F] hover:text-[#111114]'
													}`}
												>
													{qty}x
												</button>
											))}
										</div>
									</div>
									<p className="text-xs font-semibold text-cyan-700 font-mono tabular-nums">
										Effective Hourly Rate: {cloudGpuCount}x @ ${activeProvider.rate.toFixed(2)} = ${calculations.effectiveCloudRate.toFixed(2)}/hr
									</p>
								</div>

								<div className="border-t border-[#E3E3E7] pt-4 space-y-3">
									<div className="flex justify-between items-center text-[13px] font-semibold text-[#3F3F46]">
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
									<div className="flex justify-between text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#71717A] font-mono tabular-nums">
										<span>10 GB</span>
										<span>1,200 GB</span>
									</div>
								</div>
							</div>

							<div className="rounded-lg border border-[#E3E3E7] bg-[#FAFAFA] p-4 sm:p-5 space-y-3.5">
								<div className="flex justify-between text-sm">
									<span className="font-semibold text-[#8C8C8C]">Provider:</span>
									<span className="font-bold text-[#111114]">{activeProvider.providerName}</span>
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
									<span className="font-bold font-mono tabular-nums text-[#111114]">
										${activeProvider.storageRate.toFixed(2)}/GB/mo
									</span>
								</div>
							</div>
						</div>
						<div className="border-t border-[#E3E3E7] pt-4">
							<label className="flex items-start gap-3 cursor-pointer">
								<input
									type="checkbox"
									checked={cloudNvaieSurcharge}
									onChange={(e) => setCloudNvaieSurcharge(e.target.checked)}
									className="mt-0.5 h-4 w-4 shrink-0 accent-[#111114] cursor-pointer"
								/>
								<span className="min-w-0">
									<span className="block text-sm font-bold text-[#111114]">Cloud NVAIE surcharge (+$1.00/GPU-hr)</span>
									<span className="mt-0.5 block text-xs font-medium text-[#716F6F] leading-5">
										Hyperscalers bill this on top of the instance rate wherever NIM runs in production.
									</span>
								</span>
							</label>
						</div>
					</div>

					</div>
				</div>
				<div className="space-y-6">

					{/* Cost Analysis Card Styled like a Digital Receipt */}
					<div className="bg-slate-50 border border-slate-200 rounded-lg p-6 space-y-6 relative overflow-hidden">
						{/* Receipt Header */}
						<div className="text-center pb-4 border-b border-dashed border-slate-250">
							<h3 className="text-lg font-black text-[#111114] tracking-wider uppercase">GPU TCO RECEIPT</h3>
							<p className="text-[10px] font-mono tabular-nums text-gray-400 uppercase tracking-widest mt-1">Cost Analysis Breakdown</p>
							<div className="mt-2 text-xs font-extrabold text-cyan-700 text-cyan-600 uppercase tracking-wider">
								Comparing Local vs {activeProvider.providerName}
							</div>
						</div>

						{/* Local Hardware Breakdown */}
						<div className="space-y-3.5 pb-6 border-b border-dashed border-slate-250">
							<p className="text-xs font-mono tabular-nums font-bold text-[#8C8C8C] uppercase tracking-[0.2em]">
								LOCAL HARDWARE ({activeGpu.gpus > 1 ? `${activeGpu.gpus} GPUs · ${activeGpu.vram} total` : `1x ${activeGpu.vram}`})
							</p>
							
							<div className="flex justify-between items-center text-sm text-[#716F6F]">
								<div className="flex items-center gap-2">
									<Cpu className="w-4 h-4 text-[#5A7A8F] shrink-0" strokeWidth={1.5} />
									<span>GPU cost:</span>
								</div>
								<span className="font-mono tabular-nums font-bold text-[#111114]">{formatCurrency(activeGpu.cost)}</span>
							</div>
							
							<div className="flex justify-between items-center text-sm text-[#716F6F]">
								<div className="flex items-center gap-2">
									<Server className="w-4 h-4 text-[#5A7A8F] shrink-0" strokeWidth={1.5} />
									<span>System components:</span>
								</div>
								<span className="font-mono tabular-nums font-bold text-[#111114]">{formatCurrency(systemCost)}</span>
							</div>

							{facilityCost > 0 && (
								<div className="flex justify-between items-center text-sm text-[#716F6F]">
									<div className="flex items-center gap-2">
										<Wrench className="w-4 h-4 text-[#5A7A8F] shrink-0" strokeWidth={1.5} />
										<span>Rack commissioning:</span>
									</div>
									<span className="font-mono tabular-nums font-bold text-[#111114]">{formatCurrency(facilityCost)}</span>
								</div>
							)}
							
							<div className="flex justify-between items-center text-sm text-[#716F6F]">
								<div className="flex items-center gap-2">
									<Zap className="w-4 h-4 text-[#5A7A8F] shrink-0" strokeWidth={1.5} />
									<span>Electricity ({timePeriodMonths} mo):</span>
								</div>
								<span className="font-mono tabular-nums font-bold text-[#111114]">{formatCurrency(calculations.electricityCost)}</span>
							</div>
							
							<div className="flex justify-between items-center text-sm text-[#716F6F]">
								<div className="flex items-center gap-2">
									<Wrench className="w-4 h-4 text-[#5A7A8F] shrink-0" strokeWidth={1.5} />
									<span>Maintenance ({maintenanceRatePercent}%/yr):</span>
								</div>
								<span className="font-mono tabular-nums font-bold text-[#111114]">{formatCurrency(calculations.maintenanceCost)}</span>
							</div>

							{calculations.licensingCost > 0 && (
								<div className="flex justify-between items-center text-sm text-violet-700 font-medium">
									<div className="flex items-center gap-2">
										<KeyRound className="w-4 h-4 text-violet-500 shrink-0" strokeWidth={1.5} />
										<span>NVAIE ({calculations.licensedSeats} seat{calculations.licensedSeats > 1 ? 's' : ''} × {formatCurrency(nvaiePrice.rate)}/yr):</span>
									</div>
									<span className="font-mono tabular-nums font-bold">{formatCurrency(calculations.licensingCost)}</span>
								</div>
							)}

							{costOfCapitalPercent > 0 && (
								<div className="flex justify-between items-center text-sm text-amber-700 font-medium">
									<div className="flex items-center gap-2">
										<Coins className="w-4 h-4 text-[#C88D4E] shrink-0" strokeWidth={1.5} />
										<span>Cost of Capital ({costOfCapitalPercent}%/yr):</span>
									</div>
									<span className="font-mono tabular-nums font-bold">+{formatCurrency(calculations.opportunityCost)}</span>
								</div>
							)}

							<div className="flex justify-between items-center text-sm text-emerald-700 font-medium">
								<div className="flex items-center gap-2">
									<Tag className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={1.5} />
									<span>Less {timePeriodMonths >= 36 ? '3-Yr' : 'Est.'} Resale ({resalePercent}%):</span>
								</div>
								<span className="font-mono tabular-nums font-bold">-{formatCurrency(calculations.resaleValue)}</span>
							</div>

							<div className="flex justify-between items-center text-md font-extrabold text-[#111114] pt-4 border-t border-slate-200">
								<div className="flex items-center gap-2">
									<DollarSign className="w-4.5 h-4.5 text-[#111114] shrink-0" strokeWidth={1.5} />
									<span>Net Local TCO:</span>
								</div>
								<span className="font-mono tabular-nums text-xl sm:text-2xl font-bold tracking-tight text-emerald-700">
									<AnimatedCounter value={calculations.netLocalTco} formatter={formatCurrency} />
								</span>
							</div>
							
							<div className="flex justify-between text-xs text-[#8C8C8C] font-mono tabular-nums pl-6">
								<span>Cost per Hour:</span>
								<span className="font-bold text-emerald-700">${calculations.localCostPerHour.toFixed(3)}/hr</span>
							</div>

							{/* Where the owned dollar actually goes */}
							<div className="pt-4 border-t border-dashed border-slate-250">
								<p className="text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#71717A]">Cost composition</p>
								<div className="mt-2 flex h-2 w-full overflow-hidden rounded-sm bg-[#EDEDF0]" role="img" aria-label="Owned cost split by component">
									{calculations.composition.filter(c => c.value > 0).map(c => (
										<div
											key={c.key}
											className={c.swatch}
											style={{ width: `${(c.value / Math.max(1, calculations.grossLocalTco)) * 100}%` }}
										/>
									))}
								</div>
								<div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
									{calculations.composition.filter(c => c.value > 0).map(c => (
										<span key={c.key} className="flex items-center gap-1.5 text-[10px] font-mono text-[#71717A]">
											<span className={`h-2 w-2 rounded-[1px] ${c.swatch}`} />
											{c.label} {Math.round((c.value / Math.max(1, calculations.grossLocalTco)) * 100)}%
										</span>
									))}
								</div>
							</div>
						</div>

						{/* Cloud GPU Breakdown */}
						<div className="space-y-3.5 pt-2">
							<p className="text-xs font-mono tabular-nums font-bold text-[#8C8C8C] uppercase tracking-[0.2em]">{activeProvider.providerName} ({cloudGpuCount}x {activeProvider.gpuModel})</p>
							
							<div className="flex justify-between items-center text-sm text-[#716F6F]">
								<div className="flex items-center gap-2">
									<Cloud className="w-4 h-4 text-[#5A7A8F] shrink-0" strokeWidth={1.5} />
									<span>Usage ({cloudGpuCount}x @ ${calculations.cloudRatePerGpu.toFixed(2)}/hr):</span>
								</div>
								<span className="font-mono tabular-nums font-bold text-[#111114]">{formatCurrency(calculations.cloudUsageCost)}</span>
							</div>

							{cloudNvaieSurcharge && (
								<p className="text-[11px] font-mono tabular-nums font-semibold text-violet-700 pl-6">
									Includes the $1.00/GPU-hr NVAIE surcharge: {formatCurrency(cloudGpuCount * calculations.totalHours)}
								</p>
							)}

							<div className="flex justify-between items-center text-sm text-[#716F6F]">
								<div className="flex items-center gap-2">
									<Database className="w-4 h-4 text-[#5A7A8F] shrink-0" strokeWidth={1.5} />
									<span>Storage ({timePeriodMonths} mo):</span>
								</div>
								<span className="font-mono tabular-nums font-bold text-[#111114]">{formatCurrency(calculations.cloudStorageCost)}</span>
							</div>

							<div className="flex justify-between items-center text-md font-extrabold text-[#111114] pt-4 border-t border-slate-200">
								<div className="flex items-center gap-2">
									<CreditCard className="w-4.5 h-4.5 text-[#111114] shrink-0" strokeWidth={1.5} />
									<span>Total Cloud Cost:</span>
								</div>
								<span className="font-mono tabular-nums text-xl sm:text-2xl font-bold tracking-tight text-[#111114]">
									<AnimatedCounter value={calculations.cloudTco} formatter={formatCurrency} />
								</span>
							</div>
							
							<div className="flex justify-between text-xs text-[#8C8C8C] font-mono tabular-nums pl-6">
								<span>Cost per Hour:</span>
								<span className="font-bold text-[#111114]">${calculations.cloudCostPerHour.toFixed(3)}/hr</span>
							</div>
						</div>
					</div>

					{/* Verdict Card */}
					<div 
						className={`border-2 rounded-lg transition duration-300 ${
							calculations.localWins 
								? 'border-emerald-600 bg-emerald-50/30' 
								: 'border-[#111114] bg-[#FAFAFA]'
						}`}
					>
						<div className="p-6">
							<span className={`inline-flex rounded-full px-3 py-1 font-mono tabular-nums text-[0.68rem] uppercase tracking-[0.24em] font-bold ${
								calculations.localWins 
									? 'bg-emerald-50 text-emerald-800 border border-emerald-600/40' 
									: 'bg-[#F4F4F6] text-[#111114] border border-[#111114]/25'
							}`}>
								{calculations.localWins ? 'Local wins' : 'Cloud wins'}
							</span>

							<h3 className="mt-4 text-[26px] font-bold leading-tight tracking-tight text-[#111114]">
								{calculations.localWins ? (
									<>
										Local saves <span className="text-emerald-700 font-black"><AnimatedCounter value={calculations.netSavings} formatter={formatCurrency} /></span>
									</>
								) : (
									<>
										Cloud saves <span className="text-[#111114] font-black"><AnimatedCounter value={calculations.netSavings} formatter={formatCurrency} /></span>
									</>
								)}
							</h3>

							<p className="mt-3 text-sm leading-relaxed text-[#716F6F] font-medium">
								{calculations.localWins 
									? `Local hardware pays off after ${Number.isFinite(calculations.breakEvenMonths) ? `${calculations.breakEvenMonths} months` : 'Never'}.`
									: 'Renting on demand prevents costly hardware depreciation and upfront CapEx.'
								}
							</p>

							{/* Direct Provider Link CTA inside Verdict Box */}
							<div className="mt-6 pt-5 border-t border-[#E3E3E7]/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
								<div>
									<span className="text-[10px] text-[#8C8C8C] uppercase tracking-wider font-mono tabular-nums font-bold block">Selected Cloud Provider</span>
									<div className="flex items-center gap-2 mt-0.5">
										<span className="text-sm font-bold text-[#111114]">{activeProvider.providerName}</span>
										<span className="text-xs text-[#8C8C8C] font-mono tabular-nums">({cloudGpuCount}x {activeProvider.gpuModel})</span>
									</div>
								</div>
								<a
									href={activeProvider.affiliateUrl}
									target="_blank"
									rel="noopener noreferrer"
									className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 text-white ${
										calculations.localWins
											? 'bg-emerald-500 hover:bg-emerald-400'
											: 'bg-[#111114] hover:bg-[#2A2A32]'
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
						<div className="bg-white border border-[#E3E3E7] rounded-lg p-5">
							<p className="text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#71717A]">Break-Even Point</p>
							<p className="text-2xl font-black text-[#111114] mt-1.5 font-mono tabular-nums">
								{Number.isFinite(calculations.breakEvenMonths)
									? calculations.breakEvenMonths > 12
										? `Mo ${calculations.breakEvenMonths} (${(calculations.breakEvenMonths / 12).toFixed(1)} yrs)`
										: `Month ${calculations.breakEvenMonths}`
									: '> 7 Years'}
							</p>
						</div>
						<div className="bg-white border border-[#E3E3E7] rounded-lg p-5">
							<p className="text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#71717A]">Resale Value Recovery</p>
							<p className="text-2xl font-black text-emerald-600 mt-1.5 font-mono tabular-nums">
								{formatCurrency(calculations.resaleValue)}
							</p>
						</div>
						<div className="bg-white border border-[#E3E3E7] rounded-lg p-5">
							<p className="text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#71717A]">Street Premium vs List</p>
							<p className="text-2xl font-black text-[#111114] mt-1.5 font-mono tabular-nums">
								{calculations.streetPremiumPct === null
									? 'n/a'
									: `${calculations.streetPremiumPct > 0 ? '+' : ''}${calculations.streetPremiumPct.toFixed(0)}%`}
							</p>
							<p className="text-[11px] font-mono tabular-nums text-[#8C8C8C] mt-1">
								{activeGpu.msrp ? `${formatCurrency(activeGpu.cost)} vs ${formatCurrency(activeGpu.msrp)} list` : 'no published list'}
							</p>
						</div>
						<div className="bg-white border border-[#E3E3E7] rounded-lg p-5">
							<p className="text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#71717A]">Software Licensing</p>
							<p className="text-2xl font-black text-violet-600 mt-1.5 font-mono tabular-nums">
								{formatCurrency(calculations.licensingCost)}
							</p>
							<p className="text-[11px] font-mono tabular-nums text-[#8C8C8C] mt-1">
								{calculations.licensingCost > 0
									? `${calculations.licensingShareOfCapex.toFixed(0)}% of hardware capex`
									: 'not in scope for this part'}
							</p>
						</div>
					</div>
				</div>
			{/* Interactive Break-Even & Renting vs Owning Chart Section */}
			<div className="mt-12 bg-white border border-[#E3E3E7] rounded-lg p-6 sm:p-8 lg:p-10 space-y-7">
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
					<div>
						<h3 className="text-2xl font-bold text-[#111114]">Renting vs. Owning Cumulative Cost Timeline</h3>
						<p className="text-[#8C8C8C] text-xs mt-1">
							Graph of cumulative expenditures over time (0 to 36 months). Intersecting lines graphically highlight the exact Break-Even point.
						</p>
					</div>
					<div className="flex items-center gap-4 text-xs font-mono tabular-nums">
						<div className="flex items-center gap-2">
							<span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_#10b981]"></span>
							<span className="text-[#716F6F] font-bold">Local Owning Net TCO</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="w-3 h-3 rounded-full bg-cyan-500 inline-block shadow-[0_0_8px_#22d3ee]"></span>
							<span className="text-[#716F6F] font-bold">Cloud Renting ({cloudGpuCount}x)</span>
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
			<div className="mt-12 border-t border-[#E3E3E7]/80 pt-12 space-y-8">
				<div>
					<h3 className="text-2xl font-bold text-[#111114] sm:text-3xl">Cloud GPU Directory & Price Explorer</h3>
					<p className="text-[#716F6F] text-sm mt-2">
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
							className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
								activeTab === tab
									? 'bg-[#111114] text-white'
									: 'bg-white border border-[#D6D6DB] text-[#716F6F] hover:text-[#111114] hover:border-gray-400'
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
						className="w-full pl-4 pr-10 py-2.5 rounded-lg text-xs bg-white border border-[#E3E3E7] text-[#111114] placeholder-slate-400 focus:outline-none focus:border-[#8A5A12] transition"
					/>
					<Search className="absolute right-3 top-3 h-3.5 w-3.5 text-[#71717A]" strokeWidth={1.75} />
				</div>
			</div>

			{/* List layout of Providers */}
			<div className="space-y-8">
				{filteredProviders.length === 0 ? (
					<div className="text-center py-12 bg-white border border-[#DDDDE2] rounded-lg">
						<p className="text-[#8C8C8C] text-sm">No GPU cloud services found matching your criteria.</p>
					</div>
				) : (
					filteredProviders.map(p => (
						<div key={p.id} className="bg-white border border-[#E3E3E7] rounded-lg p-6 lg:p-8 space-y-6 transition-[border-color,background-color,box-shadow,transform] duration-300 hover:border-[#111114] ">
							{/* Provider header info */}
							<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E3E3E7] pb-5">
								<div className="space-y-2">
									<div className="flex items-center gap-3">
										<h4 className="text-xl font-bold text-[#111114]">{p.name}</h4>
										<span className={`text-[9px] uppercase tracking-widest font-mono tabular-nums font-bold px-2.5 py-0.5 rounded-full ${
											p.type === 'Enterprise'
												? 'bg-purple-100 text-purple-700 border border-purple-300'
												: p.type === 'Decentralized'
													? 'bg-amber-100 text-amber-700 border border-amber-300'
													: 'bg-[#F4F4F6] text-[#3F3F46] border border-[#E3E3E7]'
										}`}>
											{p.type}
										</span>
									</div>
									<p className="text-xs text-[#716F6F] max-w-3xl leading-5">{p.description}</p>
								</div>

								<a
									href={p.affiliateUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center justify-center px-4 py-2 text-[11px] font-mono font-bold uppercase tracking-[0.12em] text-[#111114] border border-[#D6D6DB] bg-white hover:bg-[#F4F4F6] transition"
								>
									{p.ctaText || 'Visit site →'}
								</a>
							</div>

							{/* Provider specs meta */}
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono tabular-nums text-[#8C8C8C]">
								<div className="bg-[#FAFAFA] p-3.5 rounded-lg border border-[#E3E3E7]">
									<span className="text-[10px] uppercase tracking-wider block">Billing Unit</span>
									<span className="text-[#111114] mt-1 block font-bold">{p.billingUnit}</span>
								</div>
								<div className="bg-[#FAFAFA] p-3.5 rounded-lg border border-[#E3E3E7]">
									<span className="text-[10px] uppercase tracking-wider block">Network Egress</span>
									<span className="text-emerald-600 mt-1 block font-bold">{p.egress}</span>
								</div>
								<div className="bg-[#FAFAFA] p-3.5 rounded-lg border border-[#E3E3E7]">
									<span className="text-[10px] uppercase tracking-wider block">Storage Cost</span>
									<span className="text-cyan-600 mt-1 block font-bold">{p.storageCost}</span>
								</div>
							</div>

							{/* GPU Configs Table/List */}
							<div className="overflow-x-auto rounded-lg border border-[#DDDDE2] bg-gray-50/20">
								<table className="w-full text-left border-collapse min-w-[600px]">
									<thead>
										<tr className="border-b border-[#DDDDE2] bg-[#FAFAFA] text-[10px] font-mono tabular-nums uppercase tracking-wider text-[#8C8C8C]">
											<th className="py-3 px-4">GPU Model</th>
											<th className="py-3 px-4">VRAM</th>
											<th className="py-3 px-4 text-right">Rate ($/hr)</th>
											<th className="py-3 px-4 text-center">Alternatives / Spot</th>
											<th className="py-3 px-4 text-right">Compare</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-100 text-xs font-mono tabular-nums">
										{p.gpus.map((gpu) => {
											const presetId = `${p.id}-${gpu.gpuModel.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
											const isCurrentlySelected = selectedPresetId === presetId;

											return (
												<tr key={gpu.gpuModel} className={`hover:bg-slate-100/30 transition ${isCurrentlySelected ? 'bg-cyan-500/5' : ''}`}>
													<td className="py-3.5 px-4 font-semibold text-[#716F6F]">{gpu.gpuModel}</td>
													<td className="py-3.5 px-4 text-[#716F6F]">{gpu.vram}</td>
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
																	: 'bg-[#111114] text-white hover:bg-[#2A2A32]'
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
							<text x={padding.left - 10} y={y + 4} textAnchor="end" className="text-xs font-mono tabular-nums font-bold fill-slate-600">
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
							<text x={x} y={height - padding.bottom + 22} textAnchor="middle" className="text-xs font-mono tabular-nums font-bold fill-slate-600">
								m{m}
							</text>
						</g>
					);
				})}

				{/* Area chart gradients */}
				<path d={cloudAreaPath} fill="url(#cloudAreaGradient)" />
				<path d={localAreaPath} fill="url(#localAreaGradient)" />

				{/* Cloud TCO Line (Cyan) */}
				<path d={cloudPath} fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" className="" />

				{/* Local Owning Net TCO Line (Emerald) */}
				<path d={localPath} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" className="" />

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
							className="animate-ping motion-reduce:animate-none opacity-35" 
							style={{ transformOrigin: `${breakEvenX}px ${breakEvenY}px` }} 
						/>
						{/* Pulsing dot intersection */}
						<circle cx={breakEvenX} cy={breakEvenY} r="8" fill="#f59e0b" className="" />
						<circle cx={breakEvenX} cy={breakEvenY} r="4" fill="#ffffff" />
						
						{/* Static Label (Optional indicator if not hovered) */}
						<g transform={`translate(${Math.min(breakEvenX, width - 150)}, ${padding.top - 20})`}>
							<rect x="-10" y="-14" width="145" height="22" rx="11" fill="#f59e0b" />
							<text x="62.5" y="1" textAnchor="middle" className="text-[10px] font-black font-sans fill-slate-950 uppercase tracking-wider">
								BREAK-EVEN
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
							<g transform="translate(-75, -70)" className="">
								<rect width="150" height="24" rx="12" fill="#ffffff" stroke="#10b981" strokeWidth="1.5" />
								<text x="75" y="15" textAnchor="middle" className="text-[9px] font-black font-sans fill-[#1a1a1a] tracking-wider uppercase">
									RESALE OFFSET −{resalePercent}%
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
					className="absolute z-30 pointer-events-none bg-[#111114] text-white rounded-md p-2.5 text-xs font-mono tabular-nums border border-white/10 max-w-[200px]"
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
				<div className="mt-4 bg-white border border-[#DDDDE2] rounded-lg p-4 text-sm font-mono tabular-nums flex flex-wrap justify-between items-center gap-4">
					<span className="text-[#111114] font-extrabold text-base">Month {activePoint.month}</span>
					<span className="text-[#111114] font-bold">Local Net TCO: {formatCurrency(activePoint.netLocal)}</span>
					<span className="text-cyan-600 font-bold">Cloud TCO: {formatCurrency(activePoint.cloud)}</span>
					<span className="text-amber-700 font-bold">
						{activePoint.cloud > activePoint.netLocal
							? `Local Net Savings: ${formatCurrency(activePoint.cloud - activePoint.netLocal)}`
							: `Cloud Net Savings: ${formatCurrency(activePoint.netLocal - activePoint.cloud)}`}
					</span>
				</div>
			) : (
				<div className="mt-4 bg-white border border-[#DDDDE2] rounded-lg p-3 text-xs font-mono tabular-nums text-[#8C8C8C] text-center">
					Hover over any month on the graph to inspect exact TCO numbers & savings breakdown.
				</div>
			)}
		</div>
	);
}
