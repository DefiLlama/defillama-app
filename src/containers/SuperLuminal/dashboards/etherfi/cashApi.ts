import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { assignColors, fetchDuneQuery, pivotByDate } from '../spark/api'

interface EtherfiCashTxnRow {
	date: string
	txn_class: string
	num_txns: number
	num_users: number
	total_txns: number
	total_users: number
	total_avg_per_user: number
	last_week_txns: number
	last_week_users: number
	last_week_avg: number
	all_time_txns: number
	all_time_users: number
	all_time_avg: number
}

export function useEtherfiCashTransactions() {
	const query = useQuery({
		queryKey: ['dune-etherfi-cash-txns'],
		queryFn: () => fetchDuneQuery<EtherfiCashTxnRow>('6370257'),
		staleTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		const rows = query.data?.result?.rows ?? []

		// KPIs from counter columns (same on every row)
		const first = rows[0]
		const kpis = first
			? {
					allTimeTxns: first.all_time_txns,
					allTimeUsers: first.all_time_users,
					allTimeAvg: first.all_time_avg,
					lastWeekTxns: first.last_week_txns,
					lastWeekUsers: first.last_week_users,
					lastWeekAvg: first.last_week_avg
				}
			: null

		// Chart 1: Weekly Txns by Class (stacked)
		const txnClasses = [...new Set(rows.map((r) => r.txn_class))].sort()
		const colors = assignColors(txnClasses)
		// pivotByDate expects a 'dt' field, so remap
		const rowsWithDt = rows.map((r) => ({ ...r, dt: r.date }))
		const txnsByClass = pivotByDate(rowsWithDt, 'txn_class', 'num_txns')
		const usersByClass = pivotByDate(rowsWithDt, 'txn_class', 'num_users')

		// Charts 2-4: deduplicate by week (one row per date)
		const weekMap = new Map<number, { total_txns: number; total_users: number; total_avg_per_user: number }>()
		for (const row of rows) {
			const ts = Math.floor(new Date(row.date).getTime() / 1000)
			if (!weekMap.has(ts)) {
				weekMap.set(ts, {
					total_txns: row.total_txns,
					total_users: row.total_users,
					total_avg_per_user: row.total_avg_per_user
				})
			}
		}

		const sortedWeeks = Array.from(weekMap.entries()).sort(([a], [b]) => a - b)

		const weeklyTxns = sortedWeeks.map(([ts, v]) => ({ date: ts, Transactions: v.total_txns }))
		const weeklyUsers = sortedWeeks.map(([ts, v]) => ({ date: ts, 'Active Users': v.total_users }))
		const weeklyAvg = sortedWeeks.map(([ts, v]) => ({ date: ts, 'Avg Txns per User': v.total_avg_per_user }))

		return {
			...query,
			kpis,
			txnsByClass,
			usersByClass,
			txnClasses,
			colors,
			weeklyTxns,
			weeklyUsers,
			weeklyAvg
		}
	}, [query])
}
