import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'

interface DateRangeValidationOptions {
	initialStartDate?: string
	initialEndDate?: string
	allowFutureDates?: boolean
}

export const useDateRangeValidation = (options?: DateRangeValidationOptions) => {
	const [startDate, setStartDate] = useState(options?.initialStartDate || '')
	const [endDate, setEndDate] = useState(options?.initialEndDate || '')
	const [dateError, setDateError] = useState('')

	const handleStartDateChange = useCallback((value: string) => {
		setDateError('')
		setStartDate(value)
		setEndDate((currentEndDate) => {
			if (currentEndDate && value && new Date(currentEndDate) < new Date(value)) {
				return ''
			}
			return currentEndDate
		})
	}, [])

	const handleEndDateChange = useCallback((value: string) => {
		setDateError('')
		setEndDate(value)
	}, [])

	const validateDateRange = (startDateValue: string, endDateValue: string): boolean => {
		if (!startDateValue || !endDateValue) {
			const errorMsg = 'Both start and end dates are required'
			setDateError(errorMsg)
			toast.error(errorMsg)
			return false
		}

		const start = new Date(startDateValue)
		const end = new Date(endDateValue)
		const today = new Date()

		if (end < start) {
			const errorMsg = 'End date cannot be before start date'
			setDateError(errorMsg)
			toast.error(errorMsg)
			return false
		}

		if (!options?.allowFutureDates) {
			if (start > today) {
				const errorMsg = 'Start date cannot be in the future'
				setDateError(errorMsg)
				toast.error(errorMsg)
				return false
			}

			if (end > today) {
				const errorMsg = 'End date cannot be in the future'
				setDateError(errorMsg)
				toast.error(errorMsg)
				return false
			}
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
