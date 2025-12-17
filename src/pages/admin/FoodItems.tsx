import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Leaf, Flame } from "lucide-react";
import { mockMenuItems } from "@/lib/mockData";
import type { MenuItem } from "@/lib/mockData";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const FoodItems = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(mockMenuItems);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [formData, setFormData] = useState<Partial<MenuItem>>({
    name: "",
    description: "",
    price: 0,
    category: "breakfast",
    image: "",
    isVeg: false,
    isSpicy: false,
    featured: false,
  });

  const filteredItems =
    categoryFilter === "all"
      ? menuItems
      : menuItems.filter((item) => item.category === categoryFilter);

  const handleSubmit = () => {
    if (editingItem) {
      setMenuItems(
        menuItems.map((item) =>
          item.id === editingItem.id ? { ...item, ...formData } : item
        )
      );
    } else {
      const newItem: MenuItem = {
        id: `item-${Date.now()}`,
        ...(formData as Omit<MenuItem, "id">),
      };
      setMenuItems([...menuItems, newItem]);
    }
    handleCloseDialog();
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData(item);
    setIsDialogOpen(true);
  };

  const handleDelete = (itemId: string) => {
    setMenuItems(menuItems.filter((item) => item.id !== itemId));
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({
      name: "",
      description: "",
      price: 0,
      category: "breakfast",
      image: "",
      isVeg: false,
      isSpicy: false,
      featured: false,
    });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Food Items Management</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage your restaurant menu</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add New Item
        </Button>
      </div>

      {/* Category Filter */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-2">
          {["all", "breakfast", "lunch", "dinner", "desserts", "beverages"].map(
            (category) => (
              <Button
                key={category}
                variant={categoryFilter === category ? "default" : "outline"}
                onClick={() => setCategoryFilter(category)}
                className="capitalize text-xs md:text-sm"
                size="sm"
              >
                {category === "all" ? "All" : category}
              </Button>
            )
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <img
              src={item.image}
              alt={item.name}
              className="h-36 md:h-48 w-full object-cover"
            />
            <CardHeader className="p-3 md:p-6">
              <div className="flex justify-between items-start gap-2">
                <CardTitle className="text-base md:text-lg">{item.name}</CardTitle>
                <div className="flex gap-1">
                  {item.isVeg && <Leaf className="h-4 w-4 text-green-600" />}
                  {item.isSpicy && <Flame className="h-4 w-4 text-red-600" />}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4 line-clamp-2">
                {item.description}
              </p>
              <div className="space-y-2">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <Badge className="text-xs">{item.category}</Badge>
                  {item.featured && <Badge variant="secondary" className="text-xs">Featured</Badge>}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xl md:text-2xl font-bold text-primary">
                    Rs. {item.price}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-3 md:mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs md:text-sm"
                  onClick={() => handleEdit(item)}
                >
                  <Pencil className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 text-xs md:text-sm"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add/Edit Item Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">
              {editingItem ? "Edit Food Item" : "Add New Food Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-sm">Item Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description" className="text-sm">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price" className="text-sm">Price (Rs.)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: Number(e.target.value) })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category" className="text-sm">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      category: value as MenuItem["category"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                    <SelectItem value="desserts">Desserts</SelectItem>
                    <SelectItem value="beverages">Beverages</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="image" className="text-sm">Image URL</Label>
              <Input
                id="image"
                value={formData.image}
                onChange={(e) =>
                  setFormData({ ...formData, image: e.target.value })
                }
              />
            </div>
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="isVeg" className="text-sm">Vegetarian</Label>
                <Switch
                  id="isVeg"
                  checked={formData.isVeg}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isVeg: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isSpicy" className="text-sm">Spicy</Label>
                <Switch
                  id="isSpicy"
                  checked={formData.isSpicy}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isSpicy: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="featured" className="text-sm">Featured Item</Label>
                <Switch
                  id="featured"
                  checked={formData.featured}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, featured: checked })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleCloseDialog} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="w-full sm:w-auto">
              {editingItem ? "Update Item" : "Create Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FoodItems;