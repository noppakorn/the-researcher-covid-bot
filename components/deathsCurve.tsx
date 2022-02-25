import React, { useState, useRef, useMemo, useCallback } from 'react';
import { extent, max, bisector, min } from 'd3-array'
import _ from 'lodash'
import moment from 'moment'
import { Group } from '@visx/group'
import { Bar } from '@visx/shape'
import { localPoint } from '@visx/event'
import { scaleLinear, scaleBand, scaleTime } from '@visx/scale'
import { useTooltip, Tooltip, defaultStyles, TooltipWithBounds } from '@visx/tooltip'
import { curveBasis } from '@visx/curve'
import { LinePath } from '@visx/shape'
import { ParentSize, withParentSize } from '@visx/responsive'
import { Text } from '@visx/text'
import { movingAvg } from './vaccine/util'

function DeathsCurve(props) {
    var timeSeries = props.national_stats
    const width = props.width
    const height = props.height
    const x = useCallback(d => new Date(d['date']), [])
    const y = useCallback(d => d['new_deaths'], [])
    const calculatedTimeSeries = useMemo(
      () => {
        const { moving_aves: avgs, timeSeries: innerTimeSeries } = movingAvg([...timeSeries], 'new_deaths', 'rate')
        avgs.forEach((avg, i) => {
          innerTimeSeries[i]['movingAvg'] = avg
        })
        return innerTimeSeries
      },
      [timeSeries]
    )
    const xScale = useMemo(() => scaleBand({
        range: [0, width],
        domain: calculatedTimeSeries.map(x),
        padding: 0.07
    }), [width, calculatedTimeSeries, x])
    const dateScale = useMemo(() => scaleTime({
        range: [0, width],
        domain: extent(calculatedTimeSeries, x),
    }), [width, calculatedTimeSeries, x])
    const yScale = useMemo(() => scaleLinear({
        range: [height, 50],
        domain: [0, max(calculatedTimeSeries, y)],
    }), [height, calculatedTimeSeries, y])
    const {
        showTooltip,
        hideTooltip,
        tooltipOpen,
        tooltipData,
        tooltipLeft = 0,
        tooltipTop = 0,
    } = useTooltip({
        tooltipOpen: true,
        tooltipData: null,
    });
    const bisectDate = bisector(d => new Date(d['date'])).left;
    return (
        <div className='no-select' style={{ position: 'relative' }}>
            <svg width={width} height={height}>
                <Group>
                    <Text
                        y={20}
                        fill="white"
                        fontFamily="Prompt"
                        fontWeight="bold"
                    >
                        เสียชีวิต
                    </Text>
                    <Group>
                        {useMemo(() => calculatedTimeSeries.map((d, i) => {
                            const barHeight = height - yScale(y(d))
                            return (
                                <Bar
                                    key={i}
                                    x={xScale(x(d))}
                                    y={height - barHeight - 30}
                                    width={xScale.bandwidth()}
                                    height={barHeight}
                                    fill='#616161'
                                />

                            );
                        }), [calculatedTimeSeries, height, yScale, y, xScale, x])}
                    </Group>
                    <LinePath
                        curve={curveBasis}
                        data={calculatedTimeSeries}
                        x={d => xScale(x(d))}
                        y={d => yScale(d['movingAvg']) - 30}
                        stroke='#9e9e9e'
                        strokeWidth={2}
                    />

                    {tooltipData &&
                        <Bar
                            x={xScale(x(tooltipData))}
                            y={yScale(y(tooltipData)) - 30}
                            width={xScale.bandwidth()}
                            height={height - yScale(y(tooltipData))}
                            fill='#8e8e8e'
                        />
                    }
                    <Group>
                        <Bar
                            onMouseMove={(e) => {
                                const x = localPoint(e)['x']
                                if (x) {
                                    const x0 = dateScale.invert(x)
                                    const index = bisectDate(calculatedTimeSeries, x0, 1)
                                    const d = calculatedTimeSeries[index]
                                    if (d) {
                                        const barHeight = (height - yScale(y(d)) ?? 0)
                                        showTooltip({
                                            tooltipData: d,
                                            tooltipLeft: x,
                                            tooltipTop: height - barHeight - 100
                                        })
                                    }
                                }
                            }}
                            onMouseLeave={() => hideTooltip()}
                            x={10}
                            y={0}
                            width={width}
                            height={height - 30}
                            fill="transparent"
                        />
                    </Group>
                </Group>
            </svg>
            {tooltipData &&
                <TooltipWithBounds
                    top={tooltipTop}
                    left={tooltipLeft}
                    style={{
                        ...defaultStyles,
                        minWidth: 160,
                        textAlign: 'start',
                        padding: 12,
                    }}
                >
                    <span>
                        <b>{moment(tooltipData['date']).format('DD MMM')}</b><br />
                        ผู้เสียชีวิตรายวัน {tooltipData['new_deaths'].toLocaleString()} ราย
                    </span>
                </TooltipWithBounds>
            }
        </div>
    )
}


const Container = (props) => (
    <ParentSize>
        {useCallback(({ width, height }) => (
            <DeathsCurve national_stats={props.national_stats} width={width} height={width > 250 ? 200 : 150} />
        ), [])}
    </ParentSize>
)

export default Container