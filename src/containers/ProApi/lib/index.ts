import { ethers, BigNumber } from 'ethers'
import { subsContract, SUBSCRIPTION_AMOUNT_DIVISOR, SUBSCRIPTION_DURATION, token } from './constants'

export async function calculateSubBalance({ sub }) {
	try {
		if (!sub || ['Canceled', 'Expired'].includes(sub.status)) return null
		const initialShares = sub.initialShares

		const currentTimestamp = Math.floor(Date.now() / 1e3)

		if (+sub.realExpiration > currentTimestamp) {
			let [sharesAccumulator, currentPeriod] = await Promise.all([
				subsContract.sharesAccumulator(),
				subsContract.currentPeriod(),
				subsContract.totalSupply()
			])

			if (currentPeriod + SUBSCRIPTION_DURATION < currentTimestamp) {
				const shares = await subsContract.convertToShares(SUBSCRIPTION_AMOUNT_DIVISOR)
				sharesAccumulator = sharesAccumulator.add((currentTimestamp - currentPeriod) / SUBSCRIPTION_DURATION) * shares
			}

			const sharesPaid =
				((sharesAccumulator - sub.accumulator) * sub.amountPerCycle) / +SUBSCRIPTION_AMOUNT_DIVISOR.toString()

			const sharesLeft = ethers.utils.parseUnits((initialShares - sharesPaid).toString(), 0)
			const balance = await subsContract.convertToAssets(sharesLeft)

			return [sub.id, (+balance?.toString() / 10 ** token.decimals).toFixed(1)]
		} else {
			return null
		}
	} catch (e) {
		return null
	}
}
