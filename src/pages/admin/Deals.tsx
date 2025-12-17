import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { mockDeals } from "@/lib/mockData";
import type { Deal } from "@/lib/mockData";

const Deals = () => {
  const [deals, setDeals] = useState<Deal[]>(mockDeals);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [formData, setFormData] = useState<Partial<Deal>>({
    name: "",
    description: "",
    price: 0,
    discount: 0,
    image: "",
    validUntil: "",
    isActive: true,
  });

  const handleSubmit = () => {
    if (editingDeal) {
      setDeals(
        deals.map((deal) =>
          deal.id === editingDeal.id ? { ...deal, ...formData } : deal
        )
      );
    } else {
      const newDeal: Deal = {
        id: `deal-${Date.now()}`,
        ...(formData as Omit<Deal, "id">),
      };
      setDeals([...deals, newDeal]);
    }
    handleCloseDialog();
  };

  const handleEdit = (deal: Deal) => {
    setEditingDeal(deal);
    setFormData(deal);
    setIsDialogOpen(true);
  };

  const handleDelete = (dealId: string) => {
    setDeals(deals.filter((deal) => deal.id !== dealId));
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingDeal(null);
    setFormData({
      name: "",
      description: "",
      price: 0,
      discount: 0,
      image: "",
      validUntil: "",
      isActive: true,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Deals Management</h1>
          <p className="text-muted-foreground">
            Create and manage special offers
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Deal
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {deals.map((deal) => (
          <Card key={deal.id} className="overflow-hidden">
            <img
              src={deal.image}
              alt={deal.name}
              className="h-48 w-full object-cover"
            />
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{deal.name}</CardTitle>
                <Badge variant={deal.isActive ? "default" : "secondary"}>
                  {deal.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {deal.description}
              </p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Original Price:</span>
                  <span className="font-medium">Rs. {deal.price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Discount:</span>
                  <span className="font-medium text-green-600">
                    {deal.discount}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Final Price:</span>
                  <span className="font-bold text-primary">
                    Rs. {deal.price - (deal.price * deal.discount) / 100}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Valid Until:</span>
                  <span>{new Date(deal.validUntil).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEdit(deal)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDelete(deal.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add/Edit Deal Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingDeal ? "Edit Deal" : "Add New Deal"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Deal Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
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
                <Label htmlFor="price">Price (Rs.)</Label>
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
                <Label htmlFor="discount">Discount (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  value={formData.discount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discount: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="image">Image URL</Label>
              <Input
                id="image"
                value={formData.image}
                onChange={(e) =>
                  setFormData({ ...formData, image: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="validUntil">Valid Until</Label>
              <Input
                id="validUntil"
                type="date"
                value={formData.validUntil}
                onChange={(e) =>
                  setFormData({ ...formData, validUntil: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingDeal ? "Update Deal" : "Create Deal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Deals;
