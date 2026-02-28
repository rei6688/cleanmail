export const COLOR_PRESETS = [
    { value: "preset0", label: "Red category", bg: "bg-red-500", icon: "text-red-500", text: "text-white" },
    { value: "preset1", label: "Orange category", bg: "bg-orange-500", icon: "text-orange-500", text: "text-white" },
    { value: "preset2", label: "Peach category", bg: "bg-orange-300", icon: "text-orange-300", text: "text-black" },
    { value: "preset3", label: "Yellow category", bg: "bg-yellow-400", icon: "text-yellow-400", text: "text-black" },
    { value: "preset4", label: "Green category", bg: "bg-green-500", icon: "text-green-500", text: "text-white" },
    { value: "preset5", label: "Teal category", bg: "bg-teal-500", icon: "text-teal-500", text: "text-white" },
    { value: "preset6", label: "Olive category", bg: "bg-lime-600", icon: "text-lime-600", text: "text-white" },
    { value: "preset7", label: "Blue category", bg: "bg-blue-500", icon: "text-blue-500", text: "text-white" },
    { value: "preset8", label: "Purple category", bg: "bg-purple-500", icon: "text-purple-500", text: "text-white" },
    { value: "preset9", label: "Maroon category", bg: "bg-fuchsia-600", icon: "text-fuchsia-600", text: "text-white" },
    { value: "preset10", label: "Steel category", bg: "bg-slate-400", icon: "text-slate-400", text: "text-white" },
    { value: "preset11", label: "Dark Steel category", bg: "bg-slate-600", icon: "text-slate-600", text: "text-white" },
    { value: "preset12", label: "Gray category", bg: "bg-gray-400", icon: "text-gray-400", text: "text-white" },
    { value: "preset13", label: "Dark Gray category", bg: "bg-gray-600", icon: "text-gray-600", text: "text-white" },
    { value: "preset14", label: "Black category", bg: "bg-gray-900", icon: "text-gray-900", text: "text-white" },
    { value: "preset15", label: "Dark Red category", bg: "bg-red-700", icon: "text-red-700", text: "text-white" },
    { value: "preset16", label: "Dark Orange category", bg: "bg-orange-700", icon: "text-orange-700", text: "text-white" },
    { value: "preset17", label: "Dark Peach category", bg: "bg-orange-400", icon: "text-orange-400", text: "text-white" },
    { value: "preset18", label: "Dark Yellow category", bg: "bg-yellow-600", icon: "text-yellow-600", text: "text-white" },
    { value: "preset19", label: "Dark Green category", bg: "bg-green-700", icon: "text-green-700", text: "text-white" },
    { value: "preset20", label: "Dark Teal category", bg: "bg-teal-700", icon: "text-teal-700", text: "text-white" },
    { value: "preset21", label: "Dark Olive category", bg: "bg-lime-800", icon: "text-lime-800", text: "text-white" },
    { value: "preset22", label: "Dark Blue category", bg: "bg-blue-800", icon: "text-blue-800", text: "text-white" },
    { value: "preset23", label: "Dark Purple category", bg: "bg-purple-800", icon: "text-purple-800", text: "text-white" },
    { value: "preset24", label: "Dark Maroon category", bg: "bg-fuchsia-800", icon: "text-fuchsia-800", text: "text-white" },
] as const;

export type ColorValue = typeof COLOR_PRESETS[number]["value"];

export function getColor(value: string) {
    return COLOR_PRESETS.find((p) => p.value === value) || COLOR_PRESETS[0];
}
