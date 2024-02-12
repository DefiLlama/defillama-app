import { useQuery } from 'react-query'
import request, { gql } from 'graphql-request'
import { llamaAddress, periodDuration, subgraphApi, token } from '../lib/constants'

interface ISub {
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
}

interface IFormattedSub {
	id: string
	receiver: string
	startTimestamp: number
	unsubscribed: boolean
	initialShares: number
	initialPeriod: number
	expirationDate: number
	periodDuration: number
	fullPeriodStartingTime: number
	totalAmountPaid: number
	amountPerCycle: number
	realExpiration: number
	subDuration: string
	accumulator: number
}

async function getSubscriptions(address?: `0x${string}` | null) {
	try {
		if (!address) return null

		const subs = gql`
          {
              subs(where: { owner: "${address.toLowerCase()}", receiver: "${llamaAddress.toLowerCase()}" } orderBy: expirationDate orderDirection: desc ) {
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
              }
          }
      `
		const data: { subs: Array<ISub> } = await request(subgraphApi, subs)

		return (data.subs ?? []).map((sub) => {
			const id = sub.id
			const receiver = sub.receiver
			const startTimestamp = +sub.startTimestamp
			const unsubscribed = sub.unsubscribed
			const initialShares = +sub.initialShares
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
				accumulator
			} as IFormattedSub
		})
	} catch (error: any) {
		throw new Error(error.message ?? 'Failed to fetch subscriptions')
	}
}

export const useGetSubs = ({ address }: { address?: `0x${string}` | null }) => {
	return useQuery(['subs', address], () => getSubscriptions(address), {
		enabled: address ? true : false,
		cacheTime: 20_000,
		refetchInterval: 20_000
	})
}
