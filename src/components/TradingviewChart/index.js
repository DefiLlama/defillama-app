import { useState, useEffect, useRef, useMemo } from 'react'
import Image from 'next/future/image'
import { createChart } from 'lightweight-charts'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import styled from 'styled-components'
import { RefreshCw } from 'react-feather'
import { IconWrapper } from '~/components'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { formattedNum } from '~/utils'
import logoLight from '~/public/defillama-press-kit/defi/PNG/defillama-light-neutral.png'
import logoDark from '~/public/defillama-press-kit/defi/PNG/defillama-dark-neutral.png'

dayjs.extend(utc)

// adjust the scale based on the type of chart
const topScale = 0.32

const Wrapper = styled.div`
	position: relative;
`

// constant height for charts
const HEIGHT = 300

const TradingViewChart = ({
	data = [],
	base,
	baseChange,
	field,
	title,
	width,
	units = '$',
	useWeekly = false,
	dualAxis = false
}) => {
	const [isDark] = useDarkModeManager()

	// reference for DOM element to create with chart
	const ref = useRef()

	// pointer to the chart object
	const [chartCreated, setChartCreated] = useState(false)

	// parese the data and format for tardingview consumption
	const formattedData = useMemo(() => {
		return data.map((entry) => {
			return {
				time: dayjs.unix(entry[0]).utc().format('YYYY-MM-DD'),
				value: parseFloat(entry[field])
			}
		})
	}, [data, field])

	// only used if dualAxis=true
	const formattedData2 = useMemo(() => {
		return data.map((entry) => {
			return {
				time: dayjs.unix(entry[0]).utc().format('YYYY-MM-DD'),
				value: parseFloat(entry[Number(field) + 1])
			}
		})
	}, [data, field])

	const [darkMode] = useDarkModeManager()

	useEffect(() => {
		const textColor = darkMode ? 'white' : 'black'
		const crossHairColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(32, 38, 46, 0.1)'

		const chartParams = {
			width: width,
			height: HEIGHT,
			layout: {
				backgroundColor: 'transparent',
				textColor: textColor
			},
			rightPriceScale: {
				scaleMargins: {
					top: topScale,
					bottom: 0
				},
				borderVisible: false
			},
			timeScale: {
				borderVisible: false
			},
			grid: {
				horzLines: {
					color: 'rgba(197, 203, 206, 0.5)',
					visible: false
				},
				vertLines: {
					color: 'rgba(197, 203, 206, 0.5)',
					visible: false
				}
			},
			crosshair: {
				horzLine: {
					visible: false,
					labelVisible: false
				},
				vertLine: {
					visible: true,
					style: 0,
					width: 2,
					color: crossHairColor,
					labelVisible: false
				}
			},
			localization: {
				priceFormatter: (val) => formattedNum(val, units)
			}
		}

		// adding the left scale for the dualaxis chart
		if (dualAxis) {
			chartParams['leftPriceScale'] = {
				scaleMargins: {
					top: topScale,
					bottom: 0
				},
				borderVisible: false,
				visible: true
			}
			// overwrite localization (with symbol defaulting to false)
			// this is not ideal, but I've not found a simple way of getting 2 separate axis
			// symbols (% and $) unless I use some logic (which might break)
			// [like: number < 1e5 ? number + '%' : number + '$']. would be too restrictive as some pools
			// can have higher apys. so for now i swith off labels alltogether
			chartParams['localization'] = {
				priceFormatter: (val) => formattedNum(val)
			}
		}

		const chart = createChart(ref.current, chartParams)

		const series = chart.addAreaSeries({
			topColor: '#394990',
			bottomColor: 'rgba(112, 82, 64, 0)',
			lineColor: '#394990',
			lineWidth: 3
		})

		series.setData(formattedData)

		let series2
		if (dualAxis) {
			series2 = chart.addAreaSeries({
				topColor: '#913662',
				bottomColor: 'rgba(112, 82, 64, 0)',
				lineColor: '#913662',
				lineWidth: 2,
				priceScaleId: 'left'
			})

			series2.setData(formattedData2)
		}

		const prevTooltip = document.getElementById('tooltip-id' + 'area')
		const node = document.getElementById('test-id' + 'area')

		if (prevTooltip && node) {
			node.removeChild(prevTooltip)
		}

		const toolTip = document.createElement('div')
		toolTip.setAttribute('id', 'tooltip-id' + 'area')
		toolTip.className = darkMode ? 'three-line-legend-dark' : 'three-line-legend'

		ref.current.appendChild(toolTip)

		toolTip.style.display = 'block'
		toolTip.style.fontWeight = '500'
		toolTip.style.left = dualAxis ? 55 + 'px' : -4 + 'px'
		toolTip.style.top = '-' + 8 + 'px'
		toolTip.style.backgroundColor = 'transparent'
		toolTip.style.zIndex = 0

		// format numbers
		let percentChange = baseChange?.toFixed(2)
		let formattedPercentChange = (percentChange > 0 && !dualAxis ? '+' : '') + percentChange + '%'
		let color = percentChange >= 0 ? '#3fb950' : '#f85149'

		// get the title of the chart
		function setLastBarText() {
			toolTip.innerHTML =
				`<div style="font-size: 16px; margin: 4px 0px; color: ${textColor};">${title}</div>` +
				`<div style="font-size: 22px; margin: 4px 0px; color:${textColor}" >` +
				formattedNum(base ?? 0, units) +
				(baseChange
					? `<span style="margin-left: 10px; font-size: 16px; color: ${
							dualAxis === true ? textColor : color
					  };">${formattedPercentChange}</span>`
					: '') +
				'</div>'
		}

		function setLastBarTextYieldVersion() {
			toolTip.innerHTML =
				`<div style="font-size: 16px; margin: 4px 0px; color: ${textColor};">${title}</div>` +
				`<div style="font-size: 22px; margin: 4px 0px; color:${textColor}" >` +
				formattedPercentChange +
				(baseChange
					? `<span style="margin-left: 10px; font-size: 16px; color: ${
							dualAxis === true ? textColor : color
					  };">${formattedNum(base ?? 0, units)}</span>`
					: '') +
				'</div>'
		}

		if (!dualAxis) {
			setLastBarText()
		} else {
			setLastBarTextYieldVersion()
		}

		// update the title when hovering on the chart
		chart.subscribeCrosshairMove(function (param) {
			if (
				param === undefined ||
				param.time === undefined ||
				param.point.x < 0 ||
				param.point.x > width ||
				param.point.y < 0 ||
				param.point.y > HEIGHT
			) {
				if (!dualAxis) {
					setLastBarText()
				} else {
					setLastBarTextYieldVersion()
				}
			} else {
				let dateStr = useWeekly
					? dayjs(param.time.year + '-' + param.time.month + '-' + param.time.day)
							.startOf('week')
							.format('MMMM D, YYYY') +
					  '-' +
					  dayjs(param.time.year + '-' + param.time.month + '-' + param.time.day)
							.endOf('week')
							.format('MMMM D, YYYY')
					: dayjs(param.time.year + '-' + param.time.month + '-' + param.time.day).format('MMMM D, YYYY')

				const price = param.seriesPrices.get(series)

				toolTip.innerHTML = !dualAxis
					? `<div style="font-size: 16px; margin: 4px 0px; color: ${textColor};">${title}</div>` +
					  `<div style="font-size: 22px; margin: 4px 0px; color: ${textColor}">` +
					  formattedNum(price, units) +
					  '</div>' +
					  '<div>' +
					  dateStr +
					  '</div>'
					: `<div style="font-size: 16px; margin: 4px 0px; color: ${textColor};">${title}</div>` +
					  `<div style="font-size: 22px; margin: 4px 0px; color: ${textColor}">` +
					  `${param.seriesPrices.get(series2).toFixed(2)}%` +
					  `<span style="margin-left: 10px; font-size: 16px; color: ${textColor};">${formattedNum(
							price,
							units
					  )}</span>` +
					  '</div>' +
					  '<div>' +
					  dateStr +
					  '</div>'
			}
		})

		chart.timeScale().fitContent()

		setChartCreated(chart)

		return () => {
			setChartCreated(false)
			chart.remove()
		}
	}, [base, baseChange, title, useWeekly, width, units, formattedData, formattedData2, darkMode, dualAxis])

	return (
		<Wrapper>
			<div ref={ref} id={'test-id' + 'area'} />
			<IconWrapper>
				<RefreshCw
					onClick={() => {
						chartCreated && chartCreated.timeScale().fitContent()
					}}
				/>
			</IconWrapper>
			<Watermark>
				<Image src={isDark ? logoLight : logoDark} height={40} alt="" />
			</Watermark>
		</Wrapper>
	)
}

const Watermark = styled.div`
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: -10;
	opacity: 0.3;
`

export default TradingViewChart
