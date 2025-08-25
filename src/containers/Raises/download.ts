import { toNiceCsvDate } from '~/utils'

// prepare csv data
export const prepareCsvData = ({ raises }) => {
	const headers = [
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

	const removeJumps = (text: string | number) =>
		typeof text === 'string' ? '"' + text.replaceAll('\n', '').replaceAll('"', "'") + '"' : text
	
	const rows = raises
		.sort((a, b) => b.date - a.date)
		.map((item) => {
			return [
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
			].map(removeJumps) as string[]
		})

	return { headers, rows }
}

export const downloadCsv = prepareCsvData
