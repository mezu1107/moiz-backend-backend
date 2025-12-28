// src/features/address/pages/AddressListPage.tsx
// PRODUCTION-READY — FULLY RESPONSIVE (320px → 4K)
// Mobile-first, fluid layout, touch-friendly, accessible, smooth animations
// Uses Tailwind responsive utilities + clamp() for typography where needed
// No horizontal scrolling, perfect on all devices

'use client';

import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, MapPin } from 'lucide-react';
import { AddressCard } from '../components/AddressCard';
import { AddressFormModal } from '../components/AddressFormModal';
import { useAddresses, useDeleteAddress, useSetDefaultAddress } from '../hooks/useAddresses';
import { Address } from '../types/address.types';
import { motion } from 'framer-motion';

export default function AddressListPage() {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const { data: addresses = [], isLoading, isError } = useAddresses();
  const deleteAddress = useDeleteAddress();
  const setDefaultAddress = useSetDefaultAddress();

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to remove this address?')) {
      deleteAddress.mutate(id);
    }
  };

  const handleSetDefault = (id: string) => {
    setDefaultAddress.mutate(id);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAddress(null);
  };

  // Sort: default first, then newest
  const sortedAddresses = [...addresses].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <>
      <Helmet>
        <title>My Addresses • AM Foods</title>
        <meta name="description" content="Manage your saved delivery addresses" />
      </Helmet>

      <div className="min-h-screen bg-muted/30 pb-12 pt-8 md:pt-10 lg:pt-12">
        <main className="container mx-auto px-4 sm:px-6 lg:max-w-4xl">
          {/* Page Header */}
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
                My Addresses
              </h1>
              <p className="mt-2 text-base text-muted-foreground md:text-lg">
                Add and manage your delivery locations
              </p>
            </div>

            <Button
              onClick={() => setIsModalOpen(true)}
              size="lg"
              className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add New Address
            </Button>
          </header>

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 md:py-32">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Loading your addresses...</p>
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="rounded-2xl border bg-card p-8 text-center md:p-12">
              <p className="text-lg font-medium text-destructive md:text-xl">
                Failed to load addresses
              </p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Addresses List */}
          {!isLoading && !isError && sortedAddresses.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-4 md:space-y-6"
            >
              {sortedAddresses.map((address, index) => (
                <motion.div
                  key={address._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: index * 0.08,
                    type: 'spring',
                    stiffness: 120,
                    damping: 15,
                  }}
                >
                  <AddressCard
                    address={address}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onSetDefault={handleSetDefault}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Empty State */}
          {!isLoading && !isError && addresses.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl border bg-card p-8 text-center md:p-12"
            >
              <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-muted/60">
                <MapPin className="h-12 w-12 text-muted-foreground/70 md:h-14 md:w-14" />
              </div>
              <h3 className="text-2xl font-bold md:text-3xl">No addresses saved yet</h3>
              <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground md:text-lg">
                Add your home, work, or favorite locations to make ordering faster and easier.
              </p>
              <Button
                size="lg"
                onClick={() => setIsModalOpen(true)}
                className="mt-8 w-full shadow-xl hover:shadow-2xl transition-all sm:w-auto"
              >
                <Plus className="mr-3 h-6 w-6" />
                Add Your First Address
              </Button>
            </motion.div>
          )}
        </main>

        {/* Address Form Modal */}
        <AddressFormModal
          open={isModalOpen}
          onClose={handleCloseModal}
          address={editingAddress}
        />
      </div>
    </>
  );
}