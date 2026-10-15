export interface DecisionIntelligenceInputs {
	activeMode: 'enterprise_ciam' | 'personal_cpu' | 'personal_repair' | 'personal_tinkering';

	// Enterprise CIAM inputs
	mau: number;
	devRate: number;
	buildTime: number; // in months
	maintFte: number; // as percentage, e.g. 50%
	complianceLevel: 'none' | 'soc2' | 'hipaa';
	codebaseAge: number; // in years
	remediationHours: number; // in hours
	hasSunkCostFallacy: boolean;
	hasKeyPersonRisk: boolean;
	hasTinkeringTax: boolean;

	// Personal CPU inputs (Espresso vs Cafe)
	cpuStickerPrice: number;
	cpuSecondaryCost: number; // e.g. beans per shot
	cpuOutsourceCost: number; // e.g. cafe price
	cpuWeeklyUses: number;
	cpuLifespanYears: number;
	cpuAspirationalCheck: boolean;

	// Personal Repair inputs
	repairAssetType: 'infrastructure' | 'electronics';
	repairAssetAge: number; // in years
	repairCost: number;

	// Personal Tinkering inputs
	tinkerTroubleshootHours: number; // hours per month
	tinkerTimeValue: number; // hourly rate
	tinkerSubscriptionCost: number; // monthly fee
	tinkerAspirationalCheck: boolean;
}

export interface DecisionIntelligenceOutputs {
	verdict: 'BUY' | 'PATCH' | 'WAIT' | 'REPLACE' | 'REPAIR' | 'SKIP';
	verdictRationale: string;

	// Enterprise outputs
	custom3YrTco: number;
	saas3YrTco: number;
	customBuildCost: number;
	customMaintCostMonthly: number;
	customMaintCost3Yr: number;
	customComplianceCostAnnual: number;
	customComplianceCost3Yr: number;
	customOpportunityCost3Yr: number;
	saasIntegrateCost: number;
	saasMaintCostMonthly: number;
	saasSubCost3Yr: number;
	cpuCustom: number;
	cpuSaaS: number;
	breakEvenMonths: number;
	breakEvenVerdict: string;
	softwareIndex: number;
	isSoftwareIndexHigh: boolean;

	// Personal CPU outputs
	personalCpuHomeTco: number;
	personalCpuOutsourceTco: number;
	personalCpuHomePerUse: number;
	personalCpuOutsourcePerUse: number;
	personalCpuNetSavings: number;
	personalCpuTotalUses: number;
	personalCpuBreakEvenUses: number;
	personalCpuBreakEvenMonths: number;
	personalCpuDepreciation: number;
	personalCpuMaintenance: number;
	personalCpuAspirationalWarning: string;

	// Personal Repair outputs
	personalRepairIndex: number;
	personalRepairThreshold: number;

	// Personal Tinkering outputs
	personalTinkerMonthlyTimeCost: number;
	personalTinker3YrTimeCost: number;
	personalTinker3YrSubCost: number;
	personalTinkerNetSavings: number;
}

// Volume-tiered overage subscription calculator for SaaS (Clerk-like B2C pricing model)
export function calculateSaaSMonthlySubscription(mau: number): number {
	if (mau <= 10000) {
		return 0;
	}
	if (mau <= 50000) {
		return 25 + (mau - 10000) * 0.02;
	}
	if (mau <= 100000) {
		return 825 + (mau - 50000) * 0.015;
	}
	return 1575 + (mau - 100000) * 0.01;
}

// Cost-Per-Use (CPU) Reality Check helper
export function calculateSafeCPU(tco3Year: number, mau: number, lifespanYears: number = 3): number {
	const safeMAU = Math.max(mau, 1);
	const safeMonths = Math.max(lifespanYears * 12, 1);
	const rawCPU = tco3Year / (safeMAU * safeMonths);
	return parseFloat(rawCPU.toFixed(4));
}

// Break-even horizon calculation
export function calculateTrueBreakEven(
	customBuild: number,
	customMaintAnnual: number,
	saasIntegrate: number,
	saasMaintAnnual: number
): { months: number; verdict: string } {
	const annualSavings = customMaintAnnual - saasMaintAnnual;
	const upfrontPremium = customBuild - saasIntegrate;

	if (annualSavings <= 0) {
		return {
			months: Infinity,
			verdict: 'Never: Custom maintenance is cheaper than SaaS volume overage.'
		};
	}

	const breakEvenMonths = (upfrontPremium / annualSavings) * 12;
	const safeMonths = Math.max(0, parseFloat(breakEvenMonths.toFixed(1)));
	return {
		months: safeMonths,
		verdict: breakEvenMonths <= 0 ? 'Immediate ROI' : `${safeMonths} Months`
	};
}

