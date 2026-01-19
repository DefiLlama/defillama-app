import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'

interface DateRangeValidationOptions {
	initialStartDate?: string
	initialEndDate?: string
}

export const useDateRangeValidation = (options?: DateRangeValidationOptions) => {
	const [startDate, setStartDate] = useState(options?.initialStartDate || '')
	const [endDate, setEndDate] = useState(options?.initialEndDate || '')
	const [dateError, _setDateError] = useState('')

	const handleStartDateChange = useCallback((value: string) => {
		setStartDate(value)
		setEndDate((currentEndDate) => {
			if (currentEndDate && value && new Date(currentEndDate) < new Date(value)) {
				return ''
			}
			return currentEndDate
		})
	}, [])

	const handleEndDateChange = useCallback((value: string) => {
		setEndDate(value)
	}, [])

	const validateDateRange = (startDateValue: string, endDateValue: string): boolean => {
		if (startDateValue && endDateValue && new Date(endDateValue) < new Date(startDateValue)) {
			toast.error('End date cannot be before start date')
			return false
		}

		return true
	}

	const reset = () => {
		setStartDate('')
		setEndDate('')
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
