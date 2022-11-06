import { ethers } from 'ethers'
import { erc20ABI, useAccount, useContractRead, useContractWrite, usePrepareContractWrite } from 'wagmi'

export const useTokenApprove = (token: string, spender: `0x${string}`) => {
	const { address } = useAccount()

	const { config } = usePrepareContractWrite({
		address: token,
		abi: erc20ABI,
		functionName: 'approve',
		args: [spender, ethers.constants.MaxUint256]
	})

	const { write } = useContractWrite(config)
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

	return { isApproved: false, approve: write }
}
