// src/features/cart/components/AddToCartModal.tsx
// PRODUCTION-READY — DECEMBER 2025
// Full customization modal (Foodpanda-style)
// Item-level customization ONLY — cart-level notes handled on /cart

import { useEffect, useMemo, useState } from 'react';
import { Plus, Minus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

import { useMenuItem } from '@/features/menu/hooks/useMenuApi';
import { useAddToCart } from '@/features/cart/hooks/useServerCart';
import { PricedOptions } from '@/features/menu/types/menu.types';
import { toast } from 'sonner';

type CustomizationSection = 'sides' | 'drinks' | 'addOns';

interface AddToCartModalProps {
  menuItemId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY_OPTIONS: Record<CustomizationSection, string[]> = {
  sides: [],
  drinks: [],
  addOns: [],
};

const EMPTY_CUSTOM_INPUTS: Record<CustomizationSection, string> = {
  sides: '',
  drinks: '',
  addOns: '',
};

export const AddToCartModal = ({
  menuItemId,
  open,
  onOpenChange,
}: AddToCartModalProps) => {
  const navigate = useNavigate();
  const { data: menuItem, isLoading } = useMenuItem(menuItemId);
  const addToCart = useAddToCart();

  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] =
    useState<Record<CustomizationSection, string[]>>(EMPTY_OPTIONS);
  const [customInputs, setCustomInputs] =
    useState<Record<CustomizationSection, string>>(EMPTY_CUSTOM_INPUTS);
  const [specialInstructions, setSpecialInstructions] = useState('');

  /** Reset state every time modal opens */
  useEffect(() => {
    if (open) {
      setQuantity(1);
      setSelectedOptions(EMPTY_OPTIONS);
      setCustomInputs(EMPTY_CUSTOM_INPUTS);
      setSpecialInstructions('');
    }
  }, [open]);

  /** Real-time extras total */
  const extrasTotal = useMemo(() => {
    if (!menuItem?.pricedOptions) return 0;

    let total = 0;
    (Object.keys(selectedOptions) as CustomizationSection[]).forEach(
      (section) => {
        selectedOptions[section].forEach((name) => {
          const opt = menuItem.pricedOptions?.[section]?.find(
            (o) => o.name === name
          );
          if (opt) total += opt.price;
        });
      }
    );

    return total;
  }, [menuItem?.pricedOptions, selectedOptions]);

  const itemTotal =
    ((menuItem?.price ?? 0) + extrasTotal) * quantity;

  const toggleOption = (section: CustomizationSection, name: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [section]: prev[section].includes(name)
        ? prev[section].filter((n) => n !== name)
        : [...prev[section], name],
    }));
  };

  const addCustom = (section: CustomizationSection) => {
    const text = customInputs[section].trim();
    if (!text) return;

    setSelectedOptions((prev) => ({
      ...prev,
      [section]: [...prev[section], `Custom: ${text}`],
    }));
    setCustomInputs((prev) => ({ ...prev, [section]: '' }));
    toast.success('Custom option added');
  };

  const handleAddToCart = () => {
    if (quantity < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }

    addToCart.mutate(
      {
        menuItemId,
        quantity,
        sides: selectedOptions.sides,
        drinks: selectedOptions.drinks,
        addOns: selectedOptions.addOns,
        specialInstructions:
          specialInstructions.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(`${menuItem?.name} added to cart`);
          onOpenChange(false);
          navigate('/cart'); // Foodpanda-style flow
        },
        onError: () => {
          toast.error('Failed to add item. Please try again.');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Loading item…</SheetTitle>
          </SheetHeader>
          <div className="space-y-6 py-8">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!menuItem) return null;

  const pricedOptions: PricedOptions =
    menuItem.pricedOptions ?? {
      sides: [],
      drinks: [],
      addOns: [],
    };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[90vh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:mx-auto sm:rounded-t-3xl"
      >
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-bold">
              {menuItem.name}
            </SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-5 w-5" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-6">
          <div className="space-y-8 pb-24">
            {/* Quantity */}
            <div className="bg-card rounded-xl p-4 border">
              <Label className="text-base font-semibold">
                Quantity
              </Label>
              <div className="flex items-center justify-center gap-6 mt-4">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() =>
                    setQuantity((q) => Math.max(1, q - 1))
                  }
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-3xl font-bold w-20 text-center">
                  {quantity}
                </span>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() =>
                    setQuantity((q) => Math.min(50, q + 1))
                  }
                  disabled={quantity >= 50}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Customization Sections */}
            {(Object.keys(pricedOptions) as CustomizationSection[]).map(
              (section) => (
                <div
                  key={section}
                  className="bg-card rounded-xl p-6 border"
                >
                  <Label className="text-base font-semibold capitalize">
                    {section === 'addOns' ? 'Add-ons' : section}
                  </Label>

                  <div className="space-y-3 mt-4">
                    {pricedOptions[section].map((opt) => (
                      <div
                        key={opt.name}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedOptions[section].includes(
                              opt.name
                            )}
                            onCheckedChange={() =>
                              toggleOption(section, opt.name)
                            }
                          />
                          <span>{opt.name}</span>
                        </div>
                        {opt.price > 0 && (
                          <span className="text-sm font-medium">
                            +Rs. {opt.price}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <Separator className="my-4" />

                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your own (free)"
                      value={customInputs[section]}
                      onChange={(e) =>
                        setCustomInputs((p) => ({
                          ...p,
                          [section]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) =>
                        e.key === 'Enter' && addCustom(section)
                      }
                    />
                    <Button onClick={() => addCustom(section)}>
                      Add
                    </Button>
                  </div>
                </div>
              )
            )}

            {/* Special Instructions */}
            <div className="bg-card rounded-xl p-6 border">
              <Label className="text-base font-semibold">
                Special instructions
              </Label>
              <Textarea
                placeholder="Less spicy, no onions, extra sauce…"
                className="mt-3"
                rows={3}
                value={specialInstructions}
                onChange={(e) =>
                  setSpecialInstructions(e.target.value.slice(0, 300))
                }
              />
              <p className="text-xs text-muted-foreground mt-2 text-right">
                {specialInstructions.length}/300
              </p>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t p-6 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold">Total</span>
            <span className="text-2xl font-bold text-primary">
              Rs. {itemTotal.toFixed(2)}
            </span>
          </div>

          <Button
            size="lg"
            onClick={handleAddToCart}
            disabled={addToCart.isPending}
          >
            {addToCart.isPending ? 'Adding…' : 'Add to Cart'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
