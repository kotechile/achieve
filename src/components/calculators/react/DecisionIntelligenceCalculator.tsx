import React, { useState, useMemo, useEffect } from 'react';
import {
	DecisionIntelligenceEngine,
	type DecisionIntelligenceInputs
} from '../../../lib/calculators/decisionIntelligence';
import { formatCurrency } from '../../../lib/calculators/format';

const INITIAL_INPUTS: DecisionIntelligenceInputs = {
	activeMode: 'enterprise_ciam',

	// Enterprise CIAM inputs
	mau: 25000,
	devRate: 85,
	buildTime: 3,
	maintFte: 50,
	complianceLevel: 'soc2',
	codebaseAge: 3,
	remediationHours: 40,
	hasSunkCostFallacy: false,
	hasKeyPersonRisk: false,
	hasTinkeringTax: false,

	// Personal CPU inputs (Espresso vs Cafe)
	cpuStickerPrice: 3000,
	cpuSecondaryCost: 1.5,
	cpuOutsourceCost: 6,
	cpuWeeklyUses: 5,
	cpuLifespanYears: 5,
	cpuAspirationalCheck: false,

	// Personal Repair inputs
	repairAssetType: 'infrastructure',
	repairAssetAge: 11,
	repairCost: 600,

	// Personal Tinkering inputs
	tinkerTroubleshootHours: 4,
	tinkerTimeValue: 50,
	tinkerSubscriptionCost: 15,
	tinkerAspirationalCheck: false
};

const MODE_PRESETS = {
	coffee: {
		cpuStickerPrice: 3000,
		cpuSecondaryCost: 1.5,
		cpuOutsourceCost: 6,
		cpuWeeklyUses: 5,
		cpuLifespanYears: 5
	},
	bike: {
		cpuStickerPrice: 2500,
		cpuSecondaryCost: 1.73,
		cpuOutsourceCost: 15,
		cpuWeeklyUses: 3,
		cpuLifespanYears: 3
	},
	gpu: {
		cpuStickerPrice: 3500,
		cpuSecondaryCost: 0.45, // electricity per run hour
		cpuOutsourceCost: 1.80, // cloud GPU hourly rental
		cpuWeeklyUses: 12, // active compute hours/week
		cpuLifespanYears: 3
	}
};

