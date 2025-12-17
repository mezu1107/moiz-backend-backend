// src/features/kitchen/components/KitchenOrderCard.tsx

import {
  KitchenOrderPopulated,
  KitchenItemPopulated,
} from '../types/types'; 
import { cn } from '@/lib/utils';
import { getTimeAgo, formatTime } from '@/lib/utils';
import { AlertCircle, Clock, PackageCheck } from 'lucide-react';

interface Props {
  order: KitchenOrderPopulated;
  onStartItem: (kitchenOrderId: string, itemId: string) => void;
  onCompleteItem: (kitchenOrderId: string, itemId: string) => void;
  onCompleteOrder: (kitchenOrderId: string) => void; // ← NEW
}

export default function KitchenOrderCard({
  order,
  onStartItem,
  onCompleteItem,
  onCompleteOrder,
}: Props) {
  const STATUS_CONFIG = {
    new: {
      border: 'border-orange-500',
      bg: 'bg-orange-50/90',
      badge: 'bg-orange-500 text-white',
      accent: 'from-orange-400 to-amber-500',
    },
    preparing: {
      border: 'border-blue-500',
      bg: 'bg-blue-50/90',
      badge: 'bg-blue-500 text-white',
      accent: 'from-blue-400 to-cyan-500',
    },
    ready: {
      border: 'border-green-500',
      bg: 'bg-green-50/90',
      badge: 'bg-green-500 text-white',
      accent: 'from-green-400 to-emerald-500',
    },
    completed: {
      border: 'border-gray-500',
      bg: 'bg-gray-100/90',
      badge: 'bg-gray-600 text-white',
      accent: 'from-gray-500 to-gray-600',
    },
  } as const;

  const config = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.new;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl shadow-2xl border-8 transition-all duration-700 hover:scale-[1.02]',
        config.border,
        config.bg,
        'backdrop-blur-sm bg-white/95'
      )}
    >
      <div className={cn('absolute inset-x-0 top-0 h-3 bg-gradient-to-r', config.accent)} />

      <div className="p-8 md:p-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
          <div className="flex-1">
            <h2 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tight">
              {order.shortId}
            </h2>
            <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-2">
              {order.customerName}
            </p>
            <div className="flex items-center gap-3 mt-3 text-lg text-gray-600">
              <Clock className="w-6 h-6" />
              <span className="font-medium">
                {getTimeAgo(order.placedAt)} • {formatTime(order.placedAt)}
              </span>
            </div>
          </div>

          <div className="text-right space-y-4">
            <span
              className={cn(
                'inline-block px-8 py-4 rounded-2xl text-2xl md:text-3xl font-black shadow-lg',
                config.badge
              )}
            >
              {order.status.toUpperCase()}
            </span>

            {order.instructions && (
              <div className="mt-4 p-4 bg-red-100 border-4 border-red-400 rounded-2xl">
                <p className="text-xl md:text-2xl font-bold text-red-700 flex items-center gap-3 justify-end">
                  <AlertCircle className="w-10 h-10 flex-shrink-0" />
                  {order.instructions}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-6">
          {order.items.map((item: KitchenItemPopulated) => {
            const ITEM_STATUS = {
              pending: {
                border: 'border-gray-400',
                bg: 'bg-gray-100',
                button: 'bg-orange-500 hover:bg-orange-600',
                buttonText: 'START COOKING',
              },
              preparing: {
                border: 'border-blue-400',
                bg: 'bg-blue-100',
                button: 'bg-blue-600 hover:bg-blue-700',
                buttonText: 'MARK AS READY',
              },
              ready: {
                border: 'border-green-400',
                bg: 'bg-green-100',
                button: 'bg-green-600',
                buttonText: 'COMPLETED',
              },
            } as const;

            const itemStatus = ITEM_STATUS[item.status];

            return (
              <div
                key={item._id}
                className={cn(
                  'flex flex-col sm:flex-row items-center justify-between p-6 rounded-2xl border-4 transition-all duration-500',
                  itemStatus.border,
                  itemStatus.bg
                )}
              >
                <div className="flex items-center gap-6 mb-4 sm:mb-0">
                  {item.menuItem?.image && (
                    <img
                      src={item.menuItem.image}
                      alt={item.name}
                      className="w-28 h-28 md:w-32 md:h-32 rounded-2xl object-cover shadow-xl ring-4 ring-white/50"
                    />
                  )}
                  <div>
                    <h4 className="text-3xl md:text-4xl font-black text-gray-900">
                      {item.name}
                    </h4>
                    <p className="text-4xl md:text-5xl font-black text-orange-600 mt-2">
                      × {item.quantity}
                    </p>
                  </div>
                </div>

                <div>
                  {item.status === 'pending' && (
                    <button
                      onClick={() => onStartItem(order._id, item._id)}
                      className={cn(
                        'px-12 py-6 md:px-16 md:py-8 rounded-3xl text-3xl md:text-4xl font-black text-white shadow-2xl transition transform hover:scale-105 active:scale-95',
                        itemStatus.button
                      )}
                    >
                      {itemStatus.buttonText}
                    </button>
                  )}

                  {item.status === 'preparing' && (
                    <button
                      onClick={() => onCompleteItem(order._id, item._id)}
                      className={cn(
                        'px-12 py-6 md:px-16 md:py-8 rounded-3xl text-3xl md:text-4xl font-black text-white shadow-2xl transition transform hover:scale-105 active:scale-95',
                        itemStatus.button
                      )}
                    >
                      {itemStatus.buttonText}
                    </button>
                  )}

                  {item.status === 'ready' && (
                    <div className="px-12 py-6 md:px-16 md:py-8 rounded-3xl text-3xl md:text-4xl font-black text-white text-center shadow-xl bg-gray-600">
                      {itemStatus.buttonText}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer with Payment + Complete Button */}
        <div className="mt-10 pt-8 border-t-4 border-gray-300">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-8">
            <div className="text-center sm:text-left">
              <span className="text-2xl md:text-3xl font-medium text-gray-700 uppercase">
                {order.order.paymentMethod} PAYMENT
              </span>
              <div className="text-5xl md:text-6xl font-black text-gray-900 mt-2">
                Rs. {order.order.finalAmount.toLocaleString()}
              </div>
            </div>

            {/* MARK AS COMPLETED BUTTON – Only for 'ready' orders */}
            {order.status === 'ready' && (
              <button
                onClick={() => onCompleteOrder(order._id)}
                className="flex items-center gap-5 px-14 py-8 rounded-3xl text-4xl md:text-5xl font-black text-white bg-purple-600 hover:bg-purple-700 shadow-2xl transition-all transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-purple-300"
              >
                <PackageCheck className="w-14 h-14" />
                MARK AS COMPLETED
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}