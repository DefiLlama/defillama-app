import { CSSProperties } from 'react'
import ReactSwitch from 'react-switch'
import styled from 'styled-components'
import HeadHelp from '~/components/HeadHelp'
import Image from 'next/future/image'
import Loading from '~/assets/logo_white.png'

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

const OptionToggle = ({ toggle, enabled = false, help, name, isLoading = false, ...props }: IProps) => {
	return (
		<Wrapper {...props}>
			{isLoading ? (
				/* <Image height={20} src={Loading} alt="Loading" /> */
				<>Loading</>
			) : (
				<Switch
					onChange={toggle}
					checked={enabled}
					onColor="#0A71F1"
					height={20}
					width={40}
					uncheckedIcon={false}
					checkedIcon={false}
				/>
			)}
			&nbsp;
			{help ? <HeadHelp title={name} text={help} /> : name}
		</Wrapper>
	)
}

export default OptionToggle
