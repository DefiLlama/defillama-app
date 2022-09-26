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
