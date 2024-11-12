import dayjs from 'dayjs'
import React from 'react'
import { useAccount, useQuery } from 'wagmi'
import useUnsubscribe from './hooks/useUnsubscribe'
import { calculateSubBalance } from './lib'
import { token } from './lib/constants'
import { IFormattedSub, useGetSubs } from './queries/useGetSubs'
import { Icon } from '~/components/Icon'

const Subscription = ({
	sub,
	subBalances,
	startPayment
}: {
	sub: IFormattedSub
	subBalances: Record<string, number>
	startPayment: (isTopup: boolean) => void
}) => {
	const unsubscribe = useUnsubscribe(sub)
	return (
		<tr>
			<td className="p-2 border border-[var(--bg2)] text-center">
				{(sub.amountPerCycle / 10 ** token.decimals).toFixed(1)} DAI / month
			</td>
			<td className="p-2 border border-[var(--bg2)] text-center">
				{sub.status !== 'Canceled' ? dayjs(sub.startTimestamp * 1000).format('MMMM D, YYYY') : '-'}
			</td>
			<td className="p-2 border border-[var(--bg2)] text-center">
				{sub.status !== 'Canceled' ? dayjs(sub.realExpiration * 1000).format('MMMM D, YYYY') : '-'}
			</td>
			<td
				className="p-2 border border-[var(--bg2)] text-center"
				style={{ color: sub.status === 'Expired' || sub.status === 'Canceled' ? '#f44336' : '#4caf50' }}
			>
				{sub.status}
			</td>
			<td className="p-2 border border-[var(--bg2)] text-center">
				{subBalances?.[sub.id] ? (
					<span style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
						{subBalances?.[sub.id]} <img src={token.img} alt="" width={16} height={16} style={{ marginTop: '2px' }} />{' '}
					</span>
				) : null}
			</td>

			<td className="p-2 border border-[var(--bg2)] text-center">
				{sub.status === 'Not Started Yet' || sub.status === 'Active' ? (
					<div style={{ display: 'flex', gap: '8px' }}>
						<button
							onClick={() => startPayment(true)}
							className="p-2 rounded-md text-white transition-all duration-300 bg-[#4caf50]"
						>
							Top Up
						</button>
						<button
							onClick={() => unsubscribe.unsubscribe()}
							className="p-2 rounded-md text-white transition-all duration-300 bg-[#f44336] hover:bg-[#da190b]"
						>
							Unsubscribe
						</button>
					</div>
				) : null}
			</td>
			<td className="p-2 border border-[var(--bg2)] text-center">
				<a
					className="ml-2"
					href={`https://optimistic.etherscan.io/tx/${sub.creationTx}`}
					target="_blank"
					rel="noreferrer"
				>
					<Icon name="external-link" height={16} width={16} />
				</a>
			</td>
		</tr>
	)
}

const Subscriptions = ({ startPayment }) => {
	const wallet = useAccount()

	const {
		data: { subs }
	} = useGetSubs({ address: wallet?.address })

	const { data: subBalances } = useQuery(['subBalances', subs?.length], async () => {
		const res = await Promise.all(subs.map((sub) => calculateSubBalance({ sub })))

		return Object.fromEntries(res.filter(Boolean))
	})

	return (
		<div className="mt-2 overflow-auto">
			<div className="mb-4 flex items-baseline">
				<h2 className="flex gap-2">My Subscriptions</h2>
				<a
					href="https://subscriptions.llamapay.io/"
					target="_blank"
					rel="noreferrer noopener"
					className="ml-auto font-medium flex items-center gap-2 text-[#007bff] text-sm hover:underline hover:text-[#0056b3]"
				>
					<span>Open in LlamaPay</span> <Icon name="external-link" height={16} width={16} />
				</a>
			</div>
			<table className="text-base w-full border-separate border-spacing-0 transition-all duration-300 ease-out rounded-md">
				<thead>
					<tr>
						<th className="py-4 px-2 border border-[var(--bg2)] text-center">Price</th>
						<th className="py-4 px-2 border border-[var(--bg2)] text-center">Start Date</th>
						<th className="py-4 px-2 border border-[var(--bg2)] text-center">Expire Date</th>
						<th className="py-4 px-2 border border-[var(--bg2)] text-center">Status</th>
						<th className="py-4 px-2 border border-[var(--bg2)] text-center">Balance</th>
						<th className="py-4 px-2 border border-[var(--bg2)] text-center">Actions</th>
						<th className="py-4 px-2 border border-[var(--bg2)] text-center">TX</th>
					</tr>
				</thead>
				<tbody>
					{subs?.map((sub) => {
						return <Subscription sub={sub} key={sub.id} subBalances={subBalances} startPayment={startPayment} />
					})}
				</tbody>
			</table>
		</div>
	)
}

export default Subscriptions
