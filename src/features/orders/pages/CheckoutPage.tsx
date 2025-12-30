// src/features/orders/pages/CheckoutPage.tsx
// PRODUCTION-READY — DECEMBER 29, 2025
// Dynamic delivery fee/minOrder/estimatedTime from area
// Full unit support in item summary
// Professional, responsive, mobile-first design

import { useEffect, useMemo,useState } from 'react';
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
import { Badge } from '@/components/ui/badge';

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
import { UNIT_LABELS } from '@/types/order.types';
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

  // Prevent empty cart
  useEffect(() => {
    if (items.length === 0) {
      toast.info('Your cart is empty');
      navigate('/cart', { replace: true });
    }
  }, [items.length, navigate]);

  // Update delivery info for authenticated users
  useEffect(() => {
    if (!isAuthenticated || addressesLoading || areasLoading) return;

    const selectedAddr = addresses.find((a) => a._id === selectedAddressId) ||
      addresses.find((a) => a.isDefault) ||
      addresses[0];

    if (selectedAddr?.area?._id) {
      const area = areas.find((a) => a._id === selectedAddr.area._id);
      updateDeliveryInfo(area);
    }
  }, [selectedAddressId, addresses, areas, isAuthenticated, addressesLoading, areasLoading]);

  // Update delivery info for guest users
  useEffect(() => {
    if (isAuthenticated || !guestAreaId || areasLoading) return;

    const area = areas.find((a) => a._id === guestAreaId);
    updateDeliveryInfo(area);
  }, [guestAreaId, areas, isAuthenticated, areasLoading]);

  const updateDeliveryInfo = (area?: PublicArea) => {
    if (area?.deliveryZone) {
      setDeliveryFee(area.deliveryZone.deliveryFee ?? 0);
      setMinOrderAmount(area.deliveryZone.minOrderAmount ?? 0);
      setEstimatedTime(area.deliveryZone.estimatedTime || '—');
    } else {
      setDeliveryFee(0);
      setMinOrderAmount(0);
      setEstimatedTime('—');
    }
  };

  const canProceed =
    isMinOrderMet &&
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
      toast.error(error.response?.data?.message || 'Failed to place order');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-muted/20 to-background py-6 md:py-10">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-10">
          Checkout
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-8 lg:grid-cols-3">
          {/* Left Column: Form */}
          <section className="space-y-8 lg:col-span-2">
            {/* Guest Info */}
            {!isAuthenticated && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
                    <User className="h-6 w-6" />
                    Your Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" {...register('name')} placeholder="Ahmad Khan" className="h-12" />
                    {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input id="phone" {...register('phone')} placeholder="03451234567" className="h-12" />
                    {errors.phone && <p className="mt-1 text-sm text-destructive">{errors.phone.message}</p>}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Delivery Address */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
                  <MapPin className="h-6 w-6" />
                  Delivery Address
                </CardTitle>
                {estimatedTime !== '—' && (
                  <CardDescription className="text-base md:text-lg mt-2">
                    Estimated delivery: <strong className="text-primary">{estimatedTime}</strong>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {isAuthenticated ? (
                  addressesLoading || areasLoading ? (
                    <div className="py-12 text-center">
                      <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                    </div>
                  ) : addresses.length > 0 ? (
                    <Controller
                      name="addressId"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="h-14 text-base">
                            <SelectValue placeholder="Select a saved address" />
                          </SelectTrigger>
                          <SelectContent>
                            {addresses.map((addr) => (
                              <SelectItem key={addr._id} value={addr._id}>
                                <div className="space-y-1">
                                  <p className="font-medium">{addr.label}</p>
                                  <p className="text-sm text-muted-foreground">{addr.fullAddress}</p>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  ) : (
                    <Alert>
                      <AlertCircle className="h-5 w-5" />
                      <AlertDescription>
                        No saved addresses. Add one in your profile to continue.
                      </AlertDescription>
                    </Alert>
                  )
                ) : (
                  <>
                    <div>
                      <Label className="text-base md:text-lg">Delivery Area *</Label>
                      {areasLoading ? (
                        <div className="h-14 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : (
                        <Controller
                          name="guestAddress.areaId"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger className="h-14 text-base">
                                <SelectValue placeholder="Select your area" />
                              </SelectTrigger>
                              <SelectContent>
                                {areas.map((area) => (
                                  <SelectItem key={area._id} value={area._id}>
                                    <div>
                                      <p className="font-medium">{area.name}</p>
                                      <p className="text-sm text-muted-foreground">
                                        Delivery: Rs. {area.deliveryZone?.deliveryFee ?? '—'}
                                      </p>
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

                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="guest-fullAddress" className="text-base md:text-lg">
                          Full Address *
                        </Label>
                        <Textarea
                          id="guest-fullAddress"
                          {...register('guestAddress.fullAddress')}
                          placeholder="House #, Street, Sector, Nearby landmark..."
                          rows={4}
                          className="resize-none mt-2"
                        />
                        {errors.guestAddress?.fullAddress && (
                          <p className="mt-1 text-sm text-destructive">{errors.guestAddress.fullAddress.message}</p>
                        )}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label>Label (e.g. Home, Work)</Label>
                          <Input {...register('guestAddress.label')} placeholder="Home" className="h-12 mt-2" />
                        </div>
                        <div>
                          <Label>Floor / Apartment</Label>
                          <Input {...register('guestAddress.floor')} placeholder="2nd Floor, Flat B-3" className="h-12 mt-2" />
                        </div>
                      </div>

                      <div>
                        <Label>Delivery Instructions</Label>
                        <Textarea
                          {...register('guestAddress.instructions')}
                          placeholder="Ring bell twice, leave with guard..."
                          rows={3}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card className="shadow-lg">
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
                          className="flex items-center gap-4 p-5 border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors mb-4 last:mb-0"
                        >
                          <RadioGroupItem value={opt.value} />
                          <opt.icon className="h-8 w-8 text-primary" />
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
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">Promo Code</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    {...register('promoCode')}
                    placeholder="Enter code (optional)"
                    className="h-12 uppercase"
                  />
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">Order Note</CardTitle>
                  <CardDescription>Any special requests?</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    {...register('instructions')}
                    placeholder="Less spicy, extra sauce, no onions..."
                    rows={5}
                    className="resize-none"
                  />
                  {errors.instructions && (
                    <p className="mt-1 text-sm text-destructive">{errors.instructions.message}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Right Column: Summary */}
          <aside className="lg:col-span-1">
            <Card className="sticky top-6 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
                  <Package className="h-7 w-7" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Items List */}
                <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                  {items.map((item) => (
                    <div key={item._id} className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg">{item.quantity}x</span>
                          <div>
                            <div  className="font-medium">
                              {item.menuItem.name}
                              <Badge variant="outline" className="ml-2 text-xs">
                                {UNIT_LABELS[item.menuItem.unit] || item.menuItem.unit}
                              </Badge>
                            </div >
                          </div>
                        </div>
                        <p className="font-medium text-right">
                          Rs. {(item.priceAtAdd * item.quantity).toLocaleString()}
                        </p>
                      </div>

                      {/* Add-ons with units */}
                      {[...(item.sides || []), ...(item.drinks || []), ...(item.addOns || [])].length > 0 && (
                        <div className="ml-12 space-y-1 text-sm text-muted-foreground">
                          {[...(item.sides || []), ...(item.drinks || []), ...(item.addOns || [])].map((addon, i) => (
                            <p key={i} className="flex justify-between">
                              <span>• {addon}</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <Separator className="my-6" />

                {/* Totals */}
                <div className="space-y-4 text-base md:text-lg">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>Rs. {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span>Rs. {deliveryFee.toLocaleString()}</span>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="flex justify-between text-2xl md:text-3xl font-bold">
                  <span>Total</span>
                  <span className="text-primary">Rs. {total.toLocaleString()}</span>
                </div>

                {!isMinOrderMet && minOrderAmount > 0 && (
                  <Alert variant="destructive" className="mt-6">
                    <AlertCircle className="h-5 w-5" />
                    <AlertDescription>
                      Minimum order amount: Rs. {minOrderAmount.toLocaleString()}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-16 text-lg md:text-xl font-bold shadow-2xl"
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