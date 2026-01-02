// src/features/orders/pages/CheckoutPage.tsx
// PRODUCTION-READY — January 02, 2026
// FINAL: Fixed delivery fee bugs, improved UX, robust edge cases

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import {
  Loader2,
  AlertCircle,
  MapPin,
  User,
  CreditCard,
  Wallet,
  Building2,
  Smartphone,
  Package,
  CheckCircle2,
  Truck,
  AlertTriangle,
} from 'lucide-react';

import { toast } from 'sonner';

import { useAuthStore } from '@/features/auth/store/authStore';
import { useCartStore } from '@/features/cart/hooks/useCartStore';
import { useAddresses } from '@/features/address/hooks/useAddresses';
import { useAreas, SimpleArea } from '@/hooks/useCheckArea';
import { useCreateOrder, useCreateGuestOrder } from '@/features/orders/hooks/useOrders';
import { UNIT_LABELS } from '@/features/menu/types/menu.types';

const baseSchema = z.object({
  paymentMethod: z.enum(['cash', 'card', 'easypaisa', 'jazzcash', 'bank', 'wallet'], {
    required_error: 'Please select a payment method',
  }),
  promoCode: z.string().optional(),
  instructions: z.string().max(300, 'Max 300 characters').optional().default(''),
});

const authenticatedSchema = baseSchema.extend({
  addressId: z.string({ required_error: 'Please select a delivery address' }),
});

const guestSchema = baseSchema.extend({
  name: z.string().min(3, 'Name must be at least 3 characters').trim(),
  phone: z.string().regex(/^03\d{9}$/, 'Invalid format: use 03XXXXXXXXX'),
  guestAddress: z.object({
    fullAddress: z.string().min(15, 'Full address required (minimum 15 characters)'),
    areaId: z.string({ required_error: 'Please select a delivery area' }),
    label: z.string().optional(),
    floor: z.string().optional(),
    instructions: z.string().max(150).optional(),
  }),
});

