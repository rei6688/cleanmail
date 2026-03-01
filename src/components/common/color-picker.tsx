"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Tag } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { COLOR_PRESETS, getColor } from "@/lib/colors"

interface ColorPickerProps {
    value: string
    onChange: (value: string) => void
    label?: string
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
    const [open, setOpen] = React.useState(false)
    const selectedColor = getColor(value)

    return (
        <div className="flex flex-col gap-2">
            {label && <label className="text-sm font-medium">{label}</label>}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                    >
                        <div className="flex items-center gap-2 overflow-hidden">
                            <Tag className={cn("h-4 w-4 shrink-0", selectedColor.icon)} />
                            <span className="truncate">{selectedColor.label}</span>
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-0" align="start">
                    <Command className="h-[300px]">
                        <CommandInput placeholder="Search for a color..." />
                        <CommandList className="max-h-[250px] overflow-y-auto custom-scrollbar">
                            <CommandEmpty>No color found.</CommandEmpty>
                            <CommandGroup>
                                {COLOR_PRESETS.map((color) => (
                                    <CommandItem
                                        key={color.value}
                                        value={color.label} // For search
                                        onSelect={() => {
                                            onChange(color.value)
                                            setOpen(false)
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-2">
                                                <Tag className={cn("h-4 w-4", color.icon)} />
                                                <span>{color.label}</span>
                                            </div>
                                            <Check
                                                className={cn(
                                                    "h-4 w-4",
                                                    value === color.value ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    )
}
