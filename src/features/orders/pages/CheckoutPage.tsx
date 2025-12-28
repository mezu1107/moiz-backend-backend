// src/features/orders/pages/CheckoutPage.tsx
// FINAL PRODUCTION — DECEMBER 28, 2025
// Now fully dynamic delivery fee/minOrder/estimatedTime from /api/areas
// Removed hardcoded 149 fallback everywhere
// Improved UX + type safety

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
import { Alert, AlertDescription } from '@/components/ui/alert';
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
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '@/features/auth/store/authStore';
import { useCartStore } from '@/features/cart/hooks/useCartStore';
import { useAddresses } from '@/features/address/hooks/useAddresses';
import { useAreas } from '@/hooks/useCheckArea';
import { useCreateOrder, useCreateGuestOrder } from '@/features/orders/hooks/useOrders';
import type { PublicArea } from '@/types/area';

const baseSchema = z.object({
  paymentMethod: z.enum(['cash', 'card', 'easypaisa', 'jazzcash', 'bank', 'wallet'], {
    required_error: 'Please select a payment method',
  }),
  useWallet: z.boolean().default(true),
  promoCode: z.string().optional(),
  instructions: z.string().max(300, 'Max 300 characters').optional(),
});

const authenticatedSchema = baseSchema.extend({
  addressId: z.string({ required_error: 'Please select a delivery address' }),
});

