"use client";

import { motion } from "framer-motion";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListFilter } from "lucide-react";

interface ActivityChartProps {
    data: { _id: string; count: number }[];
}

export function ActivityChart({ data }: ActivityChartProps) {
    // Generate last 7 days including today
    const chartData = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().split("T")[0];
        const match = data.find((item) => item._id === dateStr);

        return {
            name: d.toLocaleDateString("en-US", { weekday: "short" }),
            fullDate: dateStr,
            count: match ? match.count : 0,
        };
    });

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
        >
            <Card className="border-white/20 backdrop-blur-md bg-white/50 shadow-sm relative overflow-hidden">
                <CardHeader>
                    <CardTitle className="text-base font-semibold text-gray-900">
                        Cleanup Activity
                    </CardTitle>
                    <p className="text-xs text-gray-500">Messages moved in the last 7 days</p>
                </CardHeader>
                <CardContent>
                    {data.length === 0 ? (
                        <div className="h-[240px] flex flex-col items-center justify-center text-gray-400 space-y-2">
                            <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center">
                                <ListFilter className="h-5 w-5 text-gray-300" />
                            </div>
                            <p className="text-sm">No activity recorded for this period</p>
                        </div>
                    ) : (
                        <div className="h-[240px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#818cf8" stopOpacity={0.8} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: "#f1f5f9" }}
                                        contentStyle={{
                                            borderRadius: "8px",
                                            border: "none",
                                            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
                                        }}
                                    />
                                    <Bar
                                        dataKey="count"
                                        fill="url(#barGradient)"
                                        radius={[4, 4, 0, 0]}
                                        barSize={32}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
