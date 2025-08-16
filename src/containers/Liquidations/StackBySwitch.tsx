import * as React from 'react'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'

export const StackBySwitch = () => {
	const router = useRouter()
	const { stackBy } = router.query as { stackBy: 'chains' | 'protocols' }
	const _stackBy = !!stackBy ? stackBy : 'protocols'

	return (
		<div className="text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap w-fit border border-(--form-control-border) text-(--text-form) max-sm:w-full">
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
				className="shrink-0 px-3 py-[6px] hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white inline-flex max-sm:flex-1 items-center justify-center whitespace-nowrap"
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
				className="shrink-0 px-3 py-[6px] hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white inline-flex max-sm:flex-1 items-center justify-center whitespace-nowrap"
			>
				<Icon name="link" height={14} width={14} />
				<span>Chains</span>
			</button>
		</div>
	)
}
