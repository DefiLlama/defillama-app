export type PlanKey = 'free' | 'pro' | 'api' | 'enterprise'
export type BillingCycle = 'monthly' | 'yearly'
export type Availability = 'check' | 'dash'

export interface FeatureItem {
	label: string
	availability: Availability
	highlightText?: boolean
}

export interface FeatureSection {
	title: string
	items: FeatureItem[]
}

export interface PricingCardData {
	key: PlanKey
	title: string
	priceMain?: string
	priceUnit?: string
	priceSecondary?: string
	description?: string
	includedTierText?: string
	sections: FeatureSection[]
	primaryCta: string
	secondaryCta?: string
	highlighted?: boolean
	recommendedLabel?: string
}

export interface ComparisonRow {
	label: string
	values: Record<PlanKey, Availability>
}

export interface ComparisonSection {
	title: string
	rows: ComparisonRow[]
}

export interface PlanMeta {
	title: string
	price: string
	action: string
}

export interface FaqItem {
	question: string
	answer: string
}
