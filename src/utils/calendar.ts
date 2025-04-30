import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { slug } from '~/utils'

dayjs.extend(utc)

interface UnlockEvent {
	timestamp: number
	name: string
	description: string
	symbol: string
	noOfTokens: number[]
}

export function formatGoogleCalendarDates(timestamp: number) {
	const start = dayjs.unix(timestamp).utc()
	const end = start.add(1, 'hour')
	return `${start.format('YYYYMMDD[T]HHmmss[Z]')}/${end.format('YYYYMMDD[T]HHmmss[Z]')}`
}

export function generateGoogleCalendarUrl(event: UnlockEvent, tokenName: string, tokenValue: number) {
	const params = {
		text: `${tokenName} Unlock`,
		dates: formatGoogleCalendarDates(event.timestamp),
		details: `${tokenName} will unlock on this date. \nAmount: ${tokenValue}\nCheck details here: https://defillama.com/unlocks/${slug(
			tokenName
		)}
		\nDo note that the unlock time depends on protocols vesting schedule and are just estimate.`,
		location: `https://defillama.com/unlocks/${slug(tokenName.toLowerCase())}`
	}
	return `https://calendar.google.com/calendar/render?action=TEMPLATE&${new URLSearchParams(params)}`
}

export function generateICSContent(event: UnlockEvent, tokenName: string, tokenValue: number) {
	const start = dayjs.unix(event.timestamp).utc()
	const end = start.add(1, 'day')

	return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//DeFiLlama Unlocks//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
DTSTAMP:${dayjs().utc().format('YYYYMMDD[T]HHmmss[Z]')}
DTSTART;VALUE=DATE:${start.format('YYYYMMDD')}
DTEND;VALUE=DATE:${end.format('YYYYMMDD')}
SUMMARY:${tokenName} Token Unlock
DESCRIPTION:${tokenName} Token will unlock on this date. Amount: ${tokenValue}\\nCheck details here: https://defillama.com/unlocks/${slug(
		tokenName
	)}\\nDo note that the unlock time depends on protocols vesting schedule and are just estimate.
URL;VALUE=URI:https://defillama.com/unlocks/${slug(tokenName)}
LOCATION:https://defillama.com/unlocks/${slug(tokenName)}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-P1D
ACTION:DISPLAY
DESCRIPTION:Reminder: ${tokenName} Token Unlock in 24 hours
END:VALARM
END:VEVENT
END:VCALENDAR`
}

export function downloadICSFile(event: UnlockEvent, tokenName: string, tokenValue: number) {
	const content = generateICSContent(event, tokenName, tokenValue)
	const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
	const link = document.createElement('a')
	link.href = window.URL.createObjectURL(blob)
	link.download = `${slug(tokenName)}-unlock-${dayjs.unix(event.timestamp).format('YYYYMMDD')}.ics`
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
}
