"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ListFilter, CheckCircle as CircleCheckBig, Zap, ShieldCheck, Mail, ArrowRight } from "lucide-react";

const Icons = {
    ListFilter,
    CheckCircle: CircleCheckBig,
    Zap,
    ShieldCheck,
    Mail,
    ArrowRight,
};

interface StatsCardProps {
    title: string;
    value: string | number;
    description: string;
    iconName: keyof typeof Icons;
    trend?: string;
    variant?: "default" | "indigo" | "cyan" | "rose";
    delay?: number;
}

const variants = {
    default: "from-gray-50/50 to-white/50",
    indigo: "from-indigo-50/50 to-indigo-100/50",
    cyan: "from-cyan-50/50 to-cyan-100/50",
    rose: "from-rose-50/50 to-rose-100/50",
};

const iconColors = {
    default: "text-gray-600 bg-gray-100",
    indigo: "text-indigo-600 bg-indigo-100",
    cyan: "text-cyan-600 bg-cyan-100",
    rose: "text-rose-600 bg-rose-100",
};

export function StatsCard({
    title,
    value,
    description,
    iconName,
    trend,
    variant = "default",
    delay = 0,
}: StatsCardProps) {
    const Icon = Icons[iconName];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
            whileHover={{ scale: 1.02 }}
        >
            <Card className={cn(
                "relative overflow-hidden border-white/20 backdrop-blur-md bg-gradient-to-br shadow-sm transition-shadow hover:shadow-md",
                variants[variant]
            )}>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                        {title}
                    </CardTitle>
                    <div className={cn("p-2 rounded-lg", iconColors[variant])}>
                        <Icon className="h-4 w-4" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-baseline space-x-2">
                        <div className="text-3xl font-bold tracking-tight text-gray-900">
                            {value}
                        </div>
                        {trend && (
                            <span className="text-xs font-medium text-green-600">
                                {trend}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                        {description}
                    </p>
                </CardContent>
            </Card>
        </motion.div>
    );
}
