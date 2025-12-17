// src/features/menu/components/MenuItemFormModal.tsx
import { useEffect, useState, ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, Loader2, Trash2, Globe } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  useCreateMenuItem,
  useUpdateMenuItem,
  useAvailableAreas,
} from "../hooks/useMenuApi";
import { CATEGORY_OPTIONS, type MenuCategory, type MenuItem } from "../types/menu.types";

const formSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  price: z.coerce.number().min(1),
  category: z.enum(["breakfast", "lunch", "dinner", "desserts", "beverages"]),
  isVeg: z.boolean(),
  isSpicy: z.boolean(),
  availableEverywhere: z.boolean(),
  selectedAreas: z.array(z.string()),
});

type FormData = z.infer<typeof formSchema>;

interface MenuItemFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: MenuItem | null;
  onSuccess?: () => void;
}

export function MenuItemFormModal({
  open,
  onOpenChange,
  editItem,
  onSuccess,
}: MenuItemFormModalProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const createMutation = useCreateMenuItem();
  const updateMutation = useUpdateMenuItem();
  const { data: areasData, isLoading: areasLoading } = useAvailableAreas();

  const areas = areasData?.areas || [];
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isEdit = !!editItem;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 199,
      category: "dinner",
      isVeg: false,
      isSpicy: false,
      availableEverywhere: true,
      selectedAreas: [],
    },
  });

  const availableEverywhere = form.watch("availableEverywhere");

  useEffect(() => {
    if (!open) {
      form.reset();
      setImageFile(null);
      setImagePreview(null);
      return;
    }

    if (editItem) {
      form.reset({
        name: editItem.name,
        description: editItem.description || "",
        price: editItem.price,
        category: editItem.category,
        isVeg: editItem.isVeg,
        isSpicy: editItem.isSpicy,
        availableEverywhere: editItem.availableInAreas.length === 0,
        selectedAreas: editItem.availableInAreas,
      });
      setImagePreview(editItem.image);
    } else {
      form.reset({
        name: "",
        description: "",
        price: 199,
        category: "dinner",
        isVeg: false,
        isSpicy: false,
        availableEverywhere: true,
        selectedAreas: [],
      });
      setImagePreview(null);
    }
    setImageFile(null);
  }, [open, editItem, form]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(editItem?.image || null);
  };

  const onSubmit = async (values: FormData) => {
    const areas = values.availableEverywhere ? [] : values.selectedAreas;

    if (!isEdit && !imageFile) {
      toast.error("Image is required for new items");
      return;
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          id: editItem._id,
          data: {
            name: values.name.trim(),
            description: values.description?.trim(),
            price: values.price,
            category: values.category,
            isVeg: values.isVeg,
            isSpicy: values.isSpicy,
            availableInAreas: areas,
            image: imageFile || undefined,
          },
        });
        toast.success("Item updated successfully!");
      } else {
        await createMutation.mutateAsync({
          name: values.name.trim(),
          description: values.description?.trim(),
          price: values.price,
          category: values.category,
          isVeg: values.isVeg,
          isSpicy: values.isSpicy,
          availableInAreas: areas,
          image: imageFile!,
        });
        toast.success("New item added successfully!");
      }

      onOpenChange(false);
      onSuccess?.();
    } catch {
      // Error already handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-bold">
            {isEdit ? "Edit Menu Item" : "Add New Menu Item"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Image */}
              <div className="space-y-4">
                <FormLabel>
                  Item Image {!isEdit && <span className="text-destructive">*</span>}
                </FormLabel>

                <div className="relative">
                  <div className="aspect-square rounded-xl overflow-hidden border-2 border-dashed border-muted-foreground/30 bg-muted/20">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                        <Upload className="h-12 w-12 mb-3" />
                        <p className="text-sm">Click to upload</p>
                      </div>
                    )}
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={isSubmitting}
                  />

                  {imageFile && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-3 right-3 shadow-lg"
                      onClick={removeImage}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Recommended: 800×800px • Max 5MB
                </p>
              </div>

              {/* Details */}
              <div className="md:col-span-2 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Chicken Biryani" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="price" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (Rs.) *</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" placeholder="299" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Aromatic basmati rice with tender chicken..."
                        {...field}
                        value={field.value ?? ""}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-3">
                              {opt.icon}
                              <span>{opt.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="flex gap-10">
                  <FormField control={form.control} name="isVeg" render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Vegetarian</FormLabel>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="isSpicy" render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Spicy</FormLabel>
                    </FormItem>
                  )} />
                </div>
              </div>
            </div>

            {/* Delivery Areas */}
            <div className="mt-8 space-y-4 border-t pt-6">
              <FormField
                control={form.control}
                name="availableEverywhere"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
                    </FormControl>
                    <div>
                      <FormLabel className="font-medium">Available in all active areas</FormLabel>
                      <FormDescription>Recommended for most items</FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {!availableEverywhere && (
                <FormField
                  control={form.control}
                  name="selectedAreas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select specific delivery areas</FormLabel>
                      <ScrollArea className="h-64 rounded-lg border bg-muted/20 p-4">
                        {areasLoading ? (
                          <p className="text-center text-muted-foreground py-8">Loading areas...</p>
                        ) : areas.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8">No active areas</p>
                        ) : (
                          <div className="space-y-3">
                            {areas.map((area) => (
                              <div key={area._id} className="flex items-center space-x-3">
                                <Checkbox
                                  checked={field.value.includes(area._id)}
                                  onCheckedChange={(checked) => {
                                    field.onChange(
                                      checked
                                        ? [...field.value, area._id]
                                        : field.value.filter((id) => id !== area._id)
                                    );
                                  }}
                                  disabled={isSubmitting}
                                />
                                <Label className="cursor-pointer">
                                  {area.name} <span className="text-muted-foreground">({area.city})</span>
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>

                      <div className="mt-3">
                        <Badge variant="secondary">
                          {field.value.length} area{field.value.length !== 1 ? "s" : ""} selected
                        </Badge>
                      </div>
                    </FormItem>
                  )}
                />
              )}

              {availableEverywhere && (
                <div className="flex justify-center">
                  <Badge variant="default" className="gap-2 py-2 px-6">
                    <Globe className="h-4 w-4" />
                    Available Everywhere
                  </Badge>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Update Item" : "Create Item"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}