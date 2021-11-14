import React, { useEffect, useState, useMemo } from 'react'

import { TYPE } from '../Theme'
import Panel from '../components/Panel'
import { useAllTokenData } from '../contexts/TokenData'
import { PageWrapper, FullWrapper } from '../components'
import { AutoRow, RowBetween } from '../components/Row'
import LocalLoader from '../components/LocalLoader'
import { chainIconUrl } from '../utils'
import List from '../components/List'
import { toK, toNiceCsvDate, toNiceDateYear, formattedNum, toNiceMonthlyDate } from '../utils'
import { ButtonDark } from '../components/ButtonStyled'
import { useMedia } from 'react-use'
import { chainCoingeckoIds } from '../constants/chainTokens'


import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    ResponsiveContainer,
    Tooltip
} from "recharts";
import { AutoColumn } from '../components/Column'

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function getPercentChange(previous, current) {
    return (current / previous) * 100 - 100;
}

const toPercent = (decimal, fixed = 0) =>
    `${(decimal * 100).toFixed(fixed)}%`;

const getPercent = (value, total) => {
    const ratio = total > 0 ? value / total : 0;

    return toPercent(ratio, 2);
};

function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

const StackedChart = ({ stackOffset, yFormatter, formatPercent, stackedDataset, chainsUnique, chainColor, daySum, isMobile }) => <Panel
    style={{ height: '100%', margin: '0.5em' }}>
    <ResponsiveContainer aspect={isMobile ? 60 / 44 : 60 / 36}>
        <AreaChart
            data={stackedDataset}
            stackOffset={stackOffset}
            margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0
            }}
        >
            <XAxis dataKey="date"
                tickFormatter={toNiceMonthlyDate}
            />
            <YAxis
                tickFormatter={tick => yFormatter(tick)}
            />
            <Tooltip
                formatter={(val, chain, props) => formatPercent ? getPercent(val, daySum[props.payload.date]) : formattedNum(val)}
                labelFormatter={label => toNiceDateYear(label)}
                itemSorter={p => -p.value}
            />
            {chainsUnique.map(chainName => <Area
                type="monotone"
                dataKey={chainName}
                key={chainName}
                stackId="1"
                fill={chainColor[chainName]}
                stroke={chainColor[chainName]}
            />
            )}
        </AreaChart>
    </ResponsiveContainer>
</Panel>

const ChainsView = () => {
    let allTokens = useAllTokenData();
    const below800 = useMedia('(max-width: 800px)')
    const isMobile = useMedia('(max-width: 40em)')

    const chainsUniqueSet = new Set();
    const numProtocolsPerChain = {}
    Object.values(allTokens).forEach((token) => {
        if (token.category === "Chain") return
        token.chains.forEach(chain => {
            chainsUniqueSet.add(chain)
            numProtocolsPerChain[chain] = (numProtocolsPerChain[chain] || 0) + 1
        })
    });
    const chainsUnique = Array.from(chainsUniqueSet)

    const [data, setData] = useState([]);
    const [chainMcaps, setChainMcaps] = useState({});
    const loading = data.length === 0;

    useEffect(() => {
        const chainsCalls = chainsUnique.map(elem => fetch(`https://api.llama.fi/lite/charts/${elem}`).then(resp => resp.json()))
        Promise.all(chainsCalls)
            .then(resp => {
                setData(resp)
            }).catch((err) => {
                console.log(err)
            })
        fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${Object.values(chainCoingeckoIds).map(v => v.geckoId).join(',')}&vs_currencies=usd&include_market_cap=true`).then(res => res.json()).then(setChainMcaps)
    }, []);

    const chainColor = useMemo(() => Object.fromEntries(chainsUnique.map(chain => [chain, getRandomColor()])), [chainsUnique])
    const chainTvls = useMemo(() => (data.length > 0 ? chainsUnique : []).map((chainName, i) => {
        const prevTvl = (daysBefore) => data[i][data[i].length - 1 - daysBefore]?.totalLiquidityUSD
        const current = prevTvl(0)
        return {
            tvl: current,
            mcap: chainMcaps[chainCoingeckoIds[chainName]?.geckoId]?.usd_market_cap,
            name: chainName,
            num_protocols: numProtocolsPerChain[chainName],
            logo: chainIconUrl(chainName),
            change_1d: prevTvl(1) ? getPercentChange(prevTvl(1), current) : null,
            change_7d: prevTvl(7) ? getPercentChange(prevTvl(7), current) : null,
        }
    }), [data, numProtocolsPerChain, chainMcaps, chainsUnique])

    //const defaultPoint = Object.fromEntries(chainsUnique.map(chain => [chain, undefined]))
    const [stackedDataset, daySum] = useMemo(() => {
        const daySum = {};
        const stacked = Object.values(data.reduce((total, chain, i) => {
            const chainName = chainsUnique[i]
            chain.forEach(dayTvl => {
                if (dayTvl.date < 1596248105) return
                if (total[dayTvl.date] === undefined) {
                    total[dayTvl.date] = { date: dayTvl.date }
                }
                total[dayTvl.date][chainName] = dayTvl.totalLiquidityUSD
                daySum[dayTvl.date] = (daySum[dayTvl.date] || 0) + dayTvl.totalLiquidityUSD
            })
            return total
        }, {}))
        return [stacked, daySum]
    }, [data])

    function downloadCsv() {
        const rows = [["Timestamp", "Date", ...chainsUnique]];
        stackedDataset.sort((a, b) => a.date - b.date).forEach(day => {
            rows.push([day.date, toNiceCsvDate(day.date), ...chainsUnique.map(chain => day[chain] ?? '')])
        })
        download("chains.csv", rows.map(r => r.join(',')).join('\n'))
    }

    if (loading) {
        return <LocalLoader fill="true" />
    }

    const stackedChart = <StackedChart
        yFormatter={toK}
        formatPercent={false}
        stackedDataset={stackedDataset}
        chainsUnique={chainsUnique}
        chainColor={chainColor}
        isMobile={isMobile}
    />
    const dominanceChart = <StackedChart
        stackOffset="expand"
        yFormatter={toPercent}
        formatPercent={true}
        stackedDataset={stackedDataset}
        chainsUnique={chainsUnique}
        chainColor={chainColor}
        daySum={daySum}
        isMobile={isMobile}
    />
    return (
        <PageWrapper>
            <FullWrapper>
                <RowBetween>
                    <TYPE.largeHeader>Total Value Locked All Chains</TYPE.largeHeader>
                </RowBetween>
                {below800 ? <AutoColumn>
                    {stackedChart}
                    {dominanceChart}
                </AutoColumn> :
                    <AutoRow>
                        {stackedChart}
                        {dominanceChart}
                    </AutoRow>
                }
                <List tokens={chainTvls} defaultSortingField="tvl" />
                <div style={{ margin: 'auto' }}>
                    <ButtonDark onClick={downloadCsv}>Download all data in .csv</ButtonDark>
                </div>
            </FullWrapper>
        </PageWrapper >
    )
}

export default ChainsView

