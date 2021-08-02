import axios from 'axios';
import { toK, toNiceDate, toNiceDateYear, formattedNum, getTimeframe } from '../../utils'
import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { useAllTokenData } from '../../contexts/TokenData'
import { TYPE } from '../../Theme'


const ChainsChart = () => {
    let allTokens = useAllTokenData();

    const allChains = Object.values(allTokens).map((chain) => {
        return chain.chain
    });

    const getUnique = arr => {
        return arr.filter((value, index, self) => {
            return self.indexOf(value) === index;
        });
    };

    const chainsUnique = getUnique(allChains);

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    axios.defaults.baseURL = 'https://api.llama.fi/charts/';

    const chainsCalls = chainsUnique.map(elem => { return axios.get(elem) })

    useEffect(() => {
        Promise.all(chainsCalls).
            then(resp => {

                const a = []
                resp.map(elem => {
                    a.push(elem.data)
                });
                setData([...data, a])
            }).catch((err) => {
                console.log(err)
            }).
            finally(() => {
                setLoading(false);
            });
    }, []);


    if (loading) {
        return <p>Data is loading...</p>;
    }

    data[0].forEach(arr => {
        arr.forEach(elem => {
            elem.date = new Date(Number(elem.date) * 1000).toLocaleDateString('en-us', {year:"numeric", month:"short", day:"numeric"})
        })
    })
    
    function getRandomColor() {
        var letters = '0123456789ABCDEF';
        var color = '#';
        for (var i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    //create a list for datasets for multiline chart 
    const getDatasets = (data, chains) => {
        const datasets = []
        var i = 0;
        chains.forEach(element => {
            const clr = getRandomColor()
            const dataset = {
                label: element,
                data: data[0][i],
                borderColor: clr,
                backgroundColor: clr,
                fill: true,
            };
            i++;
            datasets.push(dataset);
        });
        return datasets;
    }

    return (
        <div>
            <Line
                data={{
                    datasets: getDatasets(data, chainsUnique)
                }}
                width={400}
                height={600}
                options={
                    {
                        maintainAspectRatio: false,
                        parsing: {
                            xAxisKey: 'date',
                            yAxisKey: 'totalLiquidityUSD'
                        },
                        plugins: {
                            legend: {
                                labels: {
                                    // This more specific font property overrides the global property
                                    font: {
                                        size: 14,
                                    },
                                    color: '#ffffff'
                                }
                            }
                        },
                        scales: {
                            y: {
                                stacked: true,
                                title: {
                                    display: true,
                                    text: 'USD'
                                }
                            },
                        },
                        interaction: {
                            mode: 'nearest',
                            axis: 'x',
                            intersect: false
                        },
                    }
                }
            ></Line>
        </div>
    )
}

export default ChainsChart
