'use client';

import React from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { WeeklyPoint } from '@/lib/types';

interface WeeklyScorecardChartsProps {
    data: WeeklyPoint[];
}

interface TooltipPayloadItem {
    name?: string;
    value?: number | string;
    color?: string;
}

interface CustomTooltipProps {
    active?: boolean;
    label?: string;
    payload?: TooltipPayloadItem[];
    suffix?: string;
}

function CustomTooltip({
    active,
    label,
    payload,
    suffix = '',
}: CustomTooltipProps) {
    if (!active || !payload || payload.length === 0) return null;

    return (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
            <div className="mb-1 font-bold text-slate-900">Week of {label}</div>
            <div className="space-y-1">
                {payload.map((entry, idx) => (
                    <div key={`${entry.name}-${idx}`} className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-slate-600">
                            <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            {entry.name}
                        </span>
                        <span className="font-semibold text-slate-900">
                            {entry.value}
                            {suffix}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function WeeklyScorecardCharts({ data }: WeeklyScorecardChartsProps) {
    return (
        <div className="grid gap-4 lg:grid-cols-2">
            {/* Chart A: Weekly Open Backlog Trend */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="mb-4">
                    <h2 className="text-sm font-bold text-slate-900">
                        End-of-Week Open Backlog (Escalated vs. L1 Only)
                    </h2>
                    <p className="text-xs text-slate-500">
                        70.8% of current open backlog sits in the escalation loop · Dashed line = 4-week target (≤30)
                    </p>
                </div>

                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 10, right: 12, left: -16, bottom: 4 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis
                                dataKey="weekLabel"
                                tick={{ fontSize: 11, fill: '#64748b' }}
                                tickLine={false}
                                axisLine={{ stroke: '#cbd5e1' }}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: '#64748b' }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip content={<CustomTooltip suffix=" open" />} />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <ReferenceLine
                                y={30}
                                stroke="#16a34a"
                                strokeDasharray="5 5"
                                strokeWidth={1.5}
                                label={{
                                    value: 'Target ≤ 30',
                                    position: 'insideTopRight',
                                    fill: '#15803d',
                                    fontSize: 11,
                                    fontWeight: 600,
                                }}
                            />
                            <Bar
                                dataKey="eowOpenEscalated"
                                name="Escalated to Eng"
                                stackId="backlog"
                                fill="#e11d48"
                                radius={[0, 0, 0, 0]}
                            />
                            <Bar
                                dataKey="eowOpenL1"
                                name="L1 Only"
                                stackId="backlog"
                                fill="#94a3b8"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Chart B: Escalation Quality & Ping-Pong Trend */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="mb-4">
                    <h2 className="text-sm font-bold text-slate-900">
                        Escalation Quality: Avoidable Rate vs. Ping-Pong (2+ Handoffs)
                    </h2>
                    <p className="text-xs text-slate-500">
                        Weekly cohort % of escalations · Dashed line = 4-week target (&lt;20%)
                    </p>
                </div>

                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={data}
                            margin={{ top: 10, right: 12, left: -12, bottom: 4 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis
                                dataKey="weekLabel"
                                tick={{ fontSize: 11, fill: '#64748b' }}
                                tickLine={false}
                                axisLine={{ stroke: '#cbd5e1' }}
                            />
                            <YAxis
                                domain={[0, 80]}
                                unit="%"
                                tick={{ fontSize: 11, fill: '#64748b' }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip content={<CustomTooltip suffix="%" />} />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <ReferenceLine
                                y={20}
                                stroke="#16a34a"
                                strokeDasharray="5 5"
                                strokeWidth={1.5}
                                label={{
                                    value: 'Target < 20%',
                                    position: 'insideTopRight',
                                    fill: '#15803d',
                                    fontSize: 11,
                                    fontWeight: 600,
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="avoidableEscPct"
                                name="Avoidable Escalations"
                                stroke="#d97706"
                                strokeWidth={2.5}
                                dot={{ r: 3 }}
                                activeDot={{ r: 5 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="pingPongPct"
                                name="Ping-Pong (≥2 Handoffs)"
                                stroke="#e11d48"
                                strokeWidth={2.5}
                                dot={{ r: 3 }}
                                activeDot={{ r: 5 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}