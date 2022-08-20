import { Settings as SettingsIcon } from 'react-feather'
import { Button } from './shared'

export function Settings() {
	return (
		<>
			<Button>
				<span className="visually-hidden">Open Settings Menu</span>
				<SettingsIcon height={16} width={16} />
			</Button>
		</>
	)
}
