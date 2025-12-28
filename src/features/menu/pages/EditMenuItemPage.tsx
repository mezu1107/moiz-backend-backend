// src/features/menu/pages/admin/EditMenuItemPage.tsx
// PRODUCTION-READY — FULLY RESPONSIVE (320px → 4K)
// Mobile-first admin form, fluid layout, touch-friendly, accessible
// Optimized image preview, scrollable areas list, responsive grid

import { useEffect, useState, ChangeEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Trash2, Globe, Upload } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import {
  useMenuItem,
  useUpdateMenuItem,
  useAvailableAreas,
} from "@/features/menu/hooks/useMenuApi";
import { CATEGORY_OPTIONS, type MenuCategory } from "@/features/menu/types/menu.types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  price: z.coerce.number().min(1, "Price must be at least Rs. 1"),
  category: z.enum(["breakfast", "lunch", "dinner", "desserts", "beverages"]),
  isVeg: z.boolean(),
  isSpicy: z.boolean(),
  isAvailable: z.boolean(),
  availableInAreas: z.array(z.string()),
  image: z.instanceof(File).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditMenuItemPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: item,
    isLoading: itemLoading,
    isError: itemError,
  } = useMenuItem(id!);

  const {
    data: areasData,
    isLoading: areasLoading,
    isError: areasError,
  } = useAvailableAreas();

  const updateMutation = useUpdateMenuItem();

  const areas = areasData?.areas || [];

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      category: "dinner" as MenuCategory,
      isVeg: false,
      isSpicy: false,
      isAvailable: true,
      availableInAreas: [],
    },
  });

  // Sync form with loaded item
  useEffect(() => {
    if (item) {
      form.reset({
        name: item.name || "",
        description: item.description || "",
        price: item.price || 0,
        category: item.category || "dinner",
        isVeg: !!item.isVeg,
        isSpicy: !!item.isSpicy,
        isAvailable: item.isAvailable ?? true,
        availableInAreas: item.availableInAreas || [],
      });
      setPreviewUrl(item.image || null);
    }
  }, [item, form]);

  const selectedAreas = form.watch("availableInAreas");
  const isSubmitting = updateMutation.isPending;

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    form.setValue("image", file, { shouldValidate: true });
    setPreviewUrl(URL.createObjectURL(file));
    toast.success("New image selected");
  };

  const removeNewImage = () => {
    form.setValue("image", undefined);
    setPreviewUrl(item?.image || null);
    toast.success("New image removed – current image retained");
  };

  const onSubmit = (values: FormValues) => {
    if (!id || !item) return;

    updateMutation.mutate(
      {
        id,
        data: {
          name: values.name.trim(),
          description: values.description?.trim(),
          price: values.price,
          category: values.category,
          isVeg: values.isVeg,
          isSpicy: values.isSpicy,
          isAvailable: values.isAvailable,
          availableInAreas: values.availableInAreas,
          image: values.image,
        },
      },
      {
        onSuccess: () => {
          toast.success("Menu item updated successfully!");
          navigate("/admin/menu");
        },
        onError: () => {
          toast.error("Failed to update item. Please try again.");
        },
      }
    );
  };

  // Loading state
  if (itemLoading || areasLoading) {
    return (
      <div className="flex h-screen items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Loading menu item...</p>
        </div>
      </div>
    );
  }

  // Error or not found
  if (itemError || areasError || !item) {
    return (
      <main className="container mx-auto px-4 py-12 text-center md:py-20">
        <h2 className="text-3xl font-bold text-destructive md:text-4xl">
          {itemError || !item ? "Item not found" : "Failed to load areas"}
        </h2>
        <p className="mt-4 text-base text-muted-foreground md:text-lg">
          The menu item could not be loaded. It may have been deleted or there was a network issue.
        </p>
        <Button variant="outline" className="mt-8" onClick={() => navigate("/admin/menu")}>
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back to Menu
        </Button>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 md:py-10 lg:py-12">
      {/* Header */}
      <header className="mb-8 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin/menu")}
          aria-label="Back to menu list"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-3xl font-bold md:text-4xl lg:text-5xl">Edit Menu Item</h1>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Image Card – full width on mobile, sidebar on lg+ */}
            <Card className="order-1 lg:order-2 lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl">Item Image</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="relative aspect-square overflow-hidden rounded-xl border-2 border-dashed border-muted/30 bg-muted/20">
                  {previewUrl ? (
                    <>
                      <img
                        src={previewUrl}
                        alt="Menu item preview"
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute right-3 top-3 shadow-lg"
                        onClick={removeNewImage}
                        aria-label="Remove selected image"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                      <Upload className="mb-4 h-12 w-12 opacity-50" />
                      <p className="text-sm">No image uploaded</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="image-upload" className="cursor-pointer">
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="cursor-pointer"
                      disabled={isSubmitting}
                    />
                  </Label>
                  <FormDescription className="text-xs md:text-sm">
                    Recommended: 800×800px • JPG, PNG, WebP • Max 5MB
                  </FormDescription>
                </div>
              </CardContent>
            </Card>

            {/* Details Card – full width on mobile, main column on lg+ */}
            <Card className="order-2 lg:order-1 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl">Item Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Chicken Biryani" {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (Rs.) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            placeholder="299"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Rich, aromatic rice layered with tender chicken..."
                          rows={4}
                          {...field}
                          value={field.value ?? ""}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
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
                  )}
                />

                <div className="flex flex-wrap gap-8">
                  {(["isVeg", "isSpicy", "isAvailable"] as const).map((key) => (
                    <FormField
                      key={key}
                      control={form.control}
                      name={key}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            {key === "isVeg" ? "Vegetarian" : key === "isSpicy" ? "Spicy" : "Available for Order"}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

                <Separator />

                <FormField
                  control={form.control}
                  name="availableInAreas"
                  render={() => (
                    <FormItem>
                      <FormLabel>Available in Delivery Areas</FormLabel>
                      <FormDescription>
                        Leave empty for availability in <strong>all active areas</strong>
                      </FormDescription>

                      <ScrollArea className="mt-3 h-64 rounded-lg border bg-muted/20 p-4 md:h-72">
                        <div className="space-y-3">
                          {areas.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                              No active delivery areas found
                            </p>
                          ) : (
                            areas.map((area) => (
                              <div
                                key={area._id}
                                className="flex items-center space-x-3 rounded-lg p-3 hover:bg-muted/50 transition-colors"
                              >
                                <Checkbox
                                  checked={selectedAreas.includes(area._id)}
                                  onCheckedChange={(checked) => {
                                    const current = form.getValues("availableInAreas");
                                    const updated = checked
                                      ? [...current, area._id]
                                      : current.filter((id) => id !== area._id);
                                    form.setValue("availableInAreas", updated, { shouldValidate: true });
                                  }}
                                  disabled={isSubmitting}
                                />
                                <div className="flex-1">
                                  <Label className="font-medium cursor-pointer">{area.name}</Label>
                                  <p className="text-xs text-muted-foreground">{area.city}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>

                      <div className="mt-5 flex justify-center">
                        {selectedAreas.length === 0 ? (
                          <Badge variant="default" className="gap-2 px-6 py-2 text-sm">
                            <Globe className="h-4 w-4" />
                            Available Everywhere
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="px-5 py-2 text-sm">
                            {selectedAreas.length} area{selectedAreas.length > 1 ? "s" : ""} selected
                          </Badge>
                        )}
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4 border-t pt-8 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => navigate("/admin/menu")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </main>
  );
}