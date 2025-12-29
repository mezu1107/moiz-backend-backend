'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useIsMobile } from '@/hooks/use-mobile';
import { Address, AddressFormData, addressSchema, ADDRESS_LABELS } from '../types/address.types';
import { useAreasByCity, useCreateAddress, useUpdateAddress } from '../hooks/useAddresses';

interface Props {
  open: boolean;
  onClose: () => void;
  address?: Address | null;
}

const CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad'] as const;

export const AddressFormModal = ({ open, onClose, address }: Props) => {
  const isMobile = useIsMobile();

  const [city, setCity] = useState<string>(address?.area.city || 'Lahore');
  const [selectedAreaId, setSelectedAreaId] = useState<string>(address?.area._id || '');

  const { data: areas = [], isLoading: loadingAreas } = useAreasByCity(city);

  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: address?.label || 'Home',
      fullAddress: address?.fullAddress || '',
      areaId: address?.area._id || '',
      instructions: address?.instructions || '',
      isDefault: address?.isDefault || false,
    },
  });

  const { control, handleSubmit, setValue, watch, formState: { errors } } = form;

  useEffect(() => {
    if (open && address) {
      setCity(address.area.city);
      setSelectedAreaId(address.area._id);
      form.reset({
        label: address.label || 'Home',
        fullAddress: address.fullAddress || '',
        areaId: address.area._id,
        instructions: address.instructions || '',
        isDefault: address.isDefault || false,
      });
    } else if (open && !address) {
      setCity('Lahore');
      setSelectedAreaId('');
      form.reset({
        label: 'Home',
        fullAddress: '',
        areaId: '',
        instructions: '',
        isDefault: false,
      });
    }
  }, [open, address, form]);

  useEffect(() => {
    setValue('areaId', selectedAreaId);
  }, [selectedAreaId, setValue]);

  const create = useCreateAddress();
  const update = useUpdateAddress();

  const onSubmit = handleSubmit(async (data) => {
    if (!data.areaId) return;
    try {
      if (address) {
        await update.mutateAsync({ id: address._id, data });
      } else {
        await create.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      // Handle error if needed
    }
  });

  const isPending = create.isPending || update.isPending;

  const Content = (
    <div className="overflow-y-auto max-h-[70vh] px-2"> {/* <-- SCROLLER */}
      <form onSubmit={onSubmit} className="space-y-5">
        {/* Label */}
        <div className="space-y-2">
          <Label>Label *</Label>
          <Controller
            control={control}
            name="label"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADDRESS_LABELS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Full Address */}
        <div className="space-y-2">
          <Label>Full Address *</Label>
          <Textarea
            placeholder="House no, street, apartment, landmark..."
            rows={3}
            {...form.register('fullAddress')}
          />
          <p className="text-xs text-muted-foreground">
            {(watch('fullAddress')?.length || 0)}/200
          </p>
          {errors.fullAddress && (
            <p className="text-sm text-destructive">{errors.fullAddress.message}</p>
          )}
        </div>

        {/* City */}
        <div className="space-y-2">
          <Label>City *</Label>
          <Select value={city} onValueChange={(v) => { setCity(v); setSelectedAreaId(''); }}>
            <SelectTrigger>
              <SelectValue placeholder="Select city" />
            </SelectTrigger>
            <SelectContent>
              {CITIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Area */}
        <div className="space-y-2">
          <Label>Area *</Label>
          <Select
            value={selectedAreaId}
            onValueChange={setSelectedAreaId}
            disabled={loadingAreas || !city}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  loadingAreas
                    ? 'Loading areas...'
                    : !city
                    ? 'Select city first'
                    : 'Choose your area'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {areas.map((area) => (
                <SelectItem key={area._id} value={area._id}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.areaId && (
            <p className="text-sm text-destructive mt-1">{errors.areaId.message}</p>
          )}
        </div>

        {/* Delivery Instructions */}
        <div className="space-y-2">
          <Label>Delivery Instructions (optional)</Label>
          <Textarea
            placeholder="Gate code, floor, bell name..."
            rows={2}
            {...form.register('instructions')}
          />
        </div>

        {/* Default Address */}
        <div className="flex items-center space-x-3">
          <Controller
            control={control}
            name="isDefault"
            render={({ field }) => (
              <Checkbox
                id="default"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Label htmlFor="default" className="cursor-pointer">
            Set as default address
          </Label>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          disabled={isPending || !selectedAreaId}
        >
          {isPending ? <>Saving...</> : <>{address ? 'Update' : 'Save'} Address</>}
        </Button>
      </form>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{address ? 'Edit' : 'Add New'} Address</DrawerTitle>
          </DrawerHeader>
          {Content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{address ? 'Edit' : 'Add New'} Address</DialogTitle>
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  );
};