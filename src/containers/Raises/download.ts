import { toNiceCsvDate } from '~/utils'

// prepare csv data
export const prepareRaisesCsv = ({ raises }) => {
	const rows = [
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

	const removeJumps = (text: string | number) =>
		typeof text === 'string' ? '"' + text.replaceAll('\n', '').replaceAll('"', "'") + '"' : text
	raises
		.sort((a, b) => b.date - a.date)
		.forEach((item) => {
			rows.push(
				[
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
			)
		})

	return { filename: `raises.csv`, rows: rows as (string | number | boolean)[][] }
}
