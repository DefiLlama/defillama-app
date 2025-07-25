import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'

export const StackBySwitch = () => {
	const router = useRouter()
	const { stackBy } = router.query as { stackBy: 'chains' | 'protocols' }
	const _stackBy = !!stackBy ? stackBy : 'protocols'

	return (
		<div className="text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap border border-(--form-control-border) text-[#666] dark:text-[#919296]">
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
				className="flex items-center gap-1 shrink-0 py-2 px-3 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
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
				className="flex items-center gap-1 shrink-0 py-2 px-3 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
			>
				<Icon name="link" height={14} width={14} />
				<span>Chains</span>
			</button>
		</div>
	)
}
