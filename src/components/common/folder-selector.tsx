"use client"

import * as React from "react"
import { Check, ChevronsUpDown, FolderPlus, Search, Folder, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface FolderOption {
    label: string
    value: string
    isSub?: boolean
}

interface FolderSelectorProps {
    options: FolderOption[]
    value: string
    onChange: (value: string) => void
    placeholder?: string
}

export function FolderSelector({ options, value, onChange, placeholder }: FolderSelectorProps) {
    const [open, setOpen] = React.useState(false)
    const [searchTerm, setSearchTerm] = React.useState("")
    const [isCreatingSub, setIsCreatingSub] = React.useState(false)
    const [newSubName, setNewSubName] = React.useState("")
    const [selectedParent, setSelectedParent] = React.useState<string | null>(null)

    const selectedOption = options.find((opt) => opt.value === value)

    const handleSelect = (val: string) => {
        onChange(val)
        setOpen(false)
        setIsCreatingSub(false)
        setSelectedParent(null)
    }

    const handleCreateSub = (e: React.MouseEvent, parentValue: string) => {
        e.stopPropagation()
        setSelectedParent(parentValue)
        setIsCreatingSub(true)
        setNewSubName("")
    }

    const confirmCreateSub = () => {
        if (!selectedParent || !newSubName.trim()) return
        const fullPath = `${selectedParent}/${newSubName.trim()}`
        onChange(fullPath)
        setOpen(false)
        setIsCreatingSub(false)
        setSelectedParent(null)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <Folder className="h-4 w-4 shrink-0 opacity-50" />
                        <span className="truncate">{value || placeholder || "Chọn thư mục..."}</span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command shouldFilter={!isCreatingSub}>
                    {!isCreatingSub && (
                        <>
                            <CommandInput
                                placeholder="Tìm thư mục..."
                                value={searchTerm}
                                onValueChange={setSearchTerm}
                            />
                            <CommandList className="max-h-[300px] overflow-y-auto">
                                <CommandEmpty className="py-2 px-4 flex flex-col gap-2">
                                    <p className="text-sm text-muted-foreground">Không thấy thư mục.</p>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-fit"
                                        onClick={() => {
                                            onChange(searchTerm)
                                            setOpen(false)
                                        }}
                                    >
                                        Dùng tên này: "{searchTerm}"
                                    </Button>
                                </CommandEmpty>
                                <CommandGroup>
                                    {options.map((opt) => (
                                        <CommandItem
                                            key={opt.value}
                                            value={opt.value}
                                            onSelect={() => handleSelect(opt.value)}
                                            className="cursor-pointer group flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-2 flex-1">
                                                <Check
                                                    className={cn(
                                                        "h-4 w-4 shrink-0",
                                                        value === opt.value ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                <span className={cn(opt.isSub ? "ml-4 text-muted-foreground" : "font-medium")}>
                                                    {opt.isSub ? `↳ ${opt.label.replace("  ↳ ", "")}` : opt.label}
                                                </span>
                                            </div>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                                                onClick={(e) => handleCreateSub(e, opt.value)}
                                                title="Tạo thư mục con"
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </>
                    )}

                    {isCreatingSub && (
                        <div className="p-4 space-y-3 animate-in fade-in zoom-in duration-200">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Tạo thư mục con trong:</p>
                                <div className="flex items-center gap-2 text-sm bg-muted p-2 rounded truncate">
                                    <Folder className="h-3 w-3" />
                                    {selectedParent}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subname">Tên con:</Label>
                                <Input
                                    id="subname"
                                    autoFocus
                                    value={newSubName}
                                    onChange={(e) => setNewSubName(e.target.value)}
                                    placeholder="ví dụ: Saved, Tcb..."
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") confirmCreateSub()
                                        if (e.key === "Escape") setIsCreatingSub(false)
                                    }}
                                />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button size="sm" variant="ghost" onClick={() => setIsCreatingSub(false)}>Hủy</Button>
                                <Button size="sm" onClick={confirmCreateSub}>OK</Button>
                            </div>
                        </div>
                    )}
                </Command>
            </PopoverContent>
        </Popover>
    )
}
