// src/features/orders/pages/CheckoutPage.tsx
// FINAL PRODUCTION — DECEMBER 18, 2025
// ALL TS ERRORS FIXED — NO EXTERNAL SHALLOW PACKAGE NEEDED
// Optimized performance with proper selectors and memoization

import { useEffect, useMemo, useState, memo } from 'react'; // ← Added useState
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, AlertCircle, MapPin, User, Phone, CreditCard, Wallet, Building2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '@/features/auth/store/authStore';
import { useCartStore } from '@/features/cart/store/useCartStore';
import { useAddresses } from '@/features/address/hooks/useAddresses';
import { useAreas } from '@/hooks/useCheckArea';
import { useCreateOrder, useCreateGuestOrder } from '@/features/orders/hooks/useOrders';
import type { CreateOrderPayload, CreateGuestOrderPayload } from '@/types/order.types';
import type { CartItem } from '@/features/cart/store/useCartStore'; // ← Import proper type

// Schema (cleaned up — no fake isAuthenticated)
const checkoutSchema = z.object({
  paymentMethod: z.enum(['cod', 'card', 'easypaisa', 'jazzcash', 'bank']),
  addressId: z.string().min(1, 'Please select an address').optional(),
  useNewAddress: z.boolean().optional(),
  guestAddress: z
    .object({
      fullAddress: z.string().min(10, 'Enter your complete address'),
      areaId: z.string({ required_error: 'Please select a delivery area' }),
      label: z.string().optional(),
      floor: z.string().optional(),
      instructions: z.string().max(150).optional(),
    })
    .optional(),
  name: z.string().min(2, 'Name is required').optional(),
  phone: z.string().regex(/^03\d{9}$/, 'Phone must be 03XXXXXXXXX format').optional(),
  promoCode: z.string().optional(),
  instructions: z.string().max(300).optional(),
}).refine(
  (data) => {
    if (data.useNewAddress) {
      return !!data.guestAddress?.areaId && !!data.guestAddress?.fullAddress;
    }
    return !!data.addressId;
  },
  {
    message: 'Please complete all address details',
    path: ['guestAddress'],
  }
);

type CheckoutForm = z.infer<typeof checkoutSchema>;

// Properly typed and memoized order items list
const OrderItemsList = memo(({ items }: { items: CartItem[] }) => {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item._id} className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {item.quantity} × {item.menuItem.name}
          </span>
          <span>Rs. {(item.priceAtAdd * item.quantity).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
});

OrderItemsList.displayName = 'OrderItemsList';

