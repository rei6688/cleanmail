"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { getColor } from "@/lib/colors"
import { Tag, X } from "lucide-react"

interface TagBadgeProps {
    name: string
    colorValue?: string
    className?: string
    onRemove?: () => void
}

export function TagBadge({ name, colorValue, className, onRemove }: TagBadgeProps) {
    const color = getColor(colorValue || "preset0")

    return (
        <Badge
            className={cn(
                "gap-1.5 px-2 py-0.5 border-none shadow-sm font-medium transition-all hover:scale-105",
                color.bg,
                color.text,
                className
            )}
        >
            <Tag className="h-3 w-3 shrink-0" fill="currentColor" strokeWidth={3} />
            <span className="truncate max-w-[120px]">{name}</span>
            {onRemove && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        onRemove()
                    }}
                    className="ml-1 rounded-full p-0.5 hover:bg-black/10 transition-colors"
                >
                    <X className="h-3 w-3" strokeWidth={3} />
                </button>
            )}
        </Badge>
    )
}