const guestSchema = baseSchema.extend({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^03\d{9}$/, 'Invalid format: use 03XXXXXXXXX'),
  guestAddress: z.object({
    fullAddress: z.string().min(10, 'Full address is required (min 10 chars)'),
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
  const { items, getTotal, orderNote } = useCartStore();

  const { data: addresses = [], isLoading: addressesLoading } = useAddresses();
  const { data: areas = [], isLoading: areasLoading } = useAreas();

  const createOrder = useCreateOrder();
  const createGuestOrder = useCreateGuestOrder();

  // Dynamic delivery state
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [minOrderAmount, setMinOrderAmount] = useState<number>(0);
  const [estimatedTime, setEstimatedTime] = useState<string>('—');

  const schema = isAuthenticated ? authenticatedSchema : guestSchema;

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      paymentMethod: 'cash',
      useWallet: true,
      instructions: orderNote || '',
      name: '',
      phone: '',
    },
  });

  const subtotal = getTotal();
  const total = useMemo(() => subtotal + deliveryFee, [subtotal, deliveryFee]);
  const isMinOrderMet = subtotal >= minOrderAmount || minOrderAmount === 0;

  const selectedAddressId = watch('addressId');
  const guestAreaId = watch('guestAddress.areaId');
  const guestFullAddress = watch('guestAddress.fullAddress');

  // Clear cart toast only on initial load
  useEffect(() => {
    if (items.length === 0 && !createOrder.isPending && !createGuestOrder.isPending) {
      toast.info('Your cart is empty');
      navigate('/cart', { replace: true });
    }
  }, [items.length, navigate, createOrder.isPending, createGuestOrder.isPending]);

  // Update delivery info for authenticated users (default / selected address)
  useEffect(() => {
    if (!isAuthenticated || addressesLoading || areasLoading || addresses.length === 0) return;

    const selectedAddr = addresses.find((a) => a._id === selectedAddressId) ||
                        (addresses.find((a) => a.isDefault) || addresses[0]);

    if (selectedAddr?.area?._id) {
      const area = areas.find((a) => a._id === selectedAddr.area?._id);
      updateDeliveryInfo(area);
    }
  }, [selectedAddressId, addresses, areas, isAuthenticated, addressesLoading, areasLoading]);

  // Update delivery info for guest users
  useEffect(() => {
    if (isAuthenticated || !guestAreaId || areasLoading) return;

    const area = areas.find((a) => a._id === guestAreaId);
    updateDeliveryInfo(area);
  }, [guestAreaId, areas, isAuthenticated, areasLoading]);

  // Centralized function to update delivery state
  const updateDeliveryInfo = (area?: PublicArea) => {
    if (area?.deliveryZone) {
      setDeliveryFee(area.deliveryZone.deliveryFee ?? 0);
      setMinOrderAmount(area.deliveryZone.minOrderAmount ?? 0);
      setEstimatedTime(area.deliveryZone.estimatedTime || '—');
    } else {
      // Fallback only when no zone exists (rare after backend fix)
      setDeliveryFee(0);
      setMinOrderAmount(0);
      setEstimatedTime('—');
    }
  };

  const canProceed =
    (minOrderAmount === 0 || isMinOrderMet) &&
    (isAuthenticated ? !!selectedAddressId : !!guestAreaId && !!guestFullAddress?.trim());

  const onSubmit = async (data: CheckoutForm) => {
    if (!canProceed) {
      toast.error('Please complete all required fields');
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
          useWallet: data.useWallet,
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

      if (response.clientSecret) {
        navigate('/checkout/card', {
          state: {
            clientSecret: response.clientSecret,
            orderId: response.order._id,
            amount: response.order.finalAmount,
          },
          replace: true,
        });
      } else if (response.bankDetails) {
        navigate('/checkout/bank-transfer', {
          state: {
            order: response.order,
            bankDetails: response.bankDetails,
          },
          replace: true,
        });
      } else {
        navigate(`/track/${response.order._id}`, { replace: true });
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
        error.message ||
        'Failed to place order. Please try again.'
      );
    }
  };

  return (
    <main className="min-h-screen bg-background py-6 md:py-8 lg:py-10">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-3xl font-bold text-center mb-8 md:text-4xl lg:text-5xl">
          Checkout
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-8 lg:grid-cols-3">
          {/* Form Section */}
          <section className="space-y-6 lg:col-span-2">
            {/* Guest Contact Info */}
            {!isAuthenticated && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
                    <User className="h-6 w-6" />
                    Your Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" {...register('name')} placeholder="Ahmad Khan" />
                    {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input id="phone" {...register('phone')} placeholder="03451234567" />
                    {errors.phone && <p className="mt-1 text-sm text-destructive">{errors.phone.message}</p>}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Delivery Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
                  <MapPin className="h-6 w-6" />
                  Delivery Address
                </CardTitle>
                {estimatedTime !== '—' && (
                  <CardDescription className="mt-2 text-base md:text-lg">
                    Estimated delivery: <span className="font-semibold text-primary">{estimatedTime}</span>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {isAuthenticated ? (
                  addressesLoading || areasLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                  ) : addresses.length > 0 ? (
                    <Controller
                      name="addressId"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Choose a saved address" />
                          </SelectTrigger>
                          <SelectContent>
                            {addresses.map((addr) => (
                              <SelectItem key={addr._id} value={addr._id}>
                                <div className="space-y-1">
                                  <div className="font-semibold">{addr.label}</div>
                                  <div className="text-sm text-muted-foreground">{addr.fullAddress}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No saved addresses found.{' '}
                        <Button variant="link" className="p-0 h-auto inline" onClick={() => navigate('/addresses')}>
                          Add one now
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )
                ) : (
                  <>
                    <div>
                      <Label>Delivery Area *</Label>
                      {areasLoading ? (
                        <div className="h-12 flex items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                      ) : (
                        <Controller
                          name="guestAddress.areaId"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="Select your area" />
                              </SelectTrigger>
                              <SelectContent>
                                {areas.map((area) => (
                                  <SelectItem key={area._id} value={area._id}>
                                    <div>
                                      <div className="font-medium">{area.name}</div>
                                      <div className="text-sm text-muted-foreground">
                                        Delivery: Rs. {area.deliveryZone?.deliveryFee ?? '—'}
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      )}
                      {errors.guestAddress?.areaId && (
                        <p className="mt-1 text-sm text-destructive">{errors.guestAddress.areaId.message}</p>
                      )}
                    </div>

                    <div className="space-y-5">
                      <div>
                        <Label htmlFor="guest-fullAddress">Full Address *</Label>
                        <Textarea
                          id="guest-fullAddress"
                          {...register('guestAddress.fullAddress')}
                          placeholder="House #, Street, Sector, Nearby landmark..."
                          rows={4}
                          className="resize-none"
                        />
                        {errors.guestAddress?.fullAddress && (
                          <p className="mt-1 text-sm text-destructive">{errors.guestAddress.fullAddress.message}</p>
                        )}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label>Label (e.g. Home, Work)</Label>
                          <Input {...register('guestAddress.label')} placeholder="Home" />
                        </div>
                        <div>
                          <Label>Floor / Apartment</Label>
                          <Input {...register('guestAddress.floor')} placeholder="2nd Floor, Flat B-3" />
                        </div>
                      </div>

                      <div>
                        <Label>Delivery Instructions</Label>
                        <Textarea
                          {...register('guestAddress.instructions')}
                          placeholder="Ring bell twice, leave with guard..."
                          rows={3}
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
                  <CreditCard className="h-6 w-6" />
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
                        { value: 'wallet', label: 'AMFoods Wallet', icon: Wallet },
                      ].map((opt) => (
                        <Label
                          key={opt.value}
                          className="flex items-center gap-4 p-4 md:p-5 border rounded-xl cursor-pointer hover:bg-muted/50 transition mb-3 last:mb-0"
                        >
                          <RadioGroupItem value={opt.value} />
                          <opt.icon className="h-7 w-7 text-primary flex-shrink-0" />
                          <span className="font-medium text-base md:text-lg">{opt.label}</span>
                        </Label>
                      ))}
                    </RadioGroup>
                  )}
                />
              </CardContent>
            </Card>

            {/* Promo & Note */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">Promo Code</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input {...register('promoCode')} placeholder="Enter code (optional)" className="uppercase h-12" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">Order Note</CardTitle>
                  <CardDescription>Any special requests?</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    {...register('instructions')}
                    placeholder="Less spicy, extra sauce, no onions..."
                    rows={4}
                  />
                  {errors.instructions && (
                    <p className="mt-1 text-sm text-destructive">{errors.instructions.message}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Order Summary Sidebar */}
          <aside className="lg:col-span-1">
            <Card className="sticky top-6 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
                  <Package className="h-6 w-6 md:h-7 md:w-7" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="max-h-64 space-y-3 overflow-y-auto pr-2 text-sm md:text-base">
                  {items.map((item) => (
                    <div key={item._id} className="flex justify-between">
                      <span className="text-muted-foreground">
                        {item.quantity} × {item.menuItem.name}
                      </span>
                      <span className="font-medium">
                        Rs. {(item.priceAtAdd * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-3 text-base md:text-lg">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>Rs. {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span>Rs. {deliveryFee.toLocaleString()}</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between text-2xl font-bold md:text-3xl">
                  <span>Total</span>
                  <span className="text-primary">Rs. {total.toLocaleString()}</span>
                </div>

                {!isMinOrderMet && minOrderAmount > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm md:text-base">
                      Minimum order for your area: Rs. {minOrderAmount.toLocaleString()}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-14 text-base md:text-lg font-semibold shadow-lg"
                  disabled={
                    createOrder.isPending ||
                    createGuestOrder.isPending ||
                    !canProceed ||
                    areasLoading
                  }
                >
                  {(createOrder.isPending || createGuestOrder.isPending) ? (
                    <>
                      <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    `Place Order — Rs. ${total.toLocaleString()}`
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