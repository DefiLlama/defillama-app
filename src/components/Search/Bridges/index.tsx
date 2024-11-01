import { useState } from 'react'
import { OptionToggle } from '~/components/OptionToggle'
import { DesktopSearch } from '~/components/Search/Base/Desktop'
import type { ICommonSearchProps } from '../types'
import { useGetBridgesSearchList } from './hooks'

interface IBridgesSearchProps extends ICommonSearchProps {
	onlyChains?: boolean
	onToggleClick?: (enabled: boolean) => void
}

interface IBridgesSearchSelectProps extends ICommonSearchProps {
	onlyChains?: boolean
	formValueToEdit?: any
	formProperty: string
	placeholder: string
	click?: (item: string) => void
}

export function BridgesSearch(props: IBridgesSearchProps) {
	const { data, loading } = useGetBridgesSearchList()

	return <DesktopSearch {...props} data={data} loading={loading} />
}

export function BridgesSearchWithBreakdown(props: IBridgesSearchProps) {
	const [isToggleEnabled, setIsToggleEnabled] = useState(false)
	const { data, loading } = useGetBridgesSearchList()

	return (
		<DesktopSearch
			{...props}
			data={data}
			loading={loading}
			filters={
				props.onToggleClick && (
					<ul className="flex items-center flex-end">
						<li className="ml-5 first-of-type:ml-0">
							<OptionToggle
								name="Bridge breakdown"
								toggle={() => {
									setIsToggleEnabled((prev) => {
										props.onToggleClick(!prev)
										return !prev
									})
								}}
								help="Break down 'All' volume chart by bridge"
								enabled={isToggleEnabled}
							/>
						</li>
					</ul>
				)
			}
		/>
	)
}

export function BridgesSearchSelect(props: IBridgesSearchSelectProps) {
	const { data, loading } = useGetBridgesSearchList()

	const itemClick = (item) => {
		props.formValueToEdit[props.formProperty] = item.name
		props.click(item.name)
	}

	return (
		<DesktopSearch
			{...props}
			data={data}
			loading={loading}
			data-alwaysdisplay={true}
			placeholder={props.placeholder}
			onItemClick={itemClick}
		/>
	)
}
