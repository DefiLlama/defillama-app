import ReactSwitch from 'react-switch'
import { TYPE } from '~/Theme'
import HeadHelp from '~/components/HeadHelp'

interface IProps {
	toggle: () => {}
	enabled: boolean
	help: string
	name: string
}

const Switch = ReactSwitch as any

const OptionToggle = ({ toggle, enabled = false, help, name }: IProps) => {
	return (
		<TYPE.body
			style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'flex-start'
			}}
		>
			<Switch
				onChange={toggle}
				checked={enabled}
				onColor="#0A71F1"
				height={20}
				width={40}
				uncheckedIcon={false}
				checkedIcon={false}
			/>
			&nbsp;
			{help ? <HeadHelp title={name} text={help} /> : name}
		</TYPE.body>
	)
}

export default OptionToggle
