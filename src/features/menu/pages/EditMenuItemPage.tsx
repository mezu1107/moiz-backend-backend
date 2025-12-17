// src/features/menu/pages/admin/EditMenuItemPage.tsx
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
    data: itemData,
    isLoading: itemLoading,
    isError: itemError,
  } = useMenuItem(id);

  const {
    data: areasData,
    isLoading: areasLoading,
    isError: areasError,
  } = useAvailableAreas();

  const updateMutation = useUpdateMenuItem();

  const item = itemData?.item;
  const areas = areasData?.areas || [];

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      category: "dinner",
      isVeg: false,
      isSpicy: false,
      isAvailable: true,
      availableInAreas: [],
    },
  });

  // Sync form with fetched item
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
      setPreviewUrl(item.image);
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
    toast.success("New image removed – will keep current image");
  };

  const onSubmit = (values: FormValues) => {
    if (!id) return;

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
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading menu item...</p>
        </div>
      </div>
    );
  }

  // Error or not found
  if (itemError || areasError || !item) {
    return (
      <div className="container max-w-2xl mx-auto py-20 text-center">
        <h2 className="text-3xl font-bold text-destructive mb-4">
          {itemError || !item ? "Item not found" : "Failed to load areas"}
        </h2>
        <p className="text-muted-foreground mb-8">
          The menu item could not be loaded. It may have been deleted or there was a network issue.
        </p>
        <Button variant="outline" onClick={() => navigate("/admin/menu")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Menu
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-10 px-4">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin/menu")}
          aria-label="Back to menu list"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-4xl font-bold">Edit Menu Item</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Image Section */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Item Image</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="relative aspect-square rounded-xl overflow-hidden bg-muted/40 border-2 border-dashed border-muted-foreground/25">
                  {previewUrl ? (
                    <>
                      <img
                        src={previewUrl}
                        alt="Menu item preview"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-4 right-4 shadow-lg"
                        onClick={removeNewImage}
                        aria-label="Remove new image"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                      <Upload className="h-12 w-12 mb-3 opacity-50" />
                      <p>No image</p>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="image-upload" className="cursor-pointer">
                    <div className="flex flex-col gap-2">
                      <Input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="cursor-pointer"
                        disabled={isSubmitting}
                      />
                      <FormDescription>
                        Recommended: 800×800px • JPG, PNG, WebP • Max 5MB
                      </FormDescription>
                    </div>
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Details Section */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Item Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <ScrollArea className="h-64 w-full rounded-lg border bg-muted/20 p-4 mt-2">
                        <div className="space-y-3">
                          {areas.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8 text-sm">
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
                                <div>
                                  <Label className="font-medium cursor-pointer">{area.name}</Label>
                                  <p className="text-xs text-muted-foreground">{area.city}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>

                      <div className="mt-4 flex justify-center">
                        {selectedAreas.length === 0 ? (
                          <Badge variant="default" className="gap-2 py-2 px-6 text-sm">
                            <Globe className="h-4 w-4" />
                            Available Everywhere
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-sm">
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
          <div className="flex justify-end gap-4 pt-8 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/admin/menu")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}