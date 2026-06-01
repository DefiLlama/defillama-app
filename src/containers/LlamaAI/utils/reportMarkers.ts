export const REPORT_START_MARKER = '[REPORT_START]'

export function stripBeforeReportStart(content: string) {
	const reportIdx = content.indexOf(REPORT_START_MARKER)
	if (reportIdx === -1) return content
	return content.slice(reportIdx + REPORT_START_MARKER.length).trimStart()
}

export function removeReportStartMarkers(content: string) {
	return content.replaceAll(`${REPORT_START_MARKER}\n`, '').replaceAll(REPORT_START_MARKER, '')
}
