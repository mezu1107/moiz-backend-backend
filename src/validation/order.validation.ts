// src/validation/order.validation.ts
// FINAL PRODUCTION — DECEMBER 16, 2025
// FULLY SYNCED WITH order.types.ts AND orderController.js

import { z } from 'zod';

// === Shared Schemas ===

const PaymentMethodSchema = z.union([
  z.literal('cod'),
  z.literal('card'),
  z.literal('easypaisa'),
  z.literal('jazzcash'),
  z.literal('bank'),
  z.literal('wallet'),
]);

const OrderStatusSchema = z.union([
  z.literal('pending'),
  z.literal('pending_payment'),
  z.literal('confirmed'),
  z.literal('preparing'),
  z.literal('out_for_delivery'),
  z.literal('delivered'),
  z.literal('cancelled'),
  z.literal('rejected'),
]);

const PaymentStatusSchema = z.union([
  z.literal('pending'),
  z.literal('paid'),
  z.literal('failed'),
  z.literal('canceled'),
  z.literal('refunded'),
]);

const MenuItemRefSchema = z.object({
  _id: z.string().min(1, 'Menu item ID required'),
  name: z.string(),
  price: z.number().positive(),
  image: z.string().optional(),
});

const OrderItemSchema = z.object({
  menuItem: MenuItemRefSchema,
  quantity: z.number().int().min(1),
  priceAtOrder: z.number().positive(),
});

const GuestInfoSchema = z.object({
  name: z.string().trim().min(1, 'Name required'),
  phone: z.string().trim().min(10, 'Valid phone required'),
  isGuest: z.literal(true),
});

const AddressDetailsSchema = z.object({
  fullAddress: z.string().trim().min(5, 'Full address required'),
  label: z.string().trim().min(1),
  floor: z.string().optional(),
  instructions: z.string().max(150).optional(),
});

const AppliedDealSchema = z.object({
  dealId: z.string(),
  code: z.string(),
  title: z.string(),
  discountType: z.union([z.literal('percentage'), z.literal('fixed')]),
  discountValue: z.number().positive(),
  maxDiscountAmount: z.number().optional(),
  appliedDiscount: z.number().min(0),
});

const AreaSchema = z.object({
  _id: z.string(),
  name: z.string(),
});

const DeliveryZoneSchema = z.object({
  _id: z.string(),
  deliveryFee: z.number().min(0),
  minOrderAmount: z.number().min(0),
  estimatedTime: z.string().optional(),
});

const RiderSchema = z.object({
  _id: z.string(),
  name: z.string(),
  phone: z.string(),
});

// === Main Order Schema (for responses) ===
export const OrderSchema = z.object({
  _id: z.string(),
  shortId: z.string(),
  items: z.array(OrderItemSchema),
  customer: z
    .object({
      _id: z.string(),
      name: z.string(),
      phone: z.string(),
    })
    .optional(),
  guestInfo: GuestInfoSchema.optional(),
  addressDetails: AddressDetailsSchema,
  area: AreaSchema,
  deliveryZone: DeliveryZoneSchema,
  totalAmount: z.number().min(0),
  deliveryFee: z.number().min(0),
  discountApplied: z.number().min(0),
  walletUsed: z.number().min(0),
  finalAmount: z.number().min(0),
  paymentMethod: PaymentMethodSchema,
  paymentStatus: PaymentStatusSchema,
  status: OrderStatusSchema,
  bankTransferReference: z.string().optional(),
  paymentIntentId: z.string().optional(),
  receiptUrl: z.string().optional(),
  instructions: z.string().max(300).optional(),
  placedAt: z.string().datetime(),
  estimatedDelivery: z.string(),
  appliedDeal: AppliedDealSchema.nullable().optional(),
  rider: RiderSchema.nullable().optional(),
  confirmedAt: z.string().datetime().optional(),
  preparingAt: z.string().datetime().optional(),
  outForDeliveryAt: z.string().datetime().optional(),
  deliveredAt: z.string().datetime().optional(),
});

// === Create Order Payloads (Request Validation) ===

export const CreateOrderPayloadSchema = z.object({
  items: z
    .array(
      z.object({
        menuItem: z.string().min(1, 'Menu item ID required'),
        quantity: z.number().int().min(1, 'Quantity must be at least 1'),
      })
    )
    .min(1, 'At least one item required'),
  addressId: z.string().min(1, 'Address ID required'),
  paymentMethod: PaymentMethodSchema.optional(), // defaults to 'cod' on backend
  promoCode: z.string().trim().optional(),
  useWallet: z.boolean().optional(),
  instructions: z.string().trim().max(300).optional(),
});

export const CreateGuestOrderPayloadSchema = z.object({
  items: z
    .array(
      z.object({
        menuItem: z.string().min(1, 'Menu item ID required'),
        quantity: z.number().int().min(1, 'Quantity must be at least 1'),
      })
    )
    .min(1, 'At least one item required'),
  guestAddress: z.object({
    fullAddress: z.string().trim().min(5, 'Full address required'),
    areaId: z.string().min(1, 'Area ID required'),
    label: z.string().trim().optional(),
    floor: z.string().optional(),
    instructions: z.string().max(150).optional(),
  }),
  name: z.string().trim().min(1, 'Name required'),
  phone: z.string().trim().min(10, 'Valid phone number required'),
  paymentMethod: PaymentMethodSchema.optional(),
  promoCode: z.string().trim().optional(),
  instructions: z.string().trim().max(300).optional(),
});

// === Response Schemas ===

export const CreateOrderResponseSchema = z.object({
  success: z.literal(true),
  order: OrderSchema,
  walletUsed: z.number().min(0),
  clientSecret: z.string().optional(),
  bankDetails: z
    .object({
      bankName: z.string(),
      accountTitle: z.string(),
      accountNumber: z.string(),
      iban: z.string(),
      branch: z.string(),
      amount: z.number().positive(),
      reference: z.string(),
    })
    .optional(),
});

export const OrdersResponseSchema = z.object({
  success: z.literal(true),
  orders: z.array(OrderSchema),
});

export const OrderResponseSchema = z.object({
  success: z.literal(true),
  order: OrderSchema,
});

export const GenericSuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  order: OrderSchema.optional(),
});

// === Types inferred from schemas (for use in code) ===
export type CreateOrderPayload = z.infer<typeof CreateOrderPayloadSchema>;
export type CreateGuestOrderPayload = z.infer<typeof CreateGuestOrderPayloadSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type CreateOrderResponse = z.infer<typeof CreateOrderResponseSchema>;
export type OrdersResponse = z.infer<typeof OrdersResponseSchema>;
export type OrderResponse = z.infer<typeof OrderResponseSchema>;
export type GenericSuccessResponse = z.infer<typeof GenericSuccessResponseSchema>;