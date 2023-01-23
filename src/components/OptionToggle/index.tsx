import { CSSProperties } from 'react'
import ReactSwitch from 'react-switch'
import styled from 'styled-components'
import HeadHelp from '~/components/HeadHelp'
import Image from 'next/future/image'
import Loading from '~/assets/loading_circle.svg'
import LocalLoader from '../LocalLoader'

interface IProps {
	toggle: () => void
	enabled: boolean
	help?: string
	name: string
	style?: CSSProperties
	isLoading?: boolean
}

const Wrapper = styled.div`
	display: flex;
	align-items: center;
	justify-content: flex-start;
`

const Switch = ReactSwitch as any

const baseWidth = 40
const baseHeight = 20

const OptionToggle = ({ toggle, enabled = false, help, name, isLoading = false, ...props }: IProps) => {
	return (
		<>
			<Wrapper {...props}>
				{isLoading ? (
					<Image
						style={{ margin: `0 ${(baseWidth - baseHeight) / 2}px` }}
						height={baseHeight * 0.75}
						src={Loading}
						alt="Loading"
					/>
				) : (
					<Switch
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
				{help ? <HeadHelp title={name} text={help} /> : name}
			</Wrapper>
		</>
	)
}

export default OptionToggle
