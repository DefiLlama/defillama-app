import { useRouter } from 'next/router'
import * as React from 'react'
import { Icon } from '~/components/Icon'

export const StackBySwitch = () => {
	const router = useRouter()
	const { stackBy } = router.query as { stackBy: 'chains' | 'protocols' }
	const _stackBy = stackBy ?? 'protocols'

	return (
		<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form) max-sm:w-full">
			<button
				data-active={_stackBy === 'protocols'}
				onClick={() => {
					router.push(
						{
							query: {
								...router.query,
								stackBy: 'protocols'
							}
						},
						undefined,
						{ shallow: true }
					)
				}}
				className="inline-flex shrink-0 items-center justify-center gap-1 px-3 py-1.5 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white max-sm:flex-1"
			>
				<Icon name="map" height={14} width={14} />
				<span>Protocols</span>
			</button>
			<button
				data-active={_stackBy === 'chains'}
				onClick={() => {
					router.push(
						{
							query: {
								...router.query,
								stackBy: 'chains'
							}
						},
						undefined,
						{ shallow: true }
					)
				}}
				className="inline-flex shrink-0 items-center justify-center gap-1 px-3 py-1.5 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white max-sm:flex-1"
			>
				<Icon name="link" height={14} width={14} />
				<span>Chains</span>
			</button>
		</div>
	)
}
