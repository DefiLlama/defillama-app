import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';

const ChainsChart = (props) => {
    return (
        <div>
            <Line
                data={{
                    datasets: props.datasets
                }}
                width={400}
                height={600}
                options={
                    {
                        maintainAspectRatio: false,
                        parsing: {
                            xAxisKey: props.xAxisKey,
                            yAxisKey: props.yAxisKey
                        },
                        plugins: {
                            legend: {
                                labels: {
                                    // This more specific font property overrides the global property
                                    font: {
                                        size: 12,
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