export default function DecisionIntelligenceCalculator() {
	const [inputs, setInputs] = useState<DecisionIntelligenceInputs>(INITIAL_INPUTS);
	const [isLoaded, setIsLoaded] = useState(false);
	const [repairSunkCost, setRepairSunkCost] = useState(false);
	const [tinkerHobbyOffset, setTinkerHobbyOffset] = useState(false);

	// Hydration sync from localStorage
	useEffect(() => {
		const stored = localStorage.getItem('gini_decision_intelligence_inputs');
		if (stored) {
			try {
				const data = JSON.parse(stored);
				setInputs((current) => ({
					...current,
					...data
				}));
			} catch (e) {
				console.error('Failed to restore decision intelligence inputs:', e);
			}
		}
		setIsLoaded(true);
	}, []);

	// Write back to localStorage on change
	useEffect(() => {
		if (isLoaded) {
			localStorage.setItem('gini_decision_intelligence_inputs', JSON.stringify(inputs));
		}
	}, [inputs, isLoaded]);

	const updateInput = <K extends keyof DecisionIntelligenceInputs>(
		key: K,
		value: DecisionIntelligenceInputs[K]
	) => {
		setInputs((current) => ({ ...current, [key]: value }));
	};

	// Calculate outputs in real-time
	const outputs = useMemo(() => DecisionIntelligenceEngine.calculate(inputs), [inputs]);

	const remediationCost = useMemo(() => inputs.remediationHours * inputs.devRate, [inputs.remediationHours, inputs.devRate]);

	const applyCpuPreset = (presetKey: keyof typeof MODE_PRESETS) => {
		const preset = MODE_PRESETS[presetKey];
		setInputs((current) => ({
			...current,
			...preset
		}));
	};

	return (
		<div className="decision-intelligence-calculator grid gap-8">
			{/* MODE SWITCHER */}
			<div className="grid grid-cols-2 lg:grid-cols-4 rounded-3xl bg-white/80 border border-gray-200/80 p-1">
				{(
					[
						{ id: 'enterprise_ciam', label: '🏢 CIAM Auth' },
						{ id: 'personal_cpu', label: '☕ Cost-Per-Use' },
						{ id: 'personal_repair', label: '🛠️ Repair vs Replace' },
						{ id: 'personal_tinkering', label: '⏱️ Tinkering Tax' }
					] as const
				).map((mode) => (
					<button
						key={mode.id}
						type="button"
						onClick={() => updateInput('activeMode', mode.id)}
						className={`py-3 px-1 rounded-2xl text-center font-bold text-xs transition cursor-pointer tracking-wider ${
							inputs.activeMode === mode.id
								? 'bg-cyan-500/10 #5A7A8F border border-cyan-500/20 shadow-md'
								: 'text-[#5E5E5E] hover:text-[#5E5E5E] border border-transparent'
						}`}
					>
						{mode.label}
					</button>
				))}
			</div>

			{/* STEP 1: DYNAMIC VERDICT BANNER */}
			<div
				className={`overflow-hidden rounded-[2rem] border transition-all duration-300 p-6 sm:p-8 ${
					outputs.verdict === 'BUY' || outputs.verdict === 'REPAIR'
						? 'border-emerald-500/30 bg-[linear-gradient(135deg,rgba(2,44,34,0.6),rgba(2,6,23,0.96)_65%,rgba(16,185,129,0.12))] shadow-[0_0_50px_rgba(16,185,129,0.1)]'
						: outputs.verdict === 'PATCH' || outputs.verdict === 'WAIT'
							? 'border-indigo-500/30 bg-[linear-gradient(135deg,rgba(30,27,75,0.6),rgba(2,6,23,0.96)_65%,rgba(99,102,241,0.12))] shadow-[0_0_50px_rgba(99,102,241,0.1)]'
							: 'border-rose-500/30 bg-[linear-gradient(135deg,rgba(67,20,30,0.6),rgba(2,6,23,0.96)_65%,rgba(244,63,94,0.12))] shadow-[0_0_50px_rgba(244,63,94,0.1)]'
				}`}
			>
				<div className="flex flex-col gap-4">
					<div className="flex items-center justify-between">
						<span className="font-mono text-xs uppercase tracking-[0.3em] text-[#5E5E5E]">
							Decision Verdict
						</span>
						<span
							className={`rounded-full border px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.22em] ${
								outputs.verdict === 'BUY' || outputs.verdict === 'REPAIR'
									? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
									: outputs.verdict === 'PATCH' || outputs.verdict === 'WAIT'
										? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-300'
										: 'border-rose-500/20 bg-rose-500/10 text-[#B85C5C]'
							}`}
						>
							{outputs.verdict}
						</span>
					</div>

					<h2
						className={`text-3xl font-extrabold tracking-tight sm:text-4xl uppercase ${
							outputs.verdict === 'BUY' || outputs.verdict === 'REPAIR'
								? '#1A1A1A'
								: outputs.verdict === 'PATCH' || outputs.verdict === 'WAIT'
									? 'text-indigo-400'
									: 'text-[#B85C5C]'
						}`}
					>
						Verdict: {outputs.verdict === 'BUY' ? 'BUY / UPGRADE' : outputs.verdict === 'REPAIR' ? 'REPAIR / PATCH' : outputs.verdict === 'REPLACE' ? 'REPLACE / BUY' : outputs.verdict === 'SKIP' ? 'SKIP / OUTSOURCE' : outputs.verdict}
					</h2>

					<p className="text-base leading-7 text-[#5E5E5E] font-medium">
						{outputs.verdictRationale}
					</p>

					{/* Metric grid depending on mode */}
					{inputs.activeMode === 'enterprise_ciam' && (
						<div className="mt-4 grid gap-4 grid-cols-2 sm:grid-cols-4 border-t border-gray-200/80 pt-6 animate-fadeIn">
							<div>
								<p className="font-mono text-[0.64rem] uppercase tracking-[0.2] text-[#8C8C8C]">3-Yr Custom TCO</p>
								<p className="mt-1 text-lg font-bold text-[#5E5E5E]">{formatCurrency(outputs.custom3YrTco)}</p>
							</div>
							<div>
								<p className="font-mono text-[0.64rem] uppercase tracking-[0.2] text-[#8C8C8C]">3-Yr SaaS TCO</p>
								<p className="mt-1 text-lg font-bold #1A1A1A">{formatCurrency(outputs.saas3YrTco)}</p>
							</div>
							<div>
								<p className="font-mono text-[0.64rem] uppercase tracking-[0.2] text-[#8C8C8C]">Break-Even</p>
								<p className="mt-1 text-lg font-bold text-indigo-400">{outputs.breakEvenVerdict}</p>
							</div>
							<div>
								<p className="font-mono text-[0.64rem] uppercase tracking-[0.2] text-[#8C8C8C]">SaaS CPU / Mo</p>
								<p className="mt-1 text-lg font-bold text-[#5E5E5E]">${outputs.cpuSaaS}/MAU</p>
							</div>
						</div>
					)}

					{inputs.activeMode === 'personal_cpu' && (
						<div className="mt-4 grid gap-4 grid-cols-2 sm:grid-cols-4 border-t border-gray-200/80 pt-6 animate-fadeIn">
							<div>
								<p className="font-mono text-[0.64rem] uppercase tracking-[0.2] text-[#8C8C8C]">Ownership TCO</p>
								<p className="mt-1 text-lg font-bold text-[#5E5E5E]">{formatCurrency(outputs.personalCpuHomeTco)}</p>
							</div>
							<div>
								<p className="font-mono text-[0.64rem] uppercase tracking-[0.2] text-[#8C8C8C]">Outsourced / Alternative TCO</p>
								<p className="mt-1 text-lg font-bold text-[#5E5E5E]">{formatCurrency(outputs.personalCpuOutsourceTco)}</p>
							</div>
							<div>
								<p className="font-mono text-[0.64rem] uppercase tracking-[0.2] text-[#8C8C8C]">Unit Cost/Use</p>
								<p className={`mt-1 text-lg font-bold ${outputs.verdict === 'BUY' ? '#1A1A1A' : 'text-[#B85C5C]'}`}>
									{formatCurrency(outputs.personalCpuHomePerUse)}
								</p>
							</div>
							<div>
								<p className="font-mono text-[0.64rem] uppercase tracking-[0.2] text-[#8C8C8C]">Break-Even</p>
								<p className="mt-1 text-lg font-bold text-indigo-400">
									{outputs.personalCpuBreakEvenMonths === Infinity ? 'Never' : `${outputs.personalCpuBreakEvenMonths} Mo`}
								</p>
							</div>
						</div>
					)}

					{inputs.activeMode === 'personal_repair' && (
						<div className="mt-4 grid gap-4 grid-cols-2 border-t border-gray-200/80 pt-6 animate-fadeIn">
							<div>
								<p className="font-mono text-[0.64rem] uppercase tracking-[0.2] text-[#8C8C8C]">Asset Tech Debt Index</p>
								<p className={`mt-1 text-lg font-bold ${outputs.verdict === 'REPLACE' ? 'text-[#B85C5C]' : '#1A1A1A'}`}>
									{outputs.personalRepairIndex.toLocaleString()}
								</p>
							</div>
							<div>
								<p className="font-mono text-[0.64rem] uppercase tracking-[0.2] text-[#8C8C8C]">Replace Threshold</p>
								<p className="mt-1 text-lg font-bold text-[#5E5E5E]">
									{outputs.personalRepairThreshold.toLocaleString()}
								</p>
							</div>
						</div>
					)}

					{inputs.activeMode === 'personal_tinkering' && (
						<div className="mt-4 grid gap-4 grid-cols-2 sm:grid-cols-4 border-t border-gray-200/80 pt-6 animate-fadeIn">
							<div>
								<p className="font-mono text-[0.64rem] uppercase tracking-[0.2] text-[#8C8C8C]">Mo. Time Tax</p>
								<p className="mt-1 text-lg font-bold text-[#B85C5C]">{formatCurrency(outputs.personalTinkerMonthlyTimeCost)}/mo</p>
							</div>
							<div>
								<p className="font-mono text-[0.64rem] uppercase tracking-[0.2] text-[#8C8C8C]">3-Yr Time Drag</p>
								<p className="mt-1 text-lg font-bold text-[#5E5E5E]">{formatCurrency(outputs.personalTinker3YrTimeCost)}</p>
							</div>
							<div>
								<p className="font-mono text-[0.64rem] uppercase tracking-[0.2] text-[#8C8C8C]">3-Yr App cost</p>
								<p className="mt-1 text-lg font-bold text-[#5E5E5E]">{formatCurrency(outputs.personalTinker3YrSubCost)}</p>
							</div>
							<div>
								<p className="font-mono text-[0.64rem] uppercase tracking-[0.2] text-[#8C8C8C]">Net Reclaimed Value</p>
								<p className="mt-1 text-lg font-bold #1A1A1A">
									{outputs.personalTinkerNetSavings > 0 ? formatCurrency(outputs.personalTinkerNetSavings) : '$0'}
								</p>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* STEP 2: ROI SLIDERS & PARAMETERS */}
			<div className="rounded-[2rem] border border-gray-200 bg-white/20 p-6 sm:p-8">
				<div className="flex items-center justify-between mb-6">
					<h3 className="text-xl font-bold tracking-tight text-[#1A1A1A]">⚙️ Input parameters</h3>
					<span className="font-mono text-[0.64rem] uppercase tracking-[0.2em] text-[#8C8C8C]">
						Step 2 of 4
					</span>
				</div>

				{/* -------------------- ENTERPRISE CIAM INPUTS -------------------- */}
				{inputs.activeMode === 'enterprise_ciam' && (
					<div className="grid gap-6 md:grid-cols-2 animate-fadeIn">
						<div className="grid gap-3 rounded-[1.5rem] border border-gray-200/80 bg-white p-4">
							<div className="flex items-center justify-between gap-4">
								<div>
									<span className="mt-1 block text-sm font-semibold tracking-wide text-[#1A1A1A]">Monthly Active Users (MAUs)</span>
								</div>
								<span className="rounded-full border border-cyan-500/15 bg-cyan-500/10 px-3 py-1 font-mono text-[0.7rem] font-semibold #5A7A8F">
									{inputs.mau.toLocaleString()}
								</span>
							</div>
							<div className="mt-3">
								<input
									type="range"
									min="1000"
									max="500000"
									step="1000"
									value={inputs.mau}
									onChange={(e) => updateInput('mau', Number(e.target.value))}
									className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-400"
								/>
							</div>
						</div>

						<div className="grid gap-3 rounded-[1.5rem] border border-gray-200/80 bg-white p-4">
							<div className="flex items-center justify-between gap-4">
								<div>
									<span className="mt-1 block text-sm font-semibold tracking-wide text-[#1A1A1A]">Developer Loaded Rate ($/hr)</span>
								</div>
								<span className="rounded-full border border-cyan-500/15 bg-cyan-500/10 px-3 py-1 font-mono text-[0.7rem] font-semibold #5A7A8F">
									${inputs.devRate}/hr
								</span>
							</div>
							<div className="mt-3">
								<input
									type="range"
									min="40"
									max="250"
									step="5"
									value={inputs.devRate}
									onChange={(e) => updateInput('devRate', Number(e.target.value))}
									className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-400"
								/>
							</div>
						</div>

						<div className="grid gap-3 rounded-[1.5rem] border border-gray-200/80 bg-white p-4">
							<span className="block text-sm font-semibold tracking-wide text-[#1A1A1A]">Initial Build Time (Months)</span>
							<div className="flex items-center justify-between border border-slate-700/60 rounded-xl bg-white/60 p-1.5 mt-2">
								<button type="button" onClick={() => updateInput('buildTime', Math.max(1, inputs.buildTime - 1))} className="h-10 w-10 text-[#5E5E5E] hover:bg-gray-200 rounded-lg font-bold">−</button>
								<span className="font-semibold text-[#1A1A1A]">{inputs.buildTime} months</span>
								<button type="button" onClick={() => updateInput('buildTime', Math.min(12, inputs.buildTime + 1))} className="h-10 w-10 text-[#5E5E5E] hover:bg-gray-200 rounded-lg font-bold">+</button>
							</div>
						</div>

						<div className="grid gap-3 rounded-[1.5rem] border border-gray-200/80 bg-white p-4">
							<span className="block text-sm font-semibold tracking-wide text-[#1A1A1A]">Maintenance Overhead FTE</span>
							<div className="flex items-center justify-between border border-slate-700/60 rounded-xl bg-white/60 p-1.5 mt-2">
								<button type="button" onClick={() => updateInput('maintFte', Math.max(10, inputs.maintFte - 10))} className="h-10 w-10 text-[#5E5E5E] hover:bg-gray-200 rounded-lg font-bold">−</button>
								<span className="font-semibold text-[#1A1A1A]">{inputs.maintFte}% FTE</span>
								<button type="button" onClick={() => updateInput('maintFte', Math.min(100, inputs.maintFte + 10))} className="h-10 w-10 text-[#5E5E5E] hover:bg-gray-200 rounded-lg font-bold">+</button>
							</div>
						</div>
					</div>
				)}

				{/* -------------------- PERSONAL CPU INPUTS -------------------- */}
				{inputs.activeMode === 'personal_cpu' && (
					<div className="grid gap-6 md:grid-cols-2 animate-fadeIn">
						{/* Presets bar */}
						<div className="md:col-span-2 flex flex-wrap gap-2 items-center mb-2 border-b border-gray-200 pb-4">
							<span className="text-xs font-mono text-[#8C8C8C] uppercase mr-2">🎯 Apply Preset:</span>
							<button type="button" onClick={() => applyCpuPreset('coffee')} className="px-3 py-1.5 bg-slate-900 border border-gray-200 hover:border-cyan-500/40 text-xs rounded-xl font-bold text-[#5E5E5E]">☕ Espresso Machine</button>
							<button type="button" onClick={() => applyCpuPreset('bike')} className="px-3 py-1.5 bg-slate-900 border border-gray-200 hover:border-cyan-500/40 text-xs rounded-xl font-bold text-[#5E5E5E]">🚲 Road Bike</button>
							<button type="button" onClick={() => applyCpuPreset('gpu')} className="px-3 py-1.5 bg-slate-900 border border-gray-200 hover:border-cyan-500/40 text-xs rounded-xl font-bold text-[#5E5E5E]">💻 Local GPU Rig</button>
						</div>

						{/* Sticker Price */}
						<div className="grid gap-3 rounded-[1.5rem] border border-gray-200/80 bg-white p-4">
							<div className="flex items-center justify-between gap-4">
								<span className="block text-sm font-semibold tracking-wide text-[#1A1A1A]">Sticker Price (Upfront Cost)</span>
								<div className="flex items-center gap-1 bg-white/60 rounded-lg px-2 py-1 border border-gray-200 focus-within:border-cyan-500/50">
									<span className="text-xs text-[#5E5E5E]">$</span>
									<input
										type="number"
										value={inputs.cpuStickerPrice}
										onChange={(e) => updateInput('cpuStickerPrice', Number(e.target.value))}
										className="w-16 bg-transparent text-right font-mono text-xs font-semibold #5A7A8F focus:outline-none border-none p-0"
									/>
								</div>
							</div>
							<div className="mt-3">
								<input
									type="range"
									min="10"
									max="20000"
									step="50"
									value={inputs.cpuStickerPrice}
									onChange={(e) => updateInput('cpuStickerPrice', Number(e.target.value))}
									className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-400"
								/>
							</div>
						</div>

						{/* Usage Frequency */}
						<div className="grid gap-3 rounded-[1.5rem] border border-gray-200/80 bg-white p-4">
							<div className="flex items-center justify-between gap-4">
								<span className="block text-sm font-semibold tracking-wide text-[#1A1A1A]">Weekly Usage Frequency</span>
								<div className="flex items-center gap-1 bg-white/60 rounded-lg px-2 py-1 border border-gray-200 focus-within:border-cyan-500/50">
									<input
										type="number"
										value={inputs.cpuWeeklyUses}
										onChange={(e) => updateInput('cpuWeeklyUses', Number(e.target.value))}
										className="w-10 bg-transparent text-right font-mono text-xs font-semibold #5A7A8F focus:outline-none border-none p-0"
									/>
									<span className="text-[10px] font-mono text-[#5E5E5E]">/ wk</span>
								</div>
							</div>
							<div className="mt-3">
								<input
									type="range"
									min="1"
									max="100"
									step="1"
									value={inputs.cpuWeeklyUses}
									onChange={(e) => updateInput('cpuWeeklyUses', Number(e.target.value))}
									className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-400"
								/>
							</div>
						</div>

						{/* Outsource Price */}
						<div className="grid gap-3 rounded-[1.5rem] border border-gray-200/80 bg-white p-4">
							<div className="flex items-center justify-between gap-4">
								<div>
									<span className="block text-sm font-semibold tracking-wide text-[#1A1A1A]">Outsourced / Alternative Cost</span>
									<span className="text-[10px] text-[#5E5E5E] block mt-0.5">e.g. Café price, rideshare rate, or cloud rent per use</span>
								</div>
								<div className="flex items-center gap-1 bg-white/60 rounded-lg px-2 py-1 border border-gray-200 focus-within:border-cyan-500/50">
									<span className="text-xs text-[#5E5E5E]">$</span>
									<input
										type="number"
										step="0.01"
										value={inputs.cpuOutsourceCost}
										onChange={(e) => updateInput('cpuOutsourceCost', Number(e.target.value))}
										className="w-12 bg-transparent text-right font-mono text-xs font-semibold #5A7A8F focus:outline-none border-none p-0"
									/>
								</div>
							</div>
							<div className="mt-3">
								<input
									type="range"
									min="0.50"
									max="200.00"
									step="0.50"
									value={inputs.cpuOutsourceCost}
									onChange={(e) => updateInput('cpuOutsourceCost', Number(e.target.value))}
									className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-400"
								/>
							</div>
						</div>

						{/* Secondary Cost */}
						<div className="grid gap-3 rounded-[1.5rem] border border-gray-200/80 bg-white p-4">
							<div className="flex items-center justify-between gap-4">
								<div>
									<span className="block text-sm font-semibold tracking-wide text-[#1A1A1A]">Upkeep / Internal Cost (Per Use)</span>
									<span className="text-[10px] text-[#5E5E5E] block mt-0.5">e.g. Coffee beans/milk, charging, tune-up reserve</span>
								</div>
								<div className="flex items-center gap-1 bg-white/60 rounded-lg px-2 py-1 border border-gray-200 focus-within:border-cyan-500/50">
									<span className="text-xs text-[#5E5E5E]">$</span>
									<input
										type="number"
										step="0.01"
										value={inputs.cpuSecondaryCost}
										onChange={(e) => updateInput('cpuSecondaryCost', Number(e.target.value))}
										className="w-12 bg-transparent text-right font-mono text-xs font-semibold #5A7A8F focus:outline-none border-none p-0"
									/>
								</div>
							</div>
							<div className="mt-3">
								<input
									type="range"
									min="0.00"
									max="50.00"
									step="0.10"
									value={inputs.cpuSecondaryCost}
									onChange={(e) => updateInput('cpuSecondaryCost', Number(e.target.value))}
									className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-400"
								/>
							</div>
						</div>

						{/* Lifespan */}
						<div className="grid gap-3 rounded-[1.5rem] border border-gray-200/80 bg-white p-4 md:col-span-2">
							<span className="block text-sm font-semibold tracking-wide text-[#1A1A1A]">Target Lifespan Horizon (Years)</span>
							<div className="flex items-center justify-between border border-slate-700/60 rounded-xl bg-white/60 p-1.5 mt-2">
								<button type="button" onClick={() => updateInput('cpuLifespanYears', Math.max(1, inputs.cpuLifespanYears - 1))} className="h-10 w-10 text-[#5E5E5E] hover:bg-gray-200 rounded-lg font-bold">−</button>
								<span className="font-semibold text-[#1A1A1A]">{inputs.cpuLifespanYears} years</span>
								<button type="button" onClick={() => updateInput('cpuLifespanYears', Math.min(10, inputs.cpuLifespanYears + 1))} className="h-10 w-10 text-[#5E5E5E] hover:bg-gray-200 rounded-lg font-bold">+</button>
							</div>
						</div>
					</div>
				)}

				{/* -------------------- PERSONAL REPAIR INPUTS -------------------- */}
				{inputs.activeMode === 'personal_repair' && (
					<div className="grid gap-6 md:grid-cols-2 animate-fadeIn">
						{/* Asset Type Selector */}
						<div className="md:col-span-2">
							<p className="font-mono text-[0.64rem] uppercase tracking-[0.24em] text-[#8C8C8C] mb-3">Asset Classification</p>
							<div className="grid grid-cols-2 rounded-2xl bg-white/85 border border-gray-200 p-1">
								<button
									type="button"
									onClick={() => updateInput('repairAssetType', 'infrastructure')}
									className={`py-3 px-2 rounded-xl text-center font-semibold text-xs transition cursor-pointer ${
										inputs.repairAssetType === 'infrastructure'
											? 'bg-cyan-500/10 #5A7A8F border border-cyan-500/20'
											: 'text-[#5E5E5E] hover:text-[#5E5E5E]'
									}`}
								>
									🏠 Major Infrastructure (HVAC, Roof, Cars)
								</button>
								<button
									type="button"
									onClick={() => updateInput('repairAssetType', 'electronics')}
									className={`py-3 px-2 rounded-xl text-center font-semibold text-xs transition cursor-pointer ${
										inputs.repairAssetType === 'electronics'
											? 'bg-cyan-500/10 #5A7A8F border border-cyan-500/20'
											: 'text-[#5E5E5E] hover:text-[#5E5E5E]'
									}`}
								>
									💻 Consumer Electronics (Phones, Laptops)
								</button>
							</div>
						</div>

						{/* Asset Age */}
						<div className="grid gap-3 rounded-[1.5rem] border border-gray-200/80 bg-white p-4">
							<div className="flex items-center justify-between gap-4">
								<span className="block text-sm font-semibold tracking-wide text-[#1A1A1A]">Asset Age (Years)</span>
								<span className="rounded-full border border-cyan-500/15 bg-cyan-500/10 px-3 py-1 font-mono text-[0.7rem] font-semibold #5A7A8F">
									{inputs.repairAssetAge} Years Old
								</span>
							</div>
							<div className="mt-3">
								<input
									type="range"
									min="0"
									max="20"
									step="1"
									value={inputs.repairAssetAge}
									onChange={(e) => updateInput('repairAssetAge', Number(e.target.value))}
									className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-400"
								/>
							</div>
						</div>

						{/* Repair Cost */}
						<div className="grid gap-3 rounded-[1.5rem] border border-gray-200/80 bg-white p-4">
							<div className="flex items-center justify-between gap-4">
								<span className="block text-sm font-semibold tracking-wide text-[#1A1A1A]">Immediate Repair Quote</span>
								<span className="rounded-full border border-cyan-500/15 bg-cyan-500/10 px-3 py-1 font-mono text-[0.7rem] font-semibold #5A7A8F">
									{formatCurrency(inputs.repairCost)}
								</span>
							</div>
							<div className="mt-3">
								<input
									type="range"
									min="50"
									max="5000"
									step="50"
									value={inputs.repairCost}
									onChange={(e) => updateInput('repairCost', Number(e.target.value))}
									className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-400"
								/>
							</div>
						</div>
					</div>
				)}

				{/* -------------------- PERSONAL TINKERING INPUTS -------------------- */}
				{inputs.activeMode === 'personal_tinkering' && (
					<div className="grid gap-6 md:grid-cols-2 animate-fadeIn">
						{/* Troubleshooting hours */}
						<div className="grid gap-3 rounded-[1.5rem] border border-gray-200/80 bg-white p-4">
							<div className="flex items-center justify-between gap-4">
								<span className="block text-sm font-semibold tracking-wide text-[#1A1A1A]">Tinkering Hours / Month</span>
								<span className="rounded-full border border-cyan-500/15 bg-cyan-500/10 px-3 py-1 font-mono text-[0.7rem] font-semibold #5A7A8F">
									{inputs.tinkerTroubleshootHours} hrs / mo
								</span>
							</div>
							<div className="mt-3">
								<input
									type="range"
									min="0.5"
									max="20"
									step="0.5"
									value={inputs.tinkerTroubleshootHours}
									onChange={(e) => updateInput('tinkerTroubleshootHours', Number(e.target.value))}
									className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-400"
								/>
							</div>
						</div>

						{/* Hourly Time Value */}
						<div className="grid gap-3 rounded-[1.5rem] border border-gray-200/80 bg-white p-4">
							<div className="flex items-center justify-between gap-4">
								<span className="block text-sm font-semibold tracking-wide text-[#1A1A1A]">Opportunity Value of Time ($/hr)</span>
								<span className="rounded-full border border-cyan-500/15 bg-cyan-500/10 px-3 py-1 font-mono text-[0.7rem] font-semibold #5A7A8F">
									${inputs.tinkerTimeValue} / hr
								</span>
							</div>
							<div className="mt-3">
								<input
									type="range"
									min="10"
									max="200"
									step="5"
									value={inputs.tinkerTimeValue}
									onChange={(e) => updateInput('tinkerTimeValue', Number(e.target.value))}
									className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-400"
								/>
							</div>
						</div>

						{/* Paid Subscription Cost */}
						<div className="grid gap-3 rounded-[1.5rem] border border-gray-200/80 bg-white p-4 md:col-span-2">
							<div className="flex items-center justify-between gap-4">
								<span className="block text-sm font-semibold tracking-wide text-[#1A1A1A]">Paid App Subscription Cost ($/month)</span>
								<span className="rounded-full border border-cyan-500/15 bg-cyan-500/10 px-3 py-1 font-mono text-[0.7rem] font-semibold #5A7A8F">
									{formatCurrency(inputs.tinkerSubscriptionCost)} / mo
								</span>
							</div>
							<div className="mt-3">
								<input
									type="range"
									min="2"
									max="100"
									step="1"
									value={inputs.tinkerSubscriptionCost}
									onChange={(e) => updateInput('tinkerSubscriptionCost', Number(e.target.value))}
									className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-400"
								/>
							</div>
						</div>
					</div>
				)}

				{/* Compliance target for enterprise */}
				{inputs.activeMode === 'enterprise_ciam' && (
					<div className="mt-6">
						<p className="font-mono text-[0.64rem] uppercase tracking-[0.24em] text-[#8C8C8C] mb-3">Compliance target level</p>
						<div className="grid grid-cols-3 rounded-2xl bg-white/80 border border-gray-200/80 p-1">
							{(['none', 'soc2', 'hipaa'] as const).map((level) => (
								<button
									key={level}
									type="button"
									onClick={() => updateInput('complianceLevel', level)}
									className={`py-3 px-2 rounded-xl text-center font-semibold text-xs transition cursor-pointer uppercase tracking-wider ${
										inputs.complianceLevel === level
											? 'bg-cyan-500/10 #5A7A8F border border-cyan-500/20 shadow-md'
											: 'text-[#5E5E5E] hover:text-[#5E5E5E] border border-transparent'
									}`}
								>
									{level === 'none' ? 'None' : level === 'soc2' ? 'SOC 2 Type II' : 'HIPAA BAA'}
								</button>
							))}
						</div>
					</div>
				)}
			</div>

			{/* STEP 3: ICEBERG COST MATRIX (VISIBLE VS INVISIBLE) */}
			<div className="grid gap-6 lg:grid-cols-2">
				{/* -------------------- ENTERPRISE MATRIX -------------------- */}
				{inputs.activeMode === 'enterprise_ciam' && (
					<>
						<div className="panel-soft flex flex-col rounded-[1.8rem] border border-cyan-500/25 bg-[linear-gradient(135deg,rgba(2,6,23,0.96),rgba(8,47,73,0.85)_80%,rgba(34,211,238,0.12))] p-6 shadow-[0_0_35px_rgba(6,182,212,0.06)] hover:border-cyan-500/40 transition-all duration-300">
							<p className="font-mono text-xs uppercase tracking-[0.28em] #5A7A8F/85">SaaS Managed Platform</p>
							<h4 className="mt-4 text-sm font-mono uppercase tracking-wider text-[#5E5E5E]">3-Year SaaS Cumulative TCO</h4>
							<p className="mt-1 text-4xl font-extrabold tracking-tight text-[#1A1A1A]">{formatCurrency(outputs.saas3YrTco)}</p>
							<div className="mt-6 flex-1 grid gap-4">
								<div className="rounded-[1.2rem] border border-gray-200 bg-white/65 p-4">
									<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#8C8C8C] block">Visible setup & integration</span>
									<div className="flex justify-between mt-1"><span className="text-sm font-semibold text-[#5E5E5E]">SDK Setup Labor</span><span className="text-sm font-bold text-[#1A1A1A]">{formatCurrency(outputs.saasIntegrateCost)}</span></div>
								</div>
								<div className="rounded-[1.2rem] border border-gray-200 bg-white/65 p-4">
									<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#8C8C8C] block">Subscription overage</span>
									<div className="flex justify-between mt-1"><span className="text-sm font-semibold text-[#5E5E5E]">Monthly License Fee</span><span className="text-sm font-bold text-[#5A7A8F]">{formatCurrency(outputs.saasMaintCostMonthly)} / mo</span></div>
								</div>
							</div>
						</div>

						<div className="panel-soft flex flex-col rounded-[1.8rem] border border-rose-500/20 bg-[linear-gradient(135deg,rgba(2,6,23,0.96),rgba(67,20,30,0.85)_80%,rgba(244,63,94,0.12))] p-6 shadow-[0_0_35px_rgba(244,63,94,0.06)] hover:border-rose-500/35 transition-all duration-300">
							<p className="font-mono text-xs uppercase tracking-[0.28em] text-[#B85C5C]/85">In-House Custom Build</p>
							<h4 className="mt-4 text-sm font-mono uppercase tracking-wider text-[#5E5E5E]">3-Year Custom Cumulative TCO</h4>
							<p className="mt-1 text-4xl font-extrabold tracking-tight text-[#1A1A1A]">{formatCurrency(outputs.custom3YrTco)}</p>
							<div className="mt-6 flex-1 grid gap-4">
								<div className="rounded-[1.2rem] border border-gray-200 bg-white/65 p-4">
									<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#8C8C8C] block">Upfront CapEx (Visible)</span>
									<div className="flex justify-between mt-1"><span className="text-sm font-semibold text-[#5E5E5E]">Initial Build Labor</span><span className="text-sm font-bold text-[#1A1A1A]">{formatCurrency(outputs.customBuildCost)}</span></div>
								</div>
								<div className="rounded-[1.2rem] border border-gray-200 bg-white/65 p-4">
									<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#B85C5C] block">Hidden OpEx Drag (Invisible)</span>
									<div className="grid gap-1.5 mt-2 text-xs text-[#5E5E5E]">
										<div className="flex justify-between"><span>3-Yr Upkeep:</span><span>{formatCurrency(outputs.customMaintCost3Yr)}</span></div>
										{inputs.complianceLevel !== 'none' && <div className="flex justify-between"><span>3-Yr Compliance:</span><span>{formatCurrency(outputs.customComplianceCost3Yr)}</span></div>}
										<div className="flex justify-between"><span>Opportunity Cost:</span><span>{formatCurrency(outputs.customOpportunityCost3Yr)}</span></div>
									</div>
								</div>
							</div>
						</div>
					</>
				)}

				{/* -------------------- PERSONAL CPU MATRIX -------------------- */}
				{inputs.activeMode === 'personal_cpu' && (
					<>
						<div className="panel-soft flex flex-col rounded-[1.8rem] border border-cyan-500/25 bg-[linear-gradient(135deg,rgba(2,6,23,0.96),rgba(8,47,73,0.85)_80%,rgba(34,211,238,0.12))] p-6 shadow-[0_0_35px_rgba(6,182,212,0.06)] transition-all duration-300">
							<p className="font-mono text-xs uppercase tracking-[0.28em] #5A7A8F/85">Convenience Outsourcing</p>
							<h4 className="mt-4 text-sm font-mono uppercase tracking-wider text-[#5E5E5E]">Lifespan Outsource Total</h4>
							<p className="mt-1 text-4xl font-extrabold tracking-tight text-[#1A1A1A]">{formatCurrency(outputs.personalCpuOutsourceTco)}</p>
							<div className="mt-6 flex-1 grid gap-4 animate-fadeIn">
								<div className="rounded-[1.2rem] border border-gray-200 bg-white/65 p-4">
									<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#8C8C8C] block">Outsource Rate</span>
									<div className="flex justify-between mt-1"><span className="text-sm font-semibold text-[#5E5E5E]">Price per Outsource Use</span><span className="text-sm font-bold text-[#1A1A1A]">{formatCurrency(outputs.personalCpuOutsourcePerUse)}</span></div>
								</div>
								<div className="rounded-[1.2rem] border border-gray-200 bg-white/65 p-4">
									<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#8C8C8C] block">Lifestyle Volume</span>
									<div className="flex justify-between mt-1"><span className="text-sm font-semibold text-[#5E5E5E]">Total Uses ({inputs.cpuLifespanYears} yrs)</span><span className="text-sm font-bold text-[#5A7A8F]">{outputs.personalCpuTotalUses.toLocaleString()} uses</span></div>
								</div>
							</div>
						</div>

						<div className="panel-soft flex flex-col rounded-[1.8rem] border border-rose-500/20 bg-[linear-gradient(135deg,rgba(2,6,23,0.96),rgba(67,20,30,0.85)_80%,rgba(244,63,94,0.12))] p-6 shadow-[0_0_35px_rgba(244,63,94,0.06)] transition-all duration-300">
							<p className="font-mono text-xs uppercase tracking-[0.28em] text-[#B85C5C]/85">Home Asset Ownership</p>
							<h4 className="mt-4 text-sm font-mono uppercase tracking-wider text-[#5E5E5E]">Lifespan Home Ownership TCO</h4>
							<p className="mt-1 text-4xl font-extrabold tracking-tight text-[#1A1A1A]">{formatCurrency(outputs.personalCpuHomeTco)}</p>
							<div className="mt-6 flex-1 grid gap-4 animate-fadeIn">
								<div className="rounded-[1.2rem] border border-gray-200 bg-white/65 p-4">
									<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#8C8C8C] block">Sticker price (Visible)</span>
									<div className="flex justify-between mt-1"><span className="text-sm font-semibold text-[#5E5E5E]">Upfront Sticker Cost</span><span className="text-sm font-bold text-[#1A1A1A]">{formatCurrency(inputs.cpuStickerPrice)}</span></div>
								</div>
								<div className="rounded-[1.2rem] border border-gray-200 bg-white/65 p-4">
									<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#B85C5C] block">Hidden operating & upkeep (Invisible)</span>
									<div className="grid gap-1.5 mt-2 text-xs text-[#5E5E5E]">
										<div className="flex justify-between"><span>Secondary ingredients/parts:</span><span>{formatCurrency(outputs.personalCpuTotalUses * inputs.cpuSecondaryCost)}</span></div>
										<div className="flex justify-between"><span>Upkeep & Descaling budget:</span><span>{formatCurrency(outputs.personalCpuMaintenance)}</span></div>
										<div className="flex justify-between"><span>Asset Depreciation (35% loss):</span><span>{formatCurrency(outputs.personalCpuDepreciation)}</span></div>
									</div>
								</div>
							</div>
						</div>
					</>
				)}

				{/* -------------------- PERSONAL REPAIR MATRIX -------------------- */}
				{inputs.activeMode === 'personal_repair' && (
					<>
						<div className="panel-soft flex flex-col rounded-[1.8rem] border border-cyan-500/25 bg-[linear-gradient(135deg,rgba(2,6,23,0.96),rgba(8,47,73,0.85)_80%,rgba(34,211,238,0.12))] p-6 shadow-[0_0_35px_rgba(6,182,212,0.06)] transition-all duration-300">
							<p className="font-mono text-xs uppercase tracking-[0.28em] #5A7A8F/85">Repair and Keep</p>
							<h4 className="mt-4 text-sm font-mono uppercase tracking-wider text-[#5E5E5E]">Immediate Repair Quote</h4>
							<p className="mt-1 text-4xl font-extrabold tracking-tight text-[#1A1A1A]">{formatCurrency(inputs.repairCost)}</p>
							<div className="mt-6 flex-1 grid gap-4 animate-fadeIn">
								<div className="rounded-[1.2rem] border border-gray-200 bg-white/65 p-4">
									<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#8C8C8C] block">Asset Age Factor</span>
									<div className="flex justify-between mt-1"><span className="text-sm font-semibold text-[#5E5E5E]">Structural Age</span><span className="text-sm font-bold text-[#1A1A1A]">{inputs.repairAssetAge} Years</span></div>
								</div>
								<div className="rounded-[1.2rem] border border-gray-200 bg-white/65 p-4">
									<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#8C8C8C] block">Index Score</span>
									<div className="flex justify-between mt-1"><span className="text-sm font-semibold text-[#5E5E5E]">Asset Debt Index</span><span className="text-sm font-bold text-[#5A7A8F]">{outputs.personalRepairIndex.toLocaleString()}</span></div>
								</div>
							</div>
						</div>

						<div className="panel-soft flex flex-col rounded-[1.8rem] border border-rose-500/20 bg-[linear-gradient(135deg,rgba(2,6,23,0.96),rgba(67,20,30,0.85)_80%,rgba(244,63,94,0.12))] p-6 shadow-[0_0_35px_rgba(244,63,94,0.06)] transition-all duration-300">
							<p className="font-mono text-xs uppercase tracking-[0.28em] text-[#B85C5C]/85">Replace with New</p>
							<h4 className="mt-4 text-sm font-mono uppercase tracking-wider text-[#5E5E5E]">Threshold Warning</h4>
							<p className="mt-1 text-4xl font-extrabold tracking-tight text-[#1A1A1A]">{outputs.personalRepairThreshold.toLocaleString()}</p>
							<div className="mt-6 flex-1 grid gap-4 animate-fadeIn">
								<div className="rounded-[1.2rem] border border-gray-200 bg-white/65 p-4">
									<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#8C8C8C] block">Replacement Verdict</span>
									<div className="flex justify-between mt-1"><span className="text-sm font-semibold text-[#5E5E5E]">Recommendation</span><span className="text-sm font-bold text-[#1A1A1A]">{outputs.verdict === 'REPLACE' ? 'REPLACE / BUY NEW' : 'KEEP / PATCH IT'}</span></div>
								</div>
								<div className="rounded-[1.2rem] border border-gray-200 bg-white/65 p-4">
									<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#B85C5C] block">Future Savings</span>
									<p className="text-xs leading-5 text-[#5E5E5E] mt-1">Replacing early resets depreciation, guarantees a fresh warranty lifespan, and stops the repair money pit.</p>
								</div>
							</div>
						</div>
					</>
				)}

				{/* -------------------- PERSONAL TINKERING MATRIX -------------------- */}
				{inputs.activeMode === 'personal_tinkering' && (
					<>
						<div className="panel-soft flex flex-col rounded-[1.8rem] border border-cyan-500/25 bg-[linear-gradient(135deg,rgba(2,6,23,0.96),rgba(8,47,73,0.85)_80%,rgba(34,211,238,0.12))] p-6 shadow-[0_0_35px_rgba(6,182,212,0.06)] transition-all duration-300">
							<p className="font-mono text-xs uppercase tracking-[0.28em] #5A7A8F/85">Paid Subscription Tool</p>
							<h4 className="mt-4 text-sm font-mono uppercase tracking-wider text-[#5E5E5E]">3-Year App Subscription</h4>
							<p className="mt-1 text-4xl font-extrabold tracking-tight text-[#1A1A1A]">{formatCurrency(outputs.personalTinker3YrSubCost)}</p>
							<div className="mt-6 flex-1 grid gap-4 animate-fadeIn">
								<div className="rounded-[1.2rem] border border-gray-200 bg-white/65 p-4">
									<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#8C8C8C] block">Subscription Price</span>
									<div className="flex justify-between mt-1"><span className="text-sm font-semibold text-[#5E5E5E]">Monthly Paid App fee</span><span className="text-sm font-bold text-[#1A1A1A]">{formatCurrency(inputs.tinkerSubscriptionCost)}/mo</span></div>
								</div>
							</div>
						</div>

						<div className="panel-soft flex flex-col rounded-[1.8rem] border border-rose-500/20 bg-[linear-gradient(135deg,rgba(2,6,23,0.96),rgba(67,20,30,0.85)_80%,rgba(244,63,94,0.12))] p-6 shadow-[0_0_35px_rgba(244,63,94,0.06)] transition-all duration-300">
							<p className="font-mono text-xs uppercase tracking-[0.28em] text-[#B85C5C]/85">Fragile Workaround Stack</p>
							<h4 className="mt-4 text-sm font-mono uppercase tracking-wider text-[#5E5E5E]">3-Year Invisible Time Tax</h4>
							<p className="mt-1 text-4xl font-extrabold tracking-tight text-[#1A1A1A]">{formatCurrency(outputs.personalTinker3YrTimeCost)}</p>
							<div className="mt-6 flex-1 grid gap-4 animate-fadeIn">
								<div className="rounded-[1.2rem] border border-gray-200 bg-white/65 p-4">
									<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#8C8C8C] block">Monthly Time Value Cost</span>
									<div className="flex justify-between mt-1"><span className="text-sm font-semibold text-[#5E5E5E]">Lost Time Value</span><span className="text-sm font-bold text-[#B85C5C]">{formatCurrency(outputs.personalTinkerMonthlyTimeCost)}/mo</span></div>
								</div>
							</div>
						</div>
					</>
				)}
			</div>

			{/* STEP 4: BIAS CORRECTION & CHECKLIST */}
			<div className="rounded-[2rem] border border-gray-200 bg-white/20 p-6 sm:p-8">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h3 className="text-xl font-bold tracking-tight text-[#1A1A1A]">⚠️ Strategic risk assessment</h3>
						<p className="text-xs text-[#5E5E5E] mt-1">Select the behavioral checkboxes to analyze risk biases:</p>
					</div>
					<span className="font-mono text-[0.64rem] uppercase tracking-[0.2em] text-[#8C8C8C]">
						Step 4 of 4
					</span>
				</div>

				{/* -------------------- ENTERPRISE CHECKLIST -------------------- */}
				{inputs.activeMode === 'enterprise_ciam' && (
					<div className="grid gap-4 animate-fadeIn">
						<label className="flex items-start gap-4 rounded-2xl border border-gray-200/80 bg-white p-4 transition hover:bg-slate-900/30 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={inputs.hasSunkCostFallacy}
								onChange={(e) => updateInput('hasSunkCostFallacy', e.target.checked)}
								className="mt-1 h-4 w-4 rounded border-slate-700 bg-white text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-950"
							/>
							<div>
								<span className="block text-sm font-semibold text-[#5E5E5E]">Sunk Cost Bias</span>
								<span className="mt-1 block text-xs leading-5 text-[#5E5E5E]">"We have already spent substantial resources and developer hours patching our custom auth logic, so we must keep maintaining it."</span>
							</div>
						</label>

						<label className="flex items-start gap-4 rounded-2xl border border-gray-200/80 bg-white p-4 transition hover:bg-slate-900/30 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={inputs.hasKeyPersonRisk}
								onChange={(e) => updateInput('hasKeyPersonRisk', e.target.checked)}
								className="mt-1 h-4 w-4 rounded border-slate-700 bg-white text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-950"
							/>
							<div>
								<span className="block text-sm font-semibold text-[#5E5E5E]">Key-Person Turn-Over Risk</span>
								<span className="mt-1 block text-xs leading-5 text-[#5E5E5E]">"Our custom auth middleware, OAuth flow, and token session validation were built and are maintained by a single senior engineer."</span>
							</div>
						</label>

						<label className="flex items-start gap-4 rounded-2xl border border-gray-200/80 bg-white p-4 transition hover:bg-slate-900/30 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={inputs.hasTinkeringTax}
								onChange={(e) => updateInput('hasTinkeringTax', e.target.checked)}
								className="mt-1 h-4 w-4 rounded border-slate-700 bg-white text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-950"
							/>
							<div>
								<span className="block text-sm font-semibold text-[#5E5E5E]">Brittle Integration Tax</span>
								<span className="mt-1 block text-xs leading-5 text-[#5E5E5E]">"We stitch multiple no-code visual tables and external databases (e.g. Notion, Zapier, Softr) to sync user sessions."</span>
							</div>
						</label>
					</div>
				)}

				{/* -------------------- PERSONAL CPU CHECKLIST -------------------- */}
				{inputs.activeMode === 'personal_cpu' && (
					<div className="grid gap-4 animate-fadeIn">
						<label className="flex items-start gap-4 rounded-2xl border border-gray-200/80 bg-white p-4 transition hover:bg-slate-900/30 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={inputs.cpuAspirationalCheck}
								onChange={(e) => updateInput('cpuAspirationalCheck', e.target.checked)}
								className="mt-1 h-4 w-4 rounded border-slate-700 bg-white text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-950"
							/>
							<div>
								<span className="block text-sm font-semibold text-[#5E5E5E]">Commitment Pledge (Aspirational Check)</span>
								<span className="mt-1 block text-xs leading-5 text-[#5E5E5E]">"I pledge that I will actually maintain this usage frequency ({inputs.cpuWeeklyUses} times/week) consistently over the next {inputs.cpuLifespanYears} years."</span>
							</div>
						</label>
					</div>
				)}

				{/* -------------------- PERSONAL REPAIR CHECKLIST -------------------- */}
				{inputs.activeMode === 'personal_repair' && (
					<div className="grid gap-4 animate-fadeIn">
						<label className="flex items-start gap-4 rounded-2xl border border-gray-200/80 bg-white p-4 transition hover:bg-slate-900/30 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={repairSunkCost}
								onChange={(e) => setRepairSunkCost(e.target.checked)}
								className="mt-1 h-4 w-4 rounded border-slate-700 bg-white text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-950"
							/>
							<div>
								<span className="block text-sm font-semibold text-[#5E5E5E]">History of Repeated Failure</span>
								<span className="mt-1 block text-xs leading-5 text-[#5E5E5E]">"This asset has broken down multiple times in the past 12 months, and I have already spent considerable money fixing it."</span>
							</div>
						</label>
					</div>
				)}

				{/* -------------------- PERSONAL TINKERING CHECKLIST -------------------- */}
				{inputs.activeMode === 'personal_tinkering' && (
					<div className="grid gap-4 animate-fadeIn">
						<label className="flex items-start gap-4 rounded-2xl border border-gray-200/80 bg-white p-4 transition hover:bg-slate-900/30 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={tinkerHobbyOffset}
								onChange={(e) => setTinkerHobbyOffset(e.target.checked)}
								className="mt-1 h-4 w-4 rounded border-slate-700 bg-white text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-950"
							/>
							<div>
								<span className="block text-sm font-semibold text-[#5E5E5E]">Recreational Hobby Offset</span>
								<span className="mt-1 block text-xs leading-5 text-[#5E5E5E]">"I genuinely enjoy debugging, manual scripting, or smart home tweaking as a fun leisure hobby rather than seeing it as a chore."</span>
							</div>
						</label>
					</div>
				)}

				{/* Dynamic Risk Warnings Panel */}
				<div className="mt-6 grid gap-4">
					{/* Enterprise warnings */}
					{inputs.activeMode === 'enterprise_ciam' && inputs.hasSunkCostFallacy && (
						<div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 flex gap-3 animate-fadeIn">
							<span className="text-xl">⚠️</span>
							<div>
								<h4 className="text-xs font-mono uppercase tracking-wider text-[#B85C5C] font-bold">Active Exposure: Sunk Cost Fallacy Triggered</h4>
								<p className="text-xs leading-5 text-[#5E5E5E] mt-1">Continuing to patch this legacy custom build simply because of prior investment drains engineering focus that could be spent building core product features. Your codebase tech debt index is <span className="font-semibold text-[#1A1A1A]">{outputs.softwareIndex.toLocaleString()}</span> {outputs.isSoftwareIndexHigh ? '(Threshold exceeded: 5,000)' : '(Threshold: 5,000)'}.</p>
							</div>
						</div>
					)}
					{inputs.activeMode === 'enterprise_ciam' && inputs.hasKeyPersonRisk && (
						<div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 flex gap-3 animate-fadeIn">
							<span className="text-xl">🛑</span>
							<div>
								<h4 className="text-xs font-mono uppercase tracking-wider text-[#B85C5C] font-bold">Key-Person Risk: High Knowledge Loss Liability</h4>
								<p className="text-xs leading-5 text-[#5E5E5E] mt-1">Turnover will leave your core session pipeline completely unmaintained. If this engineer leaves, the loaded cost to onboarding a replacement developer and resolving immediate patches is estimated at <span className="font-semibold text-[#1A1A1A]">{formatCurrency(remediationCost)}</span> ({inputs.remediationHours} hours of remediation).</p>
							</div>
						</div>
					)}
					{inputs.activeMode === 'enterprise_ciam' && inputs.hasTinkeringTax && (
						<div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 flex gap-3 animate-fadeIn">
							<span className="text-xl">⚡</span>
							<div>
								<h4 className="text-xs font-mono uppercase tracking-wider text-[#B85C5C] font-bold">Brittle Integration: Tinkering Tax Alert</h4>
								<p className="text-xs leading-5 text-[#5E5E5E] mt-1">No-code integrations are highly sensitive to database schema renames and vendor API deprecations. Security session management through third-party automation tools introduces severe compliance and data leakage risks.</p>
							</div>
						</div>
					)}

					{/* Personal CPU warnings */}
					{inputs.activeMode === 'personal_cpu' && !inputs.cpuAspirationalCheck && (
						<div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 flex gap-3 animate-fadeIn">
							<span className="text-xl">⚠️</span>
							<div>
								<h4 className="text-xs font-mono uppercase tracking-wider text-[#B85C5C] font-bold">Aspirational check Warning: Shelf-Sitting Risk</h4>
								<p className="text-xs leading-5 text-[#5E5E5E] mt-1">Consumer products frequently end up unused in closets or garages. Be realistic about the setup friction, mandatory cleanup cycles, and lifestyle alignment before spending upfront CapEx.</p>
							</div>
						</div>
					)}
					{inputs.activeMode === 'personal_cpu' && outputs.personalCpuAspirationalWarning && (
						<div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 flex gap-3 animate-fadeIn">
							<span className="text-xl">⚡</span>
							<div>
								<h4 className="text-xs font-mono uppercase tracking-wider text-[#B85C5C] font-bold">Optimistic Frequency warning</h4>
								<p className="text-xs leading-5 text-[#5E5E5E] mt-1">{outputs.personalCpuAspirationalWarning}</p>
							</div>
						</div>
					)}

					{/* Personal Repair warnings */}
					{inputs.activeMode === 'personal_repair' && repairSunkCost && (
						<div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 flex gap-3 animate-fadeIn">
							<span className="text-xl">⚠️</span>
							<div>
								<h4 className="text-xs font-mono uppercase tracking-wider text-[#B85C5C] font-bold">Sunk Cost Bias Warning: Money Pit alert</h4>
								<p className="text-xs leading-5 text-[#5E5E5E] mt-1">Continuing to repair an old, deteriorating asset that repeatedly fails will quickly exceed the cost of buying a replacement. Consider replacing the asset to prevent compounding financial loss.</p>
							</div>
						</div>
					)}

					{/* Personal Tinkering warnings */}
					{inputs.activeMode === 'personal_tinkering' && tinkerHobbyOffset && (
						<div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex gap-3 animate-fadeIn">
							<span className="text-xl">💡</span>
							<div>
								<h4 className="text-xs font-mono uppercase tracking-wider #1A1A1A font-bold">Leisure offset active</h4>
								<p className="text-xs leading-5 text-[#5E5E5E] mt-1">Since you classify this troubleshooting as an enjoyable personal hobby, your hourly time value loss is offset by recreational satisfaction. Staying with the free workaround stack is highly justified.</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
