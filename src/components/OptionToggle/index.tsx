import { CSSProperties } from 'react'
import ReactSwitch from 'react-switch'
import Image from 'next/future/image'
import Loading from '~/assets/loading_circle.svg'
import { Tooltip } from '~/components/Tooltip'
import { Icon } from '~/components/Icon'

interface IProps {
	toggle: () => void
	enabled: boolean
	help?: string
	name: string
	style?: CSSProperties
	isLoading?: boolean
}

const Switch = ReactSwitch as any

const baseWidth = 40
const baseHeight = 20

export const OptionToggle = ({ toggle, enabled = false, help, name, isLoading = false, ...props }: IProps) => {
	return (
		<>
			<label {...props} className="flex items-center justify-start" htmlFor={name}>
				{isLoading ? (
					<Image
						style={{ margin: `0 ${(baseWidth - baseHeight) / 2}px` }}
						height={baseHeight * 0.75}
						src={Loading}
						alt="Loading"
					/>
				) : (
					<Switch
						id={name}
						onChange={toggle}
						checked={enabled}
						onColor="#0A71F1"
						height={baseHeight}
						width={baseWidth}
						uncheckedIcon={false}
						checkedIcon={false}
					/>
				)}
				&nbsp;
				{help ? (
					<Tooltip content={help}>
						<span>{name}</span>
						<Icon name="help-circle" height={15} width={15} />
					</Tooltip>
				) : (
					name
				)}
			</label>
		</>
	)
}
