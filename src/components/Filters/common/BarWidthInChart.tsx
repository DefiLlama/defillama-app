import { MenuButtonArrow } from 'ariakit'
import { ApplyFilters } from '~/components'
import Popover from '~/components/Popover'
import { Settings } from 'react-feather'
import { useChartManager } from '~/contexts/LocalStorage'
import { PopoverContent, PopoverForm } from './Base'

export function BarWidthInChart({ color }: { color: string }) {
	const [barMinWidth, updateWidth] = useChartManager()

	const onSubmit = (e) => {
		e.preventDefault()
		const form = e.target
		const minAvailable = Number(form.min?.value)
		updateWidth(Number.isNaN(minAvailable) ? 0 : minAvailable)
	}

	return (
		<Popover
			trigger={
				<>
					<Settings size={14} style={{ height: '19.5px' }} />
					<MenuButtonArrow />
				</>
			}
			content={
				<PopoverContent>
					<PopoverForm onSubmit={onSubmit}>
						<label>
							<span>Bar width in chart</span>
							<input
								type="number"
								name="min"
								defaultValue={Number.isNaN(Number(barMinWidth)) ? 0 : Number(barMinWidth)}
								min={0}
								max={5}
							/>
						</label>

						<ApplyFilters>Update</ApplyFilters>
					</PopoverForm>
				</PopoverContent>
			}
			variant="secondary"
			color={color}
		/>
	)
}
