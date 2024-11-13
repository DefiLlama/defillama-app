import * as React from 'react'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'

export const StackBySwitch = () => {
	const router = useRouter()
	const { stackBy } = router.query as { stackBy: 'chains' | 'protocols' }
	const _stackBy = !!stackBy ? stackBy : 'protocols'

	return (
		<div className="flex items-center justify-between gap-2 rounded-md p-[6px] w-[220px] bg-[var(--bg6)]">
			<button
				data-active={_stackBy === 'protocols'}
				onClick={() => {
					router.push({
						query: {
							...router.query,
							stackBy: 'protocols'
						}
					})
				}}
				className="flex items-center justify-center gap-1 text-sm whitespace-nowrap flex-nowrap p-[6px] rounded-md flex-1 bg-[var(--bg6)] data-[active=true]:bg-[#445ed0] data-[active=true]:text-white"
			>
				<Icon name="map" height={14} width={14} />
				<span>Protocols</span>
			</button>
			<button
				data-active={_stackBy === 'chains'}
				onClick={() => {
					router.push({
						query: {
							...router.query,
							stackBy: 'chains'
						}
					})
				}}
				className="flex items-center justify-center gap-1 text-sm whitespace-nowrap flex-nowrap p-[6px] rounded-md flex-1 bg-[var(--bg6)] data-[active=true]:bg-[#445ed0] data-[active=true]:text-white"
			>
				<Icon name="link" height={14} width={14} />
				<span>Chains</span>
			</button>
		</div>
	)
}