type CheckoutForm = z.infer<typeof authenticatedSchema> & z.infer<typeof guestSchema>;

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { items, getTotal, orderNote, clearCart } = useCartStore();

  const { data: addresses = [], isLoading: addressesLoading } = useAddresses();
  const { data: areas = [], isLoading: areasLoading } = useAreas();

  const createOrder = useCreateOrder();
  const createGuestOrder = useCreateGuestOrder();

  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [originalFee, setOriginalFee] = useState<number | null>(null); // null = no fee defined
  const [minOrderAmount, setMinOrderAmount] = useState<number>(0);
  const [estimatedTime, setEstimatedTime] = useState<string>('—');
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number | null>(null);
  const [deliveryActive, setDeliveryActive] = useState<boolean>(true);
  const [feeMisconfigured, setFeeMisconfigured] = useState<boolean>(false);

  const schema = isAuthenticated ? authenticatedSchema : guestSchema;

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      paymentMethod: 'cash',
      instructions: orderNote || '',
      name: '',
      phone: '',
    },
  });

  const subtotal = getTotal();
  const total = useMemo(() => subtotal + deliveryFee, [subtotal, deliveryFee]);

  const selectedAddressId = watch('addressId');
  const guestAreaId = watch('guestAddress.areaId');
  const guestFullAddress = watch('guestAddress.fullAddress');

  useEffect(() => {
    if (items.length === 0) {
      toast.info('Your cart is empty');
      navigate('/cart', { replace: true });
    }
  }, [items.length, navigate]);

  const updateDeliveryInfo = (area: SimpleArea | undefined) => {
    // Reset all
    setDeliveryFee(0);
    setOriginalFee(null);
    setMinOrderAmount(0);
    setEstimatedTime('—');
    setFreeDeliveryThreshold(null);
    setDeliveryActive(false);
    setFeeMisconfigured(false);

    if (!area?.deliveryZone || !area.deliveryZone.isActive) {
      return;
    }

    const zone = area.deliveryZone;
    const threshold = zone.freeDeliveryAbove ?? null;
    const rawBaseFee = zone.tieredBaseFee ?? zone.deliveryFee;

    setFreeDeliveryThreshold(threshold);
    setMinOrderAmount(zone.minOrderAmount ?? 0);
    setEstimatedTime(zone.estimatedTime || '35–50 min');

    // Case 1: No base fee configured at all → misconfigured
    if (rawBaseFee === undefined || rawBaseFee === null || rawBaseFee < 0) {
      setFeeMisconfigured(true);
      setDeliveryActive(false);
      return;
    }

    // Case 2: Valid base fee
    const isFree = threshold !== null && threshold > 0 && subtotal >= threshold;

    setOriginalFee(rawBaseFee);
    setDeliveryFee(isFree ? 0 : rawBaseFee);
    setDeliveryActive(true);
    setFeeMisconfigured(false);
  };

  // Authenticated user: use saved address → area
  useEffect(() => {
    if (!isAuthenticated || addressesLoading || areasLoading) return;

    const selectedAddr = addresses.find(a => a._id === selectedAddressId) || addresses.find(a => a.isDefault);
    const area = areas.find(a => a._id === selectedAddr?.area?._id);

    updateDeliveryInfo(area);
  }, [selectedAddressId, addresses, areas, isAuthenticated, addressesLoading, areasLoading, subtotal]);

  // Guest user: direct area selection
  useEffect(() => {
    if (isAuthenticated || areasLoading) return;

    const area = areas.find(a => a._id === guestAreaId);
    updateDeliveryInfo(area);
  }, [guestAreaId, areas, isAuthenticated, areasLoading, subtotal]);

  const isMinOrderMet = minOrderAmount === 0 || subtotal >= minOrderAmount;
  const hasValidAddress = isAuthenticated
    ? !!selectedAddressId
    : !!(guestAreaId && guestFullAddress?.trim().length >= 15);

  const canPlaceOrder = isMinOrderMet && hasValidAddress && deliveryActive && !feeMisconfigured;

  const onSubmit = async (data: CheckoutForm) => {
    if (!canPlaceOrder) {
      toast.error('Please complete all required fields and ensure delivery is available');
      return;
    }

    const itemsPayload = items.map((item) => ({
      menuItem: item.menuItem._id,
      quantity: item.quantity,
      priceAtAdd: item.priceAtAdd,
      sides: item.sides || [],
      drinks: item.drinks || [],
      addOns: item.addOns || [],
      specialInstructions: item.specialInstructions || '',
    }));

    try {
      let response;

      if (isAuthenticated) {
        response = await createOrder.mutateAsync({
          items: itemsPayload,
          addressId: data.addressId!,
          paymentMethod: data.paymentMethod,
          promoCode: data.promoCode?.trim().toUpperCase() || undefined,
          instructions: data.instructions?.trim() || undefined,
        });
      } else {
        response = await createGuestOrder.mutateAsync({
          items: itemsPayload,
          name: data.name!.trim(),
          phone: data.phone!.trim(),
          guestAddress: {
            fullAddress: data.guestAddress!.fullAddress.trim(),
            areaId: data.guestAddress!.areaId,
            label: data.guestAddress!.label?.trim() || 'Home',
            floor: data.guestAddress!.floor?.trim(),
            instructions: data.guestAddress!.instructions?.trim(),
          },
          paymentMethod: data.paymentMethod,
          promoCode: data.promoCode?.trim().toUpperCase() || undefined,
          instructions: data.instructions?.trim() || undefined,
        });
      }

      clearCart();

      if (response?.clientSecret) {
        navigate('/checkout/card', {
          state: { clientSecret: response.clientSecret, orderId: response.order._id, amount: total },
          replace: true,
        });
      } else if (response?.bankDetails) {
        navigate('/checkout/bank-transfer', {
          state: { order: response.order, bankDetails: response.bankDetails },
          replace: true,
        });
      } else {
        navigate(`/track/${response?.order._id}`, { replace: true });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to place order');
    }
  };

  // Helper to get current selected area for preview in dropdown
  const currentArea = isAuthenticated
    ? areas.find(a => a._id === addresses.find(addr => addr._id === selectedAddressId || addr.isDefault)?.area?._id)
    : areas.find(a => a._id === guestAreaId);

  const currentBaseFee = currentArea?.deliveryZone
    ? (currentArea.deliveryZone.tieredBaseFee ?? currentArea.deliveryZone.deliveryFee)
    : null;

  const currentIsFree = freeDeliveryThreshold !== null && subtotal >= freeDeliveryThreshold;

  return (
    <main className="min-h-screen bg-gradient-to-b from-muted/20 to-background py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-12">Checkout</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-10 lg:grid-cols-3">
          {/* Left: Form */}
          <section className="space-y-8 lg:col-span-2">
            {/* Guest Details */}
            {!isAuthenticated && (
              <Card className="shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <User className="h-7 w-7" />
                    Your Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" {...register('name')} placeholder="Ahmad Khan" className="h-12 mt-2" />
                    {errors.name && <p className="mt-2 text-sm text-destructive">{errors.name.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input id="phone" {...register('phone')} placeholder="03451234567" className="h-12 mt-2" />
                    {errors.phone && <p className="mt-2 text-sm text-destructive">{errors.phone.message}</p>}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Delivery Address */}
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <MapPin className="h-7 w-7" />
                  Delivery Address
                </CardTitle>
                {estimatedTime !== '—' && deliveryActive && !feeMisconfigured && (
                  <CardDescription className="text-lg mt-3 flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Estimated delivery: <strong className="text-primary">{estimatedTime}</strong>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-8">
                {isAuthenticated ? (
                  addressesLoading || areasLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-14 w-full" />
                      <Skeleton className="h-14 w-full" />
                    </div>
                  ) : addresses.length > 0 ? (
                    <Controller
                      name="addressId"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <SelectTrigger className="h-14 text-base">
                            <SelectValue placeholder="Select a saved address" />
                          </SelectTrigger>
                          <SelectContent>
                            {addresses.map((addr) => (
                              <SelectItem key={addr._id} value={addr._id}>
                                <div className="py-2">
                                  <p className="font-medium">{addr.label || 'Home'}</p>
                                  <p className="text-sm text-muted-foreground">{addr.fullAddress}</p>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  ) : (
                    <Alert variant="destructive">
                      <AlertCircle className="h-5 w-5" />
                      <AlertTitle>No Saved Addresses</AlertTitle>
                      <AlertDescription>
                        Please add an address in your profile to continue.
                      </AlertDescription>
                    </Alert>
                  )
                ) : (
                  <>
                    <div>
                      <Label className="text-lg">Delivery Area *</Label>
                      {areasLoading ? (
                        <Skeleton className="h-14 w-full mt-3" />
                      ) : (
                        <Controller
                          name="guestAddress.areaId"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <SelectTrigger className="h-14 text-base mt-3">
                                <SelectValue placeholder="Select your area" />
                              </SelectTrigger>
                              <SelectContent>
                                {areas
                                  .filter((a) => a.deliveryZone?.isActive)
                                  .map((area) => {
                                    const baseFee = area.deliveryZone?.tieredBaseFee ?? area.deliveryZone?.deliveryFee;
                                    const threshold = area.deliveryZone?.freeDeliveryAbove;
                                    const isFreeNow = threshold && subtotal >= threshold;

                                    return (
                                      <SelectItem key={area._id} value={area._id}>
                                        <div className="py-2">
                                          <p className="font-medium">{area.name}</p>
                                          <p className="text-sm text-muted-foreground">
                                            {baseFee === undefined || baseFee === null ? (
                                              <span className="text-orange-600">Fee not set</span>
                                            ) : isFreeNow ? (
                                              <span className="text-green-600 font-medium">Free Delivery!</span>
                                            ) : (
                                              `Delivery: Rs. ${baseFee}${threshold ? ` → Free above Rs. ${threshold}` : ''}`
                                            )}
                                          </p>
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      )}
                      {errors.guestAddress?.areaId && (
                        <p className="mt-2 text-sm text-destructive">{errors.guestAddress.areaId.message}</p>
                      )}
                    </div>

                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="guest-fullAddress" className="text-lg">
                          Full Address *
                        </Label>
                        <Textarea
                          id="guest-fullAddress"
                          {...register('guestAddress.fullAddress')}
                          placeholder="House 12, Street 8, Near Jinnah Park..."
                          rows={4}
                          className="mt-3 resize-none"
                        />
                        {errors.guestAddress?.fullAddress && (
                          <p className="mt-2 text-sm text-destructive">{errors.guestAddress.fullAddress.message}</p>
                        )}
                      </div>

                      <div className="grid gap-6 sm:grid-cols-2">
                        <div>
                          <Label>Label (e.g. Home)</Label>
                          <Input {...register('guestAddress.label')} placeholder="Home" className="h-12 mt-3" />
                        </div>
                        <div>
                          <Label>Floor / Apartment</Label>
                          <Input {...register('guestAddress.floor')} placeholder="2nd Floor, Flat B-3" className="h-12 mt-3" />
                        </div>
                      </div>

                      <div>
                        <Label>Delivery Instructions</Label>
                        <Textarea
                          {...register('guestAddress.instructions')}
                          placeholder="Ring bell twice..."
                          rows={3}
                          className="mt-3 resize-none"
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <CreditCard className="h-7 w-7" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Controller
                  name="paymentMethod"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      {[
                        { value: 'cash', label: 'Cash on Delivery', icon: Wallet },
                        { value: 'card', label: 'Credit/Debit Card', icon: CreditCard },
                        { value: 'easypaisa', label: 'EasyPaisa', icon: Smartphone },
                        { value: 'jazzcash', label: 'JazzCash', icon: Smartphone },
                        { value: 'bank', label: 'Bank Transfer', icon: Building2 },
                        { value: 'wallet', label: 'Wallet', icon: Wallet },
                      ].map((opt) => (
                        <Label
                          key={opt.value}
                          className="flex items-center gap-5 p-6 border rounded-xl cursor-pointer hover:bg-muted/60 transition-all mb-4 last:mb-0 [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
                        >
                          <RadioGroupItem value={opt.value} />
                          <opt.icon className="h-9 w-9 text-primary" />
                          <span className="text-lg font-medium">{opt.label}</span>
                        </Label>
                      ))}
                    </RadioGroup>
                  )}
                />
              </CardContent>
            </Card>

            {/* Promo & Note */}
            <div className="grid gap-8 md:grid-cols-2">
              <Card className="shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl">Promo Code</CardTitle>
                  <CardDescription>Have a discount code?</CardDescription>
                </CardHeader>
                <CardContent>
                  <Input
                    {...register('promoCode')}
                    placeholder="Enter code (optional)"
                    className="h-12 uppercase"
                  />
                </CardContent>
              </Card>

              <Card className="shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl">Order Note</CardTitle>
                  <CardDescription>Special requests?</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    {...register('instructions')}
                    placeholder="Less spicy, extra gravy..."
                    rows={5}
                    className="resize-none"
                  />
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Right: Summary */}
          <aside className="lg:col-span-1">
            <Card className="sticky top-6 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Package className="h-8 w-8" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="max-h-96 overflow-y-auto space-y-6 pr-2">
                  {items.map((item) => (
                    <div key={item._id} className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4">
                          <span className="font-bold text-xl">{item.quantity}x</span>
                          <div>
                            <div className="font-medium text-lg flex items-center gap-2">
                              {item.menuItem.name}
                              <Badge variant="secondary" className="text-xs">
                                {UNIT_LABELS[item.menuItem.unit] || item.menuItem.unit}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <p className="font-medium text-lg">
                          Rs. {(item.priceAtAdd * item.quantity).toLocaleString('en-PK')}
                        </p>
                      </div>

                      {item.selectedOptions && Object.values(item.selectedOptions).flat().length > 0 && (
                        <div className="ml-16 space-y-1 text-sm text-muted-foreground">
                          {(['sides', 'drinks', 'addOns'] as const).flatMap((section) =>
                            item.selectedOptions![section].map((opt) => (
                              <p key={opt.name} className="flex justify-between">
                                <span className="flex items-center gap-2">
                                  • {opt.name}
                                  {opt.unit && (
                                    <Badge variant="outline" className="text-xs py-0 px-1.5">
                                      {UNIT_LABELS[opt.unit] || opt.unit}
                                    </Badge>
                                  )}
                                </span>
                                {opt.price > 0 && (
                                  <span className="text-primary font-medium">+Rs. {opt.price}</span>
                                )}
                              </p>
                            ))
                          )}
                        </div>
                      )}

                      {(!item.selectedOptions && (item.sides?.length || item.drinks?.length || item.addOns?.length)) && (
                        <div className="ml-16 space-y-1 text-sm text-muted-foreground">
                          {item.sides?.map((s) => <p key={s}>• {s}</p>)}
                          {item.drinks?.map((d) => <p key={d}>• {d}</p>)}
                          {item.addOns?.map((a) => <p key={a}>• {a}</p>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <Separator className="my-8" />

                <div className="space-y-5 text-lg">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>Rs. {subtotal.toLocaleString('en-PK')}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Delivery Fee</span>
                    <div className="text-right">
                      {feeMisconfigured ? (
                        <span className="text-orange-600 font-medium flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5" />
                          Fee not configured
                        </span>
                      ) : deliveryFee === 0 && originalFee !== null && originalFee > 0 ? (
                        <div className="flex items-center gap-3 text-green-600 font-bold">
                          <CheckCircle2 className="h-6 w-6" />
                          <span>Free Delivery!</span>
                          <span className="line-through text-muted-foreground text-base">
                            Rs. {originalFee}
                          </span>
                        </div>
                      ) : (
                        <span className="font-medium">Rs. {deliveryFee}</span>
                      )}
                    </div>
                  </div>

                  {freeDeliveryThreshold !== null && subtotal < freeDeliveryThreshold && !feeMisconfigured && (
                    <p className="text-sm text-right text-muted-foreground -mt-2">
                      Add Rs. {(freeDeliveryThreshold - subtotal).toLocaleString('en-PK')} more for free delivery
                    </p>
                  )}
                </div>

                <Separator className="my-8" />

                <div className="flex justify-between text-3xl font-bold">
                  <span>Total</span>
                  <span className="text-primary">Rs. {total.toLocaleString('en-PK')}</span>
                </div>

                {/* Alerts */}
                {!isMinOrderMet && minOrderAmount > 0 && (
                  <Alert variant="destructive" className="mt-6">
                    <AlertCircle className="h-6 w-6" />
                    <AlertTitle>Minimum Order Not Met</AlertTitle>
                    <AlertDescription>
                      This area requires a minimum order of Rs. {minOrderAmount.toLocaleString('en-PK')}.<br />
                      You need Rs. {(minOrderAmount - subtotal).toLocaleString('en-PK')} more.
                    </AlertDescription>
                  </Alert>
                )}

                {feeMisconfigured && (selectedAddressId || guestAreaId) && (
                  <Alert variant="destructive" className="mt-6">
                    <AlertTriangle className="h-5 w-5" />
                    <AlertTitle>Delivery Fee Not Configured</AlertTitle>
                    <AlertDescription>
                      Delivery charges are not set for this area. Please select another area or contact support.
                    </AlertDescription>
                  </Alert>
                )}

                {!deliveryActive && !feeMisconfigured && (selectedAddressId || guestAreaId) && (
                  <Alert className="mt-6">
                    <AlertCircle className="h-5 w-5" />
                    <AlertTitle>Delivery Unavailable</AlertTitle>
                    <AlertDescription>
                      Delivery is currently paused in your selected area.
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-16 text-xl font-bold shadow-2xl mt-8"
                  disabled={
                    createOrder.isPending ||
                    createGuestOrder.isPending ||
                    !canPlaceOrder ||
                    areasLoading ||
                    addressesLoading
                  }
                >
                  {createOrder.isPending || createGuestOrder.isPending ? (
                    <>
                      <Loader2 className="mr-3 h-7 w-7 animate-spin" />
                      Processing Order...
                    </>
                  ) : (
                    `Place Order — Rs. ${total.toLocaleString('en-PK')}`
                  )}
                </Button>
              </CardContent>
            </Card>
          </aside>
        </form>
      </div>
    </main>
  );
}