export class DecisionIntelligenceEngine {
	public static calculate(inputs: DecisionIntelligenceInputs): DecisionIntelligenceOutputs {
		// Initialize all outputs with defaults
		const outputs: DecisionIntelligenceOutputs = {
			verdict: 'BUY',
			verdictRationale: '',
			custom3YrTco: 0,
			saas3YrTco: 0,
			customBuildCost: 0,
			customMaintCostMonthly: 0,
			customMaintCost3Yr: 0,
			customComplianceCostAnnual: 0,
			customComplianceCost3Yr: 0,
			customOpportunityCost3Yr: 0,
			saasIntegrateCost: 0,
			saasMaintCostMonthly: 0,
			saasSubCost3Yr: 0,
			cpuCustom: 0,
			cpuSaaS: 0,
			breakEvenMonths: 0,
			breakEvenVerdict: '',
			softwareIndex: 0,
			isSoftwareIndexHigh: false,
			personalCpuHomeTco: 0,
			personalCpuOutsourceTco: 0,
			personalCpuHomePerUse: 0,
			personalCpuOutsourcePerUse: 0,
			personalCpuNetSavings: 0,
			personalCpuTotalUses: 0,
			personalCpuBreakEvenUses: 0,
			personalCpuBreakEvenMonths: 0,
			personalCpuDepreciation: 0,
			personalCpuMaintenance: 0,
			personalCpuAspirationalWarning: '',
			personalRepairIndex: 0,
			personalRepairThreshold: 0,
			personalTinkerMonthlyTimeCost: 0,
			personalTinker3YrTimeCost: 0,
			personalTinker3YrSubCost: 0,
			personalTinkerNetSavings: 0
		};

		if (inputs.activeMode === 'enterprise_ciam') {
			// 1. Initial Custom Build Cost
			const customBuildCost = inputs.buildTime * 160 * 1.5 * inputs.devRate;

			// 2. Custom Maintenance Cost
			const customMaintCostMonthly = (inputs.maintFte / 100) * 160 * inputs.devRate;
			const customMaintCost3Yr = customMaintCostMonthly * 36;

			// 3. Custom Compliance Cost
			let customComplianceCostAnnual = 0;
			if (inputs.complianceLevel === 'soc2') {
				customComplianceCostAnnual = 75000;
			} else if (inputs.complianceLevel === 'hipaa') {
				customComplianceCostAnnual = 150000;
			}
			const customComplianceCost3Yr = customComplianceCostAnnual * 3;

			// 4. Custom Opportunity Cost (Fixed $150,000)
			const customOpportunityCost3Yr = 150000;

			// 5. Total Custom 3-Year TCO
			const custom3YrTco = customBuildCost + customMaintCost3Yr + customComplianceCost3Yr + customOpportunityCost3Yr;

			// 6. SaaS Integration Cost
			const saasIntegrateCost = 8 * inputs.devRate;

			// 7. SaaS Monthly Subscription Cost
			const saasMaintCostMonthly = calculateSaaSMonthlySubscription(inputs.mau);
			const saasSubCost3Yr = saasMaintCostMonthly * 36;

			// 8. Total SaaS 3-Year TCO
			const saas3YrTco = saasIntegrateCost + saasSubCost3Yr;

			// 9. Cost-Per-Use (CPU) calculation
			const cpuCustom = calculateSafeCPU(custom3YrTco, inputs.mau);
			const cpuSaaS = calculateSafeCPU(saas3YrTco, inputs.mau);

			// 10. Break-Even Horizon
			const customMaintAnnual = customMaintCostMonthly * 12 + customComplianceCostAnnual;
			const saasMaintAnnual = saasMaintCostMonthly * 12;
			const breakEven = calculateTrueBreakEven(customBuildCost, customMaintAnnual, saasIntegrateCost, saasMaintAnnual);

			// 11. Adapted Software Index
			const remediationCost = inputs.remediationHours * inputs.devRate;
			const softwareIndex = inputs.codebaseAge * remediationCost;
			const isSoftwareIndexHigh = softwareIndex >= 5000;

			// 12. Determine Verdict
			let verdict: 'BUY' | 'PATCH' | 'WAIT' = 'BUY';
			let verdictRationale = '';

			if (custom3YrTco <= saas3YrTco && inputs.complianceLevel === 'none' && inputs.maintFte < 20) {
				if (inputs.mau < 1000) {
					verdict = 'WAIT';
					verdictRationale = 'Minimal operational scale. Keep session management basic until market validation is achieved.';
				} else {
					verdict = 'PATCH';
					verdictRationale = 'Small scale, low compliance needs, and minimal maintenance overhead make a custom patch viable.';
				}
			} else {
				verdict = 'BUY';
				if (inputs.complianceLevel !== 'none') {
					verdictRationale = `Managed SaaS saves $${(custom3YrTco - saas3YrTco).toLocaleString()} by eliminating manual ${inputs.complianceLevel === 'soc2' ? 'SOC 2 Type II' : 'HIPAA BAA'} audit and infrastructure engineering drag.`;
				} else if (isSoftwareIndexHigh) {
					verdictRationale = 'Codebase tech debt index exceeds the 5,000 threshold. Migrating to standard SaaS prevents systemic maintenance failure.';
				} else {
					verdictRationale = `Managed SaaS integration saves $${(custom3YrTco - saas3YrTco).toLocaleString()} in cumulative engineering labor and opportunity costs.`;
				}
			}

			// Populate outputs
			outputs.verdict = verdict;
			outputs.verdictRationale = verdictRationale;
			outputs.custom3YrTco = custom3YrTco;
			outputs.saas3YrTco = saas3YrTco;
			outputs.customBuildCost = customBuildCost;
			outputs.customMaintCostMonthly = customMaintCostMonthly;
			outputs.customMaintCost3Yr = customMaintCost3Yr;
			outputs.customComplianceCostAnnual = customComplianceCostAnnual;
			outputs.customComplianceCost3Yr = customComplianceCost3Yr;
			outputs.customOpportunityCost3Yr = customOpportunityCost3Yr;
			outputs.saasIntegrateCost = saasIntegrateCost;
			outputs.saasMaintCostMonthly = saasMaintCostMonthly;
			outputs.saasSubCost3Yr = saasSubCost3Yr;
			outputs.cpuCustom = cpuCustom;
			outputs.cpuSaaS = cpuSaaS;
			outputs.breakEvenMonths = breakEven.months;
			outputs.breakEvenVerdict = breakEven.verdict;
			outputs.softwareIndex = softwareIndex;
			outputs.isSoftwareIndexHigh = isSoftwareIndexHigh;
		}

		else if (inputs.activeMode === 'personal_cpu') {
			// Personal CPU (Espresso vs Cafe, Road Bike, etc.)
			const usesPerYear = inputs.cpuWeeklyUses * 52;
			const totalUses = usesPerYear * inputs.cpuLifespanYears;

			// Invisible Cost 1: Depreciation (35% average asset depreciation over lifespan)
			const personalCpuDepreciation = inputs.cpuStickerPrice * 0.35;

			// Invisible Cost 2: Maintenance & Upkeep Budget (5% of sticker price per year)
			const personalCpuMaintenance = inputs.cpuStickerPrice * 0.05 * inputs.cpuLifespanYears;

			// Home TCO = Sticker Price + Operating Cost (uses * cost per drink) + Maintenance
			const personalCpuHomeTco = inputs.cpuStickerPrice + (totalUses * inputs.cpuSecondaryCost) + personalCpuMaintenance;

			// Outsource TCO = Uses * Cafe Price
			const personalCpuOutsourceTco = totalUses * inputs.cpuOutsourceCost;

			// Unit rates
			const personalCpuHomePerUse = totalUses > 0 ? personalCpuHomeTco / totalUses : 0;
			const personalCpuOutsourcePerUse = inputs.cpuOutsourceCost;

			const personalCpuNetSavings = personalCpuOutsourceTco - personalCpuHomeTco;

			// Break Even points
			const priceDiffPerUse = inputs.cpuOutsourceCost - inputs.cpuSecondaryCost;
			let personalCpuBreakEvenUses = Infinity;
			let personalCpuBreakEvenMonths = Infinity;

			if (priceDiffPerUse > 0) {
				personalCpuBreakEvenUses = (inputs.cpuStickerPrice + personalCpuMaintenance) / priceDiffPerUse;
				const usesPerMonth = usesPerYear / 12;
				personalCpuBreakEvenMonths = usesPerMonth > 0 ? personalCpuBreakEvenUses / usesPerMonth : Infinity;
			}

			// Aspirational Check Warning Box
			let personalCpuAspirationalWarning = '';
			if (inputs.cpuWeeklyUses >= 14) {
				personalCpuAspirationalWarning = 'Optimistic frequency warning: High usage assumptions (14+ times/week) might trigger shelf-sitting risk due to descaling, cleaning, and manual setup friction.';
			}

			// Determine Verdict
			let verdict: 'BUY' | 'SKIP' | 'WAIT' = 'BUY';
			let verdictRationale = '';

			if (personalCpuHomePerUse > personalCpuOutsourcePerUse) {
				verdict = 'SKIP';
				verdictRationale = `Outsourcing is financially superior. Your home unit cost is $${personalCpuHomePerUse.toFixed(2)} per use compared to the $${personalCpuOutsourcePerUse.toFixed(2)} outsourcing rate because your usage density is low.`;
			} else {
				verdict = 'BUY';
				verdictRationale = `Home ownership saves $${Math.round(personalCpuNetSavings).toLocaleString()} over ${inputs.cpuLifespanYears} years. Home unit cost drops to $${personalCpuHomePerUse.toFixed(2)} per use.`;
			}

			outputs.verdict = verdict;
			outputs.verdictRationale = verdictRationale;
			outputs.personalCpuHomeTco = personalCpuHomeTco;
			outputs.personalCpuOutsourceTco = personalCpuOutsourceTco;
			outputs.personalCpuHomePerUse = parseFloat(personalCpuHomePerUse.toFixed(2));
			outputs.personalCpuOutsourcePerUse = personalCpuOutsourcePerUse;
			outputs.personalCpuNetSavings = personalCpuNetSavings;
			outputs.personalCpuTotalUses = totalUses;
			outputs.personalCpuBreakEvenUses = Math.ceil(personalCpuBreakEvenUses);
			outputs.personalCpuBreakEvenMonths = parseFloat(personalCpuBreakEvenMonths.toFixed(1));
			outputs.personalCpuDepreciation = personalCpuDepreciation;
			outputs.personalCpuMaintenance = personalCpuMaintenance;
			outputs.personalCpuAspirationalWarning = personalCpuAspirationalWarning;
		}

		else if (inputs.activeMode === 'personal_repair') {
			// Repair vs Replace (HVAC vs Laptops)
			const personalRepairIndex = inputs.repairAssetAge * inputs.repairCost;
			const personalRepairThreshold = inputs.repairAssetType === 'infrastructure' ? 5000 : 1500;

			let verdict: 'REPLACE' | 'REPAIR' = 'REPAIR';
			let verdictRationale = '';

			if (personalRepairIndex >= personalRepairThreshold) {
				verdict = 'REPLACE';
				verdictRationale = `Asset tech debt index of ${personalRepairIndex.toLocaleString()} exceeds the ${personalRepairThreshold.toLocaleString()} threshold. Migrating to a new asset prevents ongoing repair money pits.`;
			} else {
				verdict = 'REPAIR';
				verdictRationale = `Asset tech debt index of ${personalRepairIndex.toLocaleString()} is within the safe zone (under ${personalRepairThreshold.toLocaleString()}). Patching this asset is mathematically efficient.`;
			}

			outputs.verdict = verdict;
			outputs.verdictRationale = verdictRationale;
			outputs.personalRepairIndex = personalRepairIndex;
			outputs.personalRepairThreshold = personalRepairThreshold;
		}

		else if (inputs.activeMode === 'personal_tinkering') {
			// Tinkering Tax (Free Stack vs Paid App)
			const personalTinkerMonthlyTimeCost = inputs.tinkerTroubleshootHours * inputs.tinkerTimeValue;
			const personalTinker3YrTimeCost = personalTinkerMonthlyTimeCost * 36;
			const personalTinker3YrSubCost = inputs.tinkerSubscriptionCost * 36;
			const personalTinkerNetSavings = personalTinker3YrTimeCost - personalTinker3YrSubCost;

			let verdict: 'BUY' | 'WAIT' = 'BUY';
			let verdictRationale = '';

			if (personalTinkerMonthlyTimeCost > inputs.tinkerSubscriptionCost) {
				verdict = 'BUY';
				verdictRationale = `Upgrading to the paid app saves $${personalTinkerNetSavings.toLocaleString()} in personal time value over 3 years by reclaiming ${inputs.tinkerTroubleshootHours} hours of frustration per month.`;
			} else {
				verdict = 'WAIT';
				verdictRationale = `Keep using the free manual workaround. Your personal tinkering time cost of $${personalTinkerMonthlyTimeCost}/mo is lower than the $${inputs.tinkerSubscriptionCost}/mo subscription fee.`;
			}

			outputs.verdict = verdict;
			outputs.verdictRationale = verdictRationale;
			outputs.personalTinkerMonthlyTimeCost = personalTinkerMonthlyTimeCost;
			outputs.personalTinker3YrTimeCost = personalTinker3YrTimeCost;
			outputs.personalTinker3YrSubCost = personalTinker3YrSubCost;
			outputs.personalTinkerNetSavings = personalTinkerNetSavings;
		}

		return outputs;
	}
}
