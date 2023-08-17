import styled from 'styled-components'
import DatePicker from 'react-datepicker'

import { CalendarIcon } from '~/components/Table/shared'

export const DateInput = styled.input``
export const FilterContainer = styled.div`
	display: flex;

	padding-right: 8px;
	padding-left: 8px;
	background-color: ${({ theme }) => theme.bg6};
	border-radius: 8px;

	align-items: center;

	input {
		max-width: 102px;
		margin-right: 8px;
	}
`

export const formatDate = (date) =>
	new Intl.DateTimeFormat('en-US', {
		year: '2-digit',
		month: '2-digit',
		day: '2-digit'
	}).format(date)

export const DateFilter = ({ startDate, endDate, onStartChange, onEndChange, hours, setHours }) => {
	const [startHour, endHour] = hours

	return (
		<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
			From
			<FilterContainer>
				<div style={{ position: 'relative' }}>
					<CalendarIcon size={16} />
					<DateInput value={startDate && `${formatDate(startDate)}`} onClick={() => onStartChange(null)} />
				</div>
				<div style={{ position: 'absolute', zIndex: 100, top: 0, display: startDate ? 'none' : 'block' }}>
					<DatePicker
						showIcon
						onChange={onStartChange}
						onCalendarOpen={() => onStartChange(null)}
						selected={startDate}
						inline
						shouldCloseOnSelect={true}
					/>
				</div>
				<input
					value={startHour}
					onChange={(e) => setHours([e.target?.value, endHour])}
					style={{ width: '24px', paddingLeft: 0, marginRight: 0, paddingRight: 0 }}
				/>
				h
			</FilterContainer>
			to
			<FilterContainer>
				<div style={{ position: 'relative' }}>
					<CalendarIcon size={16} />
					<DateInput value={endDate && `${formatDate(endDate)}`} onClick={() => onEndChange(null)} />
				</div>
				<div style={{ position: 'absolute', top: 0, zIndex: 100, display: endDate ? 'none' : 'block' }}>
					<DatePicker
						showIcon
						onChange={onEndChange}
						onCalendarOpen={() => onEndChange(null)}
						selected={endDate}
						inline
						shouldCloseOnSelect={true}
					/>
				</div>
				<input
					value={endHour}
					onChange={(e) => setHours([startHour, e.target?.value])}
					style={{ width: '24px', paddingLeft: 0, marginRight: 0, paddingRight: 0 }}
				/>
				h
			</FilterContainer>
		</div>
	)
}
