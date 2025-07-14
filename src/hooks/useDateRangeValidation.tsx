import { useState } from 'react'

interface DateRangeValidationOptions {
	initialStartDate?: string
	initialEndDate?: string
}

export const useDateRangeValidation = (options?: DateRangeValidationOptions) => {
	const [startDate, setStartDate] = useState(options?.initialStartDate || '')
	const [endDate, setEndDate] = useState(options?.initialEndDate || '')
	const [dateError, setDateError] = useState('')

	const handleStartDateChange = (value: string) => {
		setStartDate(value)

		if (endDate && value && new Date(endDate) < new Date(value)) {
			setEndDate('')
			setDateError('')
		}
	}

	const handleEndDateChange = (value: string) => {
		setEndDate(value)
		if (dateError) {
			setDateError('')
		}
	}

	const validateDateRange = (startDateValue: string, endDateValue: string): boolean => {
		if (startDateValue && endDateValue && new Date(endDateValue) < new Date(startDateValue)) {
			setDateError('End date cannot be before start date')
			return false
		}

		setDateError('')
		return true
	}

	const reset = () => {
		setStartDate('')
		setEndDate('')
		setDateError('')
	}

	return {
		startDate,
		endDate,
		dateError,
		handleStartDateChange,
		handleEndDateChange,
		validateDateRange,
		reset
	}
}
