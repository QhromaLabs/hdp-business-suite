import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Check, Trash2, ChevronsUpDown } from 'lucide-react';
import { cn } from "@/lib/utils"

interface RawMaterialOption {
    id: string;
    name: string;
    unit?: string;
    sku?: string; // Optional if needed
}

interface IngredientRowProps {
    index: number;
    rawMaterialId: string | null;
    rawMaterialName: string; // Current text value, for creating new ones
    quantity: number;
    options: RawMaterialOption[];
    onUpdate: (index: number, updates: { raw_material_id?: string | null; raw_material_name?: string; quantity?: number }) => void;
    onRemove: (index: number) => void;
}

export function IngredientRow({
    index,
    rawMaterialId,
    rawMaterialName,
    quantity,
    options,
    onUpdate,
    onRemove
}: IngredientRowProps) {
    const [open, setOpen] = useState(false);

    // Filter options based on input name provided by parent (rawMaterialName)
    const filteredOptions = useMemo(() => {
        if (!rawMaterialName) return options;
        const lower = rawMaterialName.toLowerCase();
        return options.filter(m => m.name.toLowerCase().includes(lower));
    }, [options, rawMaterialName]);

    const handleSelect = (option: RawMaterialOption) => {
        onUpdate(index, {
            raw_material_id: option.id,
            raw_material_name: option.name
        });
        setOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        // Logic: If user types, we update the name. We clear the ID because it might be a new item
        // or a mismatch. The user must explicitly select to link to an ID, or leave it as new.
        // We could try to auto-match strict names, but it's risky if multiple items have same name?
        // Let's stick to "typing = new/unlinked unless selected".

        onUpdate(index, {
            raw_material_name: newValue,
            raw_material_id: null
        });
        setOpen(true);
    };

    return (
        <div className="flex gap-3 items-end p-3 bg-muted/20 rounded-lg border border-border/50">
            <div className="flex-1 space-y-1">
                <label className="text-xs text-muted-foreground">Material Name</label>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <div className="relative">
                            <Input
                                value={rawMaterialName}
                                onChange={handleInputChange}
                                onFocus={() => setOpen(true)}
                                placeholder="Type material name..."
                                className="w-full pr-8"
                            />
                            <ChevronsUpDown className="absolute right-2 top-2.5 h-4 w-4 opacity-50 pointer-events-none" />
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
                                            "{rawMaterialName}" will be created as new
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
                                                <span className="truncate">
                                                    {material.name} <span className="text-muted-foreground text-xs ml-1">({material.unit || 'units'})</span>
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
            <div className="w-24 space-y-1">
                <label className="text-xs text-muted-foreground">Qty</label>
                <Input
                    type="number"
                    min="0.1"
                    step="0.1"
                    className="h-10"
                    value={quantity}
                    onChange={(e) => onUpdate(index, { quantity: Number(e.target.value) })}
                />
            </div>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-destructive hover:bg-destructive/10"
                onClick={() => onRemove(index)}
            >
                <Trash2 className="w-4 h-4" />
            </Button>
        </div>
    );
}
