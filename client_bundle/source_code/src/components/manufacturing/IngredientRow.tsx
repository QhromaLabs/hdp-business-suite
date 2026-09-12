import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Check, Trash2, ChevronsUpDown } from 'lucide-react';
import { cn } from "@/lib/utils"

interface RawMaterialOption {
    id: string;
    name: string;
    unit?: string;
    type?: 'raw_material' | 'semi_finished';
    cost?: number;
}

interface IngredientRowProps {
    index: number;
    itemType: 'raw_material' | 'service' | 'overhead';
    rawMaterialId: string | null;
    name: string;
    quantity: number;
    unitCost?: number;
    options: RawMaterialOption[];
    onUpdate: (index: number, updates: {
        raw_material_id?: string | null;
        name?: string;
        quantity?: number;
        unit_cost?: number;
    }) => void;
    onRemove: (index: number) => void;
}

export function IngredientRow({
    index,
    itemType,
    rawMaterialId,
    name,
    quantity,
    unitCost,
    options,
    onUpdate,
    onRemove
}: IngredientRowProps) {
    const [open, setOpen] = useState(false);

    // Filter options based on input name provided by parent
    const filteredOptions = useMemo(() => {
        if (!name) return options;
        const lower = name.toLowerCase();
        return options.filter(m => m.name.toLowerCase().includes(lower));
    }, [options, name]);

    const handleSelect = (option: RawMaterialOption) => {
        onUpdate(index, {
            raw_material_id: option.id,
            name: option.name,
            // If it's a semi-finished good, we might want to store cost or other metadata if needed
            // But for now, we treat ID as the link.
        });
        setOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        onUpdate(index, {
            name: newValue,
            raw_material_id: null
        });
        setOpen(true);
    };

    return (
        <div className={cn(
            "flex gap-2 items-end p-3 rounded-lg border border-border/50",
            itemType === 'raw_material' ? "bg-muted/20" : "bg-blue-50/50 border-blue-100"
        )}>
            {itemType === 'raw_material' ? (
                // RAW MATERIAL SELECTOR
                <div className="flex-1 space-y-1">
                    <label className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        Component (Material or Product)
                    </label>
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <div className="relative">
                                <Input
                                    value={name}
                                    onChange={handleInputChange}
                                    onFocus={() => setOpen(true)}
                                    placeholder="Search material..."
                                    className="w-full pr-8 h-9 text-sm"
                                />
                                <ChevronsUpDown className="absolute right-2 top-2.5 h-3 w-3 opacity-50 pointer-events-none" />
                            </div>
                        </PopoverTrigger>
                        <PopoverContent
                            className="w-[300px] p-0"
                            align="start"
                            onOpenAutoFocus={(e) => e.preventDefault()}
                        >
                            <Command>
                                <CommandList>
                                    <CommandGroup>
                                        {filteredOptions.length === 0 ? (
                                            <div className="py-2 px-4 text-xs text-muted-foreground">
                                                No matches.
                                            </div>
                                        ) : (
                                            filteredOptions.map((material) => (
                                                <CommandItem
                                                    key={material.id}
                                                    value={material.name}
                                                    onSelect={() => handleSelect(material)}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            rawMaterialId === material.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    <span className="truncate flex items-center gap-2">
                                                        {material.name}
                                                        <span className="text-muted-foreground text-xs">
                                                            ({material.unit || 'units'})
                                                        </span>
                                                        {material.type === 'semi_finished' && (
                                                            <span className="bg-amber-100 text-amber-700 text-[10px] px-1 rounded border border-amber-200">
                                                                Product
                                                            </span>
                                                        )}
                                                    </span>
                                                </CommandItem>
                                            ))
                                        )}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
            ) : (
                // SERVICE / OVERHEAD INPUT
                <div className="flex-1 space-y-1">
                    <label className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", itemType === 'service' ? "bg-blue-400" : "bg-purple-400")} />
                        {itemType === 'service' ? 'Service Description' : 'Overhead Description'}
                    </label>
                    <Input
                        value={name}
                        onChange={(e) => onUpdate(index, { name: e.target.value })}
                        placeholder={itemType === 'service' ? "e.g. Sewing Labor" : "e.g. Electricity Allocation"}
                        className="h-9 text-sm"
                    />
                </div>
            )}

            {/* COST INPUT (Only for non-materials) */}
            {itemType !== 'raw_material' && (
                <div className="w-28 space-y-1">
                    <label className="text-xs text-muted-foreground">Unit Cost</label>
                    <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-9 text-right font-mono text-sm"
                        value={unitCost || ''}
                        onChange={(e) => onUpdate(index, { unit_cost: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                    />
                </div>
            )}

            {/* QUANTITY INPUT */}
            <div className="w-20 space-y-1">
                <label className="text-xs text-muted-foreground">
                    {itemType === 'raw_material' ? 'Qty' : 'Units'}
                </label>
                <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="h-9 text-center text-sm"
                    value={quantity}
                    onChange={(e) => onUpdate(index, { quantity: parseFloat(e.target.value) || 0 })}
                />
            </div>

            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => onRemove(index)}
            >
                <Trash2 className="w-4 h-4" />
            </Button>
        </div>
    );
}
