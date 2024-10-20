import { useQuery } from '@tanstack/react-query'
import { llamaAddress, periodDuration, subgraphApi, subscriptionAmount, token } from '../lib/constants'
import { isSubscribed } from '~/containers/ProContainer/queries/useIsSubscribed'

export interface ISub {
	expirationDate: string
	id: string
	initialPeriod: string
	initialShares: string
	receiver: string
	startTimestamp: string
	unsubscribed: boolean
	amountPerCycle: string
	realExpiration: string
	accumulator: string
	creationTx: string
}

export interface IFormattedSub {
	id: string
	receiver: string
	startTimestamp: number
	unsubscribed: boolean
	initialShares: number | string
	initialPeriod: number
	expirationDate: number
	periodDuration: number
	fullPeriodStartingTime: number
	totalAmountPaid: number
	amountPerCycle: number
	realExpiration: number
	subDuration: string
	accumulator: number
	creationTx: string
	status: string
}

const getStatusPriority = (status) => {
	switch (status) {
		case 'Active':
			return 1
		case 'Not Started Yet':
			return 2
		case 'Canceled':
			return 3
		case 'Expired':
			return 4
		default:
			return 5
	}
}

async function getSubscriptions(address?: `0x${string}` | null) {
	try {
		if (!address) return null
		const subscribed = await isSubscribed(address)
		if (subscribed === false) {
			return {
				subs: [],
				isSubscribed: false
			}
		}

		const subs = `
          {
              subs(where: { owner: "${address.toLowerCase()}", receiver: "${llamaAddress.toLowerCase()}" } orderBy: realExpiration orderDirection: desc ) {
                  id
                  receiver
                  startTimestamp
                  unsubscribed
                  initialShares
                  initialPeriod
                  expirationDate
                  amountPerCycle
                  realExpiration
                  accumulator
									creationTx
              }
          }
      `
		const data: { data: { subs: Array<ISub> } } = await fetch(subgraphApi, {
			method: 'POST',
			body: JSON.stringify({
				query: subs
			})
		}).then((r) => r.json())
		const now = new Date().getTime() / 1000

		const subsRes = (data.data.subs ?? [])
			.map((sub) => {
				const id = sub.id
				const receiver = sub.receiver
				const startTimestamp = +sub.startTimestamp
				const unsubscribed = sub.unsubscribed
				const initialShares = sub.initialShares
				const initialPeriod = +sub.initialPeriod
				const expirationDate = +sub.expirationDate
				const amountPerCycle = +sub.amountPerCycle
				const realExpiration = +sub.realExpiration
				const accumulator = +sub.accumulator
				const fullPeriodStartingTime = initialPeriod + periodDuration
				const partialPeriodTime = fullPeriodStartingTime - startTimestamp
				const fullCycles = (expirationDate - initialPeriod) / periodDuration
				const amountPaidFully = fullCycles * amountPerCycle
				const partialCycles = partialPeriodTime / periodDuration
				const amountPaidPartially = partialCycles * amountPerCycle

				let subDuration = `${fullCycles} ${periodDuration === 24 * 60 * 60 ? 'days' : 'month'}`

				if (partialCycles) {
					subDuration += `,`

					const [hours, minutes] = (partialCycles * 24).toString().split('.')

					if (hours) {
						subDuration += ` ${hours} hours`
					}

					if (minutes) {
						subDuration += ` ${(+minutes * 60).toString().slice(0, 2)} minutes`
					}
				}

				const isCanceled = realExpiration === startTimestamp

				const status = (() => {
					if (isCanceled) {
						return 'Canceled'
					}
					if (realExpiration > new Date().getTime() / 1000) {
						if (startTimestamp > new Date().getTime() / 1000) {
							return 'Not Started Yet'
						}
						return 'Active'
					}
					return 'Expired'
				})()

				return {
					id,
					receiver,
					startTimestamp,
					unsubscribed,
					initialShares,
					initialPeriod,
					expirationDate,
					periodDuration,
					fullPeriodStartingTime,
					totalAmountPaid: +((amountPaidPartially + amountPaidFully) / 10 ** token.decimals).toFixed(2),
					amountPerCycle,
					realExpiration,
					subDuration,
					accumulator,
					creationTx: sub.creationTx,
					status
				} as IFormattedSub
			})
			.filter(({ amountPerCycle }) => amountPerCycle >= subscriptionAmount * 10 ** token.decimals)
			.sort((a, b) => {
				return getStatusPriority(a.status) - getStatusPriority(b.status)
			})

		return {
			subs: subsRes,
			isSubscribed: true
		}
	} catch (error: any) {
		throw new Error(error.message ?? 'Failed to fetch subscriptions')
	}
}

export const useGetSubs = ({ address }: { address?: `0x${string}` | null }) => {
	const res = useQuery({
		queryKey: ['subs', address],
		queryFn: () => getSubscriptions(address),
		enabled: address ? true : false,
		staleTime: 10_000,
		refetchInterval: 10_000
	})
	return { ...res, data: res.data ?? { subs: [], isSubscribed: false } }
}
