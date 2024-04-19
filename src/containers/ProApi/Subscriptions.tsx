import dayjs from 'dayjs'
import React from 'react'
import { ExternalLink as External } from 'react-feather'
import styled from 'styled-components'
import { useAccount, useQuery } from 'wagmi'
import useUnsubscribe from './hooks/useUnsubscribe'
import { calculateSubBalance } from './lib'
import { token } from './lib/constants'
import { IFormattedSub, useGetSubs } from './queries/useGetSubs'

const Button = styled.button`
	padding: 8px;
	border-radius: 12px;
	border: none;
	color: #fff;
	font-size: 14px;
	cursor: pointer;
	transition: background 0.3s;
`

const SaveButton = styled(Button)`
	background: #4caf50;

	&:hover {
		background: #45a049;
	}
`

const DeleteButton = styled(Button)`
	background: #f44336;

	&:hover {
		background: #da190b;
	}
`

const Table = styled.table`
	overflow: hidden;
	font-size: 16px;
	width: 100%;
	border-collapse: separate;
	border-spacing: 0;
	transition: all 0.3s ease;
	border-radius: 10px;

	thead th {
		padding: 15px 8px;
		font-size: 16px;
		border-bottom: 1px solid ${({ theme }) => theme.border};
	}
	td,
	th {
		padding: 8px;
		text-align: center;
		background-color: ${({ theme }) => theme.bg1};
		border-right: 1px solid ${({ theme }) => theme.bg2};
		border-bottom: 1px solid ${({ theme }) => theme.bg2};
	}

	th {
		background-color: ${({ theme }) => theme.bg1};
		color: ${({ theme }) => theme.text1};
		font-weight: bold;
	}

	tr:hover {
		background-color: ${({ theme }) => theme.hover};
	}
`

const ExternalLink = styled.a`
	color: #007bff;
	text-decoration: none;
	font-size: 14px;
	display: flex;
	gap: 8px;

	&:hover {
		color: #0056b3;
		text-decoration: underline;
	}
`

const Head = styled.div`
	display: flex;
	align-items: baseline;
	margin-bottom: 16px;
`

const Header = styled.h2`
	display: flex;
	gap: 8px;
	vertical-align: middle;
`

const Status = styled.div<{ isExpired }>`
	color: ${({ isExpired }) => (isExpired ? '#f44336' : '#4caf50')};
`

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
			<td>{(sub.amountPerCycle / 10 ** token.decimals).toFixed(1)} DAI / month</td>
			<td>{sub.status !== 'Canceled' ? dayjs(sub.startTimestamp * 1000).format('MMMM D, YYYY') : '-'}</td>
			<td>{sub.status !== 'Canceled' ? dayjs(sub.realExpiration * 1000).format('MMMM D, YYYY') : '-'}</td>
			<td>
				<Status isExpired={sub.status === 'Expired' || sub.status === 'Canceled'}>{sub.status}</Status>
			</td>
			<td>
				{subBalances?.[sub.id] ? (
					<span style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
						{subBalances?.[sub.id]} <img src={token.img} alt="" width={16} height={16} style={{ marginTop: '2px' }} />{' '}
					</span>
				) : null}
			</td>

			<td>
				{sub.status === 'Not Started Yet' || sub.status === 'Active' ? (
					<div style={{ display: 'flex', gap: '8px' }}>
						<SaveButton onClick={() => startPayment(true)}>Top Up</SaveButton>
						<DeleteButton onClick={() => unsubscribe.unsubscribe()}>Unsubscribe</DeleteButton>
					</div>
				) : null}
			</td>
			<td>
				<a
					style={{ display: 'flex', marginLeft: '2px' }}
					href={`https://optimistic.etherscan.io/tx/${sub.creationTx}`}
					target="_blank"
					rel="noreferrer"
				>
					<External size={16} />
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
		<div style={{ marginTop: '8px' }}>
			<Head>
				<Header>My Subscriptions</Header>
				<ExternalLink style={{ marginLeft: 'auto' }} href="https://subscriptions.llamapay.io/" target="_blank">
					Open in LlamaPay <External size={16} style={{}} />
				</ExternalLink>
			</Head>
			<Table>
				<thead>
					<tr>
						<th>Price</th>
						<th>Start Date</th>
						<th>Expire Date</th>
						<th>Status</th>
						<th>Balance</th>
						<th>Actions</th>
						<th>TX</th>
					</tr>
				</thead>
				<tbody>
					{subs?.map((sub) => {
						return <Subscription sub={sub} key={sub.id} subBalances={subBalances} startPayment={startPayment} />
					})}
				</tbody>
			</Table>
		</div>
	)
}

export default Subscriptions
