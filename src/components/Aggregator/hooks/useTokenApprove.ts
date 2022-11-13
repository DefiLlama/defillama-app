import { BigNumber, ethers } from 'ethers'
import { erc20ABI, useAccount, useContractRead, useContractWrite, usePrepareContractWrite } from 'wagmi'

export const useTokenApprove = (token: string, spender: `0x${string}`, amount) => {
	const { address } = useAccount()

	const normalizedAmount = Number(amount) ? amount : '0'
	const { config } = usePrepareContractWrite({
		address: token,
		abi: erc20ABI,
		functionName: 'approve',
		args: [spender, normalizedAmount ? BigNumber.from(normalizedAmount) : ethers.constants.MaxUint256]
	})

	const { config: configInfinite } = usePrepareContractWrite({
		address: token,
		abi: erc20ABI,
		functionName: 'approve',
		args: [spender, ethers.constants.MaxUint256]
	})

	const { write: approve } = useContractWrite(config)
	const { write: approveInfinite } = useContractWrite(configInfinite)

	const { data: allowance } = useContractRead({
		address: token,
		abi: erc20ABI,
		functionName: 'allowance',
		args: [address, spender],
		watch: true
	})

	if (token === ethers.constants.AddressZero) return { isApproved: true }

	if (!address || !allowance) return { isApproved: false }
	if (allowance.toString() === ethers.constants.MaxUint256.toString()) return { isApproved: true }

	if (normalizedAmount && allowance.gte(BigNumber.from(normalizedAmount))) return { isApproved: true }

	return { isApproved: false, approve, approveInfinite }
}
