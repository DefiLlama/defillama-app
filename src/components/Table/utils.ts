import { allColumns } from './Columns'
import { TColumns } from './types'

export function splitArrayByFalsyValues(data, column) {
	return data.reduce(
		(acc, curr) => {
			if (!curr[column] && curr[column] !== 0) {
				acc[1].push(curr)
			} else acc[0].push(curr)
			return acc
		},
		[[], []]
	)
}

export function columnsToShow(...names: TColumns[]) {
	return names.map((item) => allColumns[item])
}

export function columnToShow(name: TColumns) {
	return columnsToShow(name)[0]
}
