import { toNiceCsvDate } from '~/utils'
import type { IRaise } from './types'

// prepare csv data
export const prepareRaisesCsv = ({ raises }: { raises: IRaise[] }) => {
	const rows: (string | number | boolean)[][] = [
		[
			'Name',
			'Timestamp',
			'Date',
			'Amount Raised',
			'Round',
			'Description',
			'Lead Investor',
			'Category',
			'Source',
			'Valuation',
			'Chains',
			'Other Investors'
		]
	]

	const sortedRaises = [...raises].sort((a, b) => b.date - a.date)
	for (const item of sortedRaises) {
		rows.push([
			item.name,
			item.date,
			toNiceCsvDate(item.date),
			item.amount === null ? '' : item.amount * 1_000_000,
			item.round ?? '',
			item.sector ?? '',
			item.leadInvestors?.join(' + ') ?? '',
			item.category ?? '',
			item.source ?? '',
			item.valuation ?? '',
			item.chains?.join(' + ') ?? '',
			item.otherInvestors?.join(' + ') ?? ''
		])
	}

	return { filename: `raises`, rows }
}