export default function CheckoutPage() {
  const navigate = useNavigate();

  // Auth
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Cart — selective + shallow comparison without external package
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore((state) => state.subtotal);
  const clearCart = useCartStore((state) => state.clearCart);

  const { data: addresses = [] } = useAddresses();
  const { data: areas = [] } = useAreas();

  const createOrder = useCreateOrder();
  const createGuestOrder = useCreateGuestOrder();

  const [deliveryFee, setDeliveryFee] = useState(149);
  const [minOrderAmount, setMinOrderAmount] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState('35-50 min');

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      paymentMethod: 'cod',
      useNewAddress: false,
    },
  });

  const selectedAddressId = watch('addressId');
  const useNewAddress = watch('useNewAddress');
  const guestAreaId = watch('guestAddress.areaId');

  // Auto-select default address
  useEffect(() => {
    if (isAuthenticated && addresses.length > 0 && !selectedAddressId && !useNewAddress) {
      const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
      if (defaultAddr) {
        setValue('addressId', defaultAddr._id);

        const area = areas.find((a) => a._id === defaultAddr.area._id);
        if (area?.deliveryZone) {
          setDeliveryFee(area.deliveryZone.deliveryFee);
          setMinOrderAmount(area.deliveryZone.minOrderAmount);
          setEstimatedTime(area.deliveryZone.estimatedTime || '35-50 min');
        }
      }
    }
  }, [addresses, areas, isAuthenticated, selectedAddressId, useNewAddress, setValue]);

  // Update delivery fee on area selection
  useEffect(() => {
    if (guestAreaId) {
      const area = areas.find((a) => a._id === guestAreaId);
      if (area?.deliveryZone) {
        setDeliveryFee(area.deliveryZone.deliveryFee);
        setMinOrderAmount(area.deliveryZone.minOrderAmount);
        setEstimatedTime(area.deliveryZone.estimatedTime || '35-50 min');
      }
    }
  }, [guestAreaId, areas]);

  // Clear saved address when using new one
  useEffect(() => {
    if (useNewAddress) {
      setValue('addressId', undefined);
    }
  }, [useNewAddress, setValue]);

  const total = useMemo(() => subtotal + deliveryFee, [subtotal, deliveryFee]);
  const isMinOrderMet = subtotal >= minOrderAmount;
  const showGuestAddressFields = !isAuthenticated || useNewAddress;

  const onSubmit = async (data: CheckoutForm) => {
    if (!isMinOrderMet) {
      toast.error(`Minimum order for this area is Rs. ${minOrderAmount}`);
      return;
    }

    const itemsPayload = items.map((item) => ({
      menuItem: item.menuItem._id,
      quantity: item.quantity,
    }));

    try {
      let response;

      if (useNewAddress || !isAuthenticated) {
        response = await createGuestOrder.mutateAsync({
          items: itemsPayload,
          guestAddress: {
            fullAddress: data.guestAddress!.fullAddress,
            areaId: data.guestAddress!.areaId,
            label: data.guestAddress!.label || 'Home',
            floor: data.guestAddress!.floor,
            instructions: data.guestAddress!.instructions,
          },
          name: !isAuthenticated ? data.name!.trim() : undefined,
          phone: !isAuthenticated ? data.phone : undefined,
          paymentMethod: data.paymentMethod,
          promoCode: data.promoCode?.trim().toUpperCase(),
          instructions: data.instructions?.trim(),
        });
      } else {
        response = await createOrder.mutateAsync({
          items: itemsPayload,
          addressId: data.addressId!,
          paymentMethod: data.paymentMethod,
          promoCode: data.promoCode?.trim().toUpperCase(),
          instructions: data.instructions?.trim(),
        });
      }

      clearCart();

      if (response.clientSecret) {
        navigate('/checkout/card', {
          state: {
            clientSecret: response.clientSecret,
            orderId: response.order._id,
            amount: response.order.finalAmount,
            shortId: response.order.shortId,
          },
          replace: true,
        });
      } else if (response.bankDetails) {
        navigate('/checkout/bank-transfer', {
          state: {
            order: response.order,
            bankDetails: response.bankDetails,
            walletUsed: response.walletUsed,
          },
          replace: true,
        });
      } else {
        toast.success('Order placed successfully! 🎉');
        navigate(`/track/${response.order._id}`, { replace: true });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to place order. Please try again.');
    }
  };

  if (items.length === 0) {
    navigate('/cart', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background py-8">
      <div className="container mx-auto max-w-6xl px-4">
        <h1 className="text-4xl font-bold text-center mb-10">Checkout</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="grid lg:grid-cols-3 gap-8">
          {/* Left: Form Fields */}
          <div className="lg:col-span-2 space-y-6">
            {/* Guest Contact Info */}
            {!isAuthenticated && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Contact Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input {...register('name')} placeholder="Ahmad Khan" />
                    {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input {...register('phone')} placeholder="03451234567" />
                    {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Delivery Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Delivery Address
                </CardTitle>
                {estimatedTime && (
                  <CardDescription>Estimated delivery: {estimatedTime}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-5">
                {isAuthenticated && !showGuestAddressFields && (
                  <>
                    <Controller
                      control={control}
                      name="addressId"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
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
                    {errors.addressId && (
                      <p className="text-sm text-destructive mt-1">{errors.addressId.message}</p>
                    )}
                  </>
                )}

                {isAuthenticated && (
                  <div className="flex items-center space-x-2 pt-2">
                    <Controller
                      control={control}
                      name="useNewAddress"
                      render={({ field }) => (
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <Label className="text-sm font-normal cursor-pointer">
                      Use a different delivery address
                    </Label>
                  </div>
                )}

                {showGuestAddressFields && (
                  <>
                    <div>
                      <Label>Delivery Area</Label>
                      <Controller
                        control={control}
                        name="guestAddress.areaId"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose your area" />
                            </SelectTrigger>
                            <SelectContent>
                              {areas.map((area) => (
                                <SelectItem key={area._id} value={area._id}>
                                  {area.name} — Rs. {area.deliveryZone?.deliveryFee || 149} delivery
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.guestAddress?.areaId && (
                        <p className="text-sm text-destructive mt-1">{errors.guestAddress.areaId.message}</p>
                      )}
                    </div>

                    <Textarea
                      {...register('guestAddress.fullAddress')}
                      placeholder="House number, street, sector, landmark..."
                      rows={3}
                    />
                    {errors.guestAddress?.fullAddress && (
                      <p className="text-sm text-destructive mt-1">{errors.guestAddress.fullAddress.message}</p>
                    )}

                    <div className="grid sm:grid-cols-2 gap-4">
                      <Input
                        {...register('guestAddress.label')}
                        placeholder="Label (e.g. Home)"
                        defaultValue="Home"
                      />
                      <Input {...register('guestAddress.floor')} placeholder="Floor/Apartment (optional)" />
                    </div>

                    <Textarea
                      {...register('instructions')}
                      placeholder="Special instructions (e.g. ring bell, leave at gate)"
                      rows={2}
                    />
                  </>
                )}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <Controller
                  control={control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-3">
                      <Label className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition">
                        <RadioGroupItem value="cod" />
                        <Wallet className="h-6 w-6 text-green-600" />
                        <div>
                          <p className="font-medium">Cash on Delivery</p>
                          <p className="text-sm text-muted-foreground">Pay when you receive</p>
                        </div>
                      </Label>

                      <Label className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition">
                        <RadioGroupItem value="card" />
                        <CreditCard className="h-6 w-6 text-blue-600" />
                        <div>
                          <p className="font-medium">Credit / Debit Card</p>
                          <p className="text-sm text-muted-foreground">Secure online payment</p>
                        </div>
                      </Label>

                      <Label className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition">
                        <RadioGroupItem value="easypaisa" />
                        <Smartphone className="h-6 w-6 text-green-600" />
                        <div>
                          <p className="font-medium">EasyPaisa</p>
                          <p className="text-sm text-muted-foreground">Pay via mobile wallet</p>
                        </div>
                      </Label>

                      <Label className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition">
                        <RadioGroupItem value="jazzcash" />
                        <Smartphone className="h-6 w-6 text-red-600" />
                        <div>
                          <p className="font-medium">JazzCash</p>
                          <p className="text-sm text-muted-foreground">Pay via mobile wallet</p>
                        </div>
                      </Label>

                      <Label className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition">
                        <RadioGroupItem value="bank" />
                        <Building2 className="h-6 w-6 text-orange-600" />
                        <div>
                          <p className="font-medium">Bank Transfer</p>
                          <p className="text-sm text-muted-foreground">Meezan Bank • Instant confirmation</p>
                        </div>
                      </Label>
                    </RadioGroup>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6 shadow-xl">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <OrderItemsList items={items} />

                <Separator />

                <div className="space-y-2 text-sm">
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

                <div className="flex justify-between text-2xl font-bold">
                  <span>Total</span>
                  <span className="text-primary">Rs. {total.toLocaleString()}</span>
                </div>

                {!isMinOrderMet && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Minimum order: Rs. {minOrderAmount.toLocaleString()} 
                      (add Rs. {(minOrderAmount - subtotal).toLocaleString()} more)
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-14 text-lg font-semibold"
                  disabled={isSubmitting || !isMinOrderMet || createOrder.isPending || createGuestOrder.isPending}
                >
                  {isSubmitting || createOrder.isPending || createGuestOrder.isPending ? (
                    <>
                      <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    `Place Order — Rs. ${total.toLocaleString()}`
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground pt-4">
                  By placing your order, you agree to our Terms of Service.
                </p>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
}