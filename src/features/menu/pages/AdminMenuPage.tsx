// src/pages/admin/Menu.tsx
// PRODUCTION-READY — RESPONSIVE ADMIN DASHBOARD

import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Package,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAdminMenuItems } from "@/features/menu/hooks/useMenuApi";
import { AdminMenuTable } from "@/features/menu/components/AdminMenuTable";
import { MenuItemFormModal } from "@/features/menu/components/MenuItemFormModal";
import {
  CATEGORY_LABELS,
  type MenuItem,
} from "@/features/menu/types/menu.types";

type AvailabilityFilter = "all" | "available" | "unavailable";

export default function AdminMenuPage(): JSX.Element {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] =
    useState<AvailabilityFilter>("all");
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useAdminMenuItems();
  const items = data?.items ?? [];

  /* ----------------------- FILTERING ----------------------- */
  const filteredItems = useMemo(() => {
    const searchLower = search.toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !searchLower ||
        item.name.toLowerCase().includes(searchLower) ||
        (item.description ?? "")
          .toLowerCase()
          .includes(searchLower);

      const matchesCategory =
        categoryFilter === "all" ||
        item.category === categoryFilter;

      const matchesAvailability =
        availabilityFilter === "all" ||
        (availabilityFilter === "available"
          ? item.isAvailable
          : !item.isAvailable);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesAvailability
      );
    });
  }, [items, search, categoryFilter, availabilityFilter]);

  /* ----------------------- STATS ----------------------- */
  const stats = useMemo(
    () => ({
      total: items.length,
      available: items.filter((i) => i.isAvailable).length,
      unavailable: items.filter((i) => !i.isAvailable).length,
    }),
    [items]
  );

  /* ----------------------- HANDLERS ----------------------- */
  const handleEdit = (item: MenuItem) => {
    navigate(`/admin/menu/edit/${item._id}`);
  };

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setAvailabilityFilter("all");
  };

  const handleAddSuccess = () => {
    setModalOpen(false);
    refetch();
  };

  const hasActiveFilters =
    search ||
    categoryFilter !== "all" ||
    availabilityFilter !== "all";

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between mb-10">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">
                Menu Management
              </h1>
              <p className="mt-2 text-muted-foreground">
                Add, edit, and manage your restaurant menu
              </p>
            </div>

            <Button size="lg" onClick={() => setModalOpen(true)}>
              <Plus className="mr-2 h-5 w-5" />
              Add New Item
            </Button>
          </div>

          {/* STATS */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="p-6 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-primary" />
              <p className="text-4xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">
                Total Items
              </p>
            </Card>

            <Card className="p-6 text-center border-green-500/20 bg-green-50 dark:bg-green-950/30">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                {stats.available}
              </p>
              <p className="text-sm text-muted-foreground">
                Available
              </p>
            </Card>

            <Card className="p-6 text-center border-orange-500/20 bg-orange-50 dark:bg-orange-950/30">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/20">
                <XCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <p className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                {stats.unavailable}
              </p>
              <p className="text-sm text-muted-foreground">
                Unavailable
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* FILTERS + TABLE */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end">
          {/* SEARCH */}
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-12 pl-11"
              placeholder="Search by name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* CATEGORY */}
          <Select
            value={categoryFilter}
            onValueChange={setCategoryFilter}
          >
            <SelectTrigger className="h-12 w-full sm:w-64">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                All Categories
              </SelectItem>
              {Object.entries(CATEGORY_LABELS).map(
                ([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>

          {/* AVAILABILITY */}
          <Select
            value={availabilityFilter}
            onValueChange={(v) =>
              setAvailabilityFilter(v as AvailabilityFilter)
            }
          >
            <SelectTrigger className="h-12 w-full sm:w-48">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                All Items
              </SelectItem>
              <SelectItem value="available">
                Available Only
              </SelectItem>
              <SelectItem value="unavailable">
                Unavailable Only
              </SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* TABLE / ERROR */}
        {isError ? (
          <Card className="p-12 text-center">
            <p className="mb-6 text-xl text-destructive">
              Failed to load menu items
            </p>
            <Button onClick={() => refetch()}>Try Again</Button>
          </Card>
        ) : (
          <AdminMenuTable
            items={filteredItems}
            isLoading={isLoading}
            onEdit={handleEdit}
          />
        )}
      </div>

      {/* ADD MODAL */}
      <MenuItemFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editItem={null}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
