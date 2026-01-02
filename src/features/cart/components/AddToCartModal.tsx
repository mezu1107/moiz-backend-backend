// src/features/cart/components/AddToCartModal.tsx
// PRODUCTION-READY — JANUARY 03, 2026
// Fully persistent cart (guest + auth), accurate pricing, custom options

import { useEffect, useMemo, useState, useRef } from 'react';
import { Plus, Minus, X, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

import { useMenuItem } from '@/features/menu/hooks/useMenuApi';
import { useAddToCart } from '@/features/cart/hooks/useServerCart';
import { useCartStore } from '@/features/cart/hooks/useCartStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { PricedOptions, UNIT_LABELS } from '@/features/menu/types/menu.types';
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

export const AddToCartModal = ({ menuItemId, open, onOpenChange }: AddToCartModalProps) => {
  const navigate = useNavigate();
  const { data: menuItem, isLoading } = useMenuItem(menuItemId);
  const addToCart = useAddToCart();
  const localCart = useCartStore();
  const { user } = useAuthStore();
  const isGuest = !user;

  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<CustomizationSection, string[]>>(EMPTY_OPTIONS);
  const [customInputs, setCustomInputs] = useState<Record<CustomizationSection, string>>(EMPTY_CUSTOM_INPUTS);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [showFooterShadow, setShowFooterShadow] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setQuantity(1);
      setSelectedOptions(EMPTY_OPTIONS);
      setCustomInputs(EMPTY_CUSTOM_INPUTS);
      setSpecialInstructions('');
    }
  }, [open]);

  // Scroll shadow effect for footer
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current) return;
      setShowFooterShadow(scrollRef.current.scrollTop > 5);
    };
    const current = scrollRef.current;
    current?.addEventListener('scroll', handleScroll);
    return () => current?.removeEventListener('scroll', handleScroll);
  }, []);

  const extrasTotal = useMemo(() => {
    if (!menuItem?.pricedOptions) return 0;
    let total = 0;
    (Object.keys(selectedOptions) as CustomizationSection[]).forEach((section) => {
      selectedOptions[section].forEach((name) => {
        if (name.startsWith('Custom:')) return;
        const opt = menuItem.pricedOptions?.[section]?.find((o) => o.name === name);
        if (opt) total += opt.price;
      });
    });
    return total;
  }, [menuItem?.pricedOptions, selectedOptions]);

  const itemTotal = ((menuItem?.price ?? 0) + extrasTotal) * quantity;

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

  const handleAddToCart = async () => {
    if (quantity < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }

    const customizations = {
      sides: selectedOptions.sides,
      drinks: selectedOptions.drinks,
      addOns: selectedOptions.addOns,
      specialInstructions: specialInstructions.trim() || undefined,
    };

    try {
      if (isGuest) {
        // Guest → local store immediately
        localCart.addItem(menuItem!, quantity, customizations, menuItem!.price);
      } else {
        // Authenticated → server
        await addToCart.mutateAsync({
          menuItemId,
          quantity,
          ...customizations,
        });
      }

      onOpenChange(false);

      toast.success(`${quantity} × ${menuItem?.name} added to cart!`, {
        description: 'You can continue shopping or check your cart',
        duration: 5000,
        icon: <ShoppingCart className="h-5 w-5" />,
        action: {
          label: 'View Cart',
          onClick: () => navigate('/cart'),
        },
      });
    } catch (error) {
      toast.error('Failed to add item. Please try again.');
      console.error('Add to cart error:', error);
    }
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

  const pricedOptions: PricedOptions = menuItem.pricedOptions ?? { sides: [], drinks: [], addOns: [] };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[90vh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:mx-auto sm:rounded-t-3xl flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-bold flex items-center gap-3">
              {menuItem.name}
              <Badge variant="secondary" className="text-xs">
                {UNIT_LABELS[menuItem.unit] || menuItem.unit}
              </Badge>
            </SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-5 w-5" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        {/* Scrollable Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-8 pb-24">
          {/* Quantity */}
          <div className="bg-card rounded-xl p-4 border">
            <Label className="text-base font-semibold">Quantity</Label>
            <div className="flex items-center justify-center gap-6 mt-4">
              <Button
                size="icon"
                variant="outline"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-3xl font-bold w-20 text-center">{quantity}</span>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                disabled={quantity >= 50}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Customization Sections */}
          {(Object.keys(pricedOptions) as CustomizationSection[]).map((section) => (
            <div key={section} className="bg-card rounded-xl p-6 border">
              <Label className="text-base font-semibold capitalize">
                {section === 'addOns' ? 'Add-ons' : section.charAt(0).toUpperCase() + section.slice(1)}
              </Label>

              <div className="space-y-3 mt-4">
                {pricedOptions[section].map((opt) => (
                  <div key={opt.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedOptions[section].includes(opt.name)}
                        onCheckedChange={() => toggleOption(section, opt.name)}
                      />
                      <div className="flex items-center gap-2">
                        <span>{opt.name}</span>
                        {opt.unit && (
                          <Badge variant="outline" className="text-xs py-0 px-1.5">
                            {UNIT_LABELS[opt.unit] || opt.unit}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {opt.price > 0 && (
                      <span className="text-sm font-medium text-primary">+Rs. {opt.price}</span>
                    )}
                  </div>
                ))}

                {selectedOptions[section]
                  .filter((name) => name.startsWith('Custom:'))
                  .map((custom) => (
                    <div key={custom} className="flex items-center justify-between pl-9">
                      <span className="text-sm text-muted-foreground">• {custom}</span>
                      <span className="text-sm text-muted-foreground">Free</span>
                    </div>
                  ))}
              </div>

              <Separator className="my-4" />

              <div className="flex gap-2">
                <Input
                  placeholder="Type your own (free)"
                  value={customInputs[section]}
                  onChange={(e) => setCustomInputs((p) => ({ ...p, [section]: e.target.value }))}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), addCustom(section))
                  }
                />
                <Button onClick={() => addCustom(section)} size="sm">
                  Add
                </Button>
              </div>
            </div>
          ))}

          {/* Special Instructions */}
          <div className="bg-card rounded-xl p-6 border">
            <Label className="text-base font-semibold">Special instructions</Label>
            <Textarea
              placeholder="Less spicy, no onions, extra sauce, etc."
              className="mt-3"
              rows={3}
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value.slice(0, 300))}
            />
            <p className="text-xs text-muted-foreground mt-2 text-right">
              {specialInstructions.length}/300
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`bg-background border-t p-6 space-y-4 z-10 transition-shadow duration-300 ${
            showFooterShadow ? 'shadow-2xl' : 'shadow-lg'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold">Total</span>
            <span className="text-2xl font-bold text-primary">Rs. {itemTotal.toFixed(2)}</span>
          </div>
          <Button size="lg" onClick={handleAddToCart} disabled={addToCart.isPending} className="w-full">
            {addToCart.isPending ? 'Adding to cart...' : 'Add to Cart'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
