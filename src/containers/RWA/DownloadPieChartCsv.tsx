import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'

type PieDatum = { name: string; value: number }

export function DownloadPieChartCsv({
	filename,
	chartData,
	smol = true,
	className
}: {
	filename: string
	chartData: PieDatum[]
	smol?: boolean
	className?: string
}) {
	return (
		<CSVDownloadButton
			className={className}
			smol={smol}
			prepareCsv={() => {
				const rows: Array<Array<string | number | boolean>> = [['Segment', 'Value', 'Percent']]
				const total = chartData.reduce((acc, d) => acc + (Number.isFinite(d.value) ? d.value : 0), 0)

				for (const d of chartData) {
					const value = Number.isFinite(d.value) ? d.value : 0
					const pct = total > 0 ? (value / total) * 100 : 0
					rows.push([d.name ?? '', value, pct])
				}

				return { filename, rows }
			}}
		/>
	)
}
