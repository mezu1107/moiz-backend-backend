// src/features/menu/components/AdminMenuTable.tsx
import { useState } from 'react';
import {
  Pencil,
  Trash2,
  MoreHorizontal,
  Globe,
  MapPin,
  CheckCircle2,
  XCircle,
  Package,
  Plus,
  Loader2,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

import { useToggleMenuAvailability, useDeleteMenuItem, useAvailableAreas } from '../hooks/useMenuApi';
import { CATEGORY_LABELS, type MenuItem } from '../types/menu.types';

interface AdminMenuTableProps {
  items: MenuItem[];
  isLoading: boolean;
  onEdit: (item: MenuItem) => void;
}

export function AdminMenuTable({ items, isLoading, onEdit }: AdminMenuTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletingItemName, setDeletingItemName] = useState<string>('');

  const toggleMutation = useToggleMenuAvailability();
  const deleteMutation = useDeleteMenuItem();
  const { data: areasData, isLoading: areasLoading } = useAvailableAreas();

  const areaNameMap = new Map<string, string>();
  if (!areasLoading && areasData?.areas) {
    areasData.areas.forEach((area) => {
      areaNameMap.set(area._id, area.name);
    });
  }

  const handleToggle = (id: string, current: boolean) => {
    toggleMutation.mutate({ id, isAvailable: !current });
  };

  const openDeleteDialog = (item: MenuItem) => {
    setDeleteId(item._id);
    setDeletingItemName(item.name);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId, {
        onSuccess: () => {
          setDeleteId(null);
          setDeletingItemName('');
        },
      });
    }
  };

  // Loading State - Full Table Skeleton
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <div className="p-6 space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-16" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // Empty State
  if (items.length === 0) {
    return (
      <Card className="p-16 text-center">
        <div className="mx-auto max-w-md">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-semibold mb-2">No menu items yet</h3>
          <p className="text-muted-foreground mb-8">
            Start building your menu by adding your first delicious item!
          </p>
          <Button onClick={() => document.getElementById('add-menu-button')?.click()}>
            <Plus className="mr-2 h-5 w-5" />
            Add Your First Item
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-20">Image</TableHead>
                <TableHead>Name & Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-center">Diet</TableHead>
                <TableHead className="text-center">Spice</TableHead>
                <TableHead className="min-w-52">Available In</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-12 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const availableAreas = item.availableInAreas || [];
                const isEverywhere = availableAreas.length === 0;
                const displayedAreas = availableAreas.slice(0, 4);
                const hasMore = availableAreas.length > 4;

                return (
                  <TableRow
                    key={item._id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell>
                      <div className="relative">
                        <img
                          src={item.image || '/placeholder.svg'}
                          alt={item.name}
                          className="h-14 w-14 rounded-lg object-cover border border-border shadow-sm"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.svg';
                          }}
                          loading="lazy"
                        />
                      </div>
                    </TableCell>

                    <TableCell className="max-w-xs">
                      <div className="font-medium truncate" title={item.name}>
                        {item.name}
                      </div>
                      {item.description && (
                        <p
                          className="text-sm text-muted-foreground mt-1 line-clamp-2"
                          title={item.description}
                        >
                          {item.description}
                        </p>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {CATEGORY_LABELS[item.category] || item.category}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right font-semibold tabular-nums">
                      Rs. {item.price.toLocaleString()}
                    </TableCell>

                    <TableCell className="text-center">
                      {item.isVeg ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Veg
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Non-Veg
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      {item.isSpicy ? (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
                          Spicy
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Mild
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      {areasLoading ? (
                        <Badge variant="secondary" className="text-xs animate-pulse">
                          Loading...
                        </Badge>
                      ) : isEverywhere ? (
                        <Badge variant="default" className="gap-1.5">
                          <Globe className="h-3.5 w-3.5" />
                          Available Everywhere
                        </Badge>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {displayedAreas.map((areaId) => {
                            const name = areaNameMap.get(areaId) || 'Unknown Area';
                            return (
                              <Badge key={areaId} variant="outline" className="text-xs gap-1">
                                <MapPin className="h-3 w-3" />
                                {name}
                              </Badge>
                            );
                          })}
                          {hasMore && (
                            <Badge variant="outline" className="text-xs">
                              +{availableAreas.length - 4} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      <Switch
                        checked={item.isAvailable}
                        onCheckedChange={() => handleToggle(item._id, item.isAvailable)}
                        disabled={toggleMutation.isPending}
                        aria-label={`Toggle availability for ${item.name}`}
                      />
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-lg hover:bg-muted"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => onEdit(item)}
                            className="cursor-pointer"
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit Item
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(item)}
                            className="text-destructive focus:text-destructive cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Item
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Enhanced Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">
              Permanently delete "{deletingItemName}"?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              This action <strong>cannot be undone</strong>. The menu item will be permanently removed from your restaurant menu and database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Yes, Delete Item'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}