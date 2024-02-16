import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import { useContractWrite, useWaitForTransaction } from 'wagmi'
import { SUBSCRIPTIONS_ABI } from '../lib/abi.subscriptions'
import { optimism, subsContractAddress } from '../lib/constants'
import { IFormattedSub } from '../queries/useGetSubs'

const useUnsubscribe = (sub: IFormattedSub) => {
	const {
		data: unsubscribeTxData,
		write: unsubscribe,
		isLoading: confirmingUnsubscribeTx,
		reset
	} = useContractWrite({
		address: subsContractAddress,
		abi: SUBSCRIPTIONS_ABI,
		mode: 'recklesslyUnprepared',
		functionName: 'unsubscribe',
		args: [
			sub.initialPeriod,
			sub.expirationDate,
			sub.amountPerCycle,
			sub.receiver,
			sub.accumulator,
			sub.initialShares
		].map((x) => (typeof x === 'number' ? ethers.utils.parseUnits(x.toString(), 0) : x)),
		chainId: optimism.id,
		onError: (err) => {
			const msg = (err as any)?.shortMessage ?? err.message
			toast.error(msg, { id: 'error-confirming-unsub-tx' + (unsubscribeTxData?.hash ?? '') })
		}
	})

	const { data: unsubscribeTxDataOnChain, isLoading: waitingForUnsubscribeTxDataOnChain } = useWaitForTransaction({
		hash: unsubscribeTxData?.hash,
		enabled: unsubscribeTxData ? true : false,
		chainId: optimism.id,
		onError: (err) => {
			const msg = (err as any)?.shortMessage ?? err.message
			toast.error(msg, { id: 'error-confirming-unsub-tx-on-chain' + (unsubscribeTxData?.hash ?? '') })
		},
		onSuccess: (data) => {
			if (data.status === 200) {
				toast.success('Transaction Success', { id: 'tx-success' + data.transactionHash })
				reset()
			} else {
				toast.error('Transaction Failed', { id: 'tx-failed' + data.transactionHash })
			}
		}
	})

	return { unsubscribe, confirmingUnsubscribeTx, reset, unsubscribeTxDataOnChain, waitingForUnsubscribeTxDataOnChain }
}

export default useUnsubscribe
