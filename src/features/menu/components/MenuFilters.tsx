// src/features/menu/components/MenuFilters.tsx
import { Search, Leaf, Flame, X, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CATEGORY_LABELS, CATEGORY_ICONS, type MenuCategory } from '../types/menu.types';

interface MenuFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedCategory: MenuCategory | null;
  onCategoryChange: (category: MenuCategory | null) => void;
  isVeg: boolean | null;
  onVegChange: (value: boolean | null) => void;
  isSpicy: boolean | null;
  onSpicyChange: (value: boolean | null) => void;
}

const categories: MenuCategory[] = ['breakfast', 'lunch', 'dinner', 'desserts', 'beverages'];

export function MenuFilters({
  search,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  isVeg,
  onVegChange,
  isSpicy,
  onSpicyChange,
}: MenuFiltersProps) {
  const activeFilterCount =
    (selectedCategory !== null ? 1 : 0) +
    (isVeg !== null ? 1 : 0) +
    (isSpicy !== null ? 1 : 0);

  const clearAllFilters = () => {
    onCategoryChange(null);
    onVegChange(null);
    onSpicyChange(null);
    onSearchChange('');
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search dishes, ingredients..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-12 h-12 text-base bg-background border-border/60 focus-visible:ring-primary"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            onClick={() => onSearchChange('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Category Pills */}
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-3">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="lg"
            onClick={() => onCategoryChange(null)}
            className="shrink-0 font-medium"
          >
            <Filter className="h-4 w-4 mr-2" />
            All Items
          </Button>

          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat];
            const isActive = selectedCategory === cat;

            return (
              <Button
                key={cat}
                variant={isActive ? 'default' : 'outline'}
                size="lg"
                onClick={() => onCategoryChange(isActive ? null : cat)}
                className="shrink-0 gap-2 font-medium"
              >
                <Icon className="h-5 w-5" />
                {CATEGORY_LABELS[cat]}
              </Button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Quick Filters + Clear */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant={isVeg === true ? 'default' : 'outline'}
          size="sm"
          onClick={() => onVegChange(isVeg === true ? null : true)}
          className="gap-2 font-medium"
        >
          <Leaf className="h-4 w-4" />
          Vegetarian Only
        </Button>

        <Button
          variant={isSpicy === true ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSpicyChange(isSpicy === true ? null : true)}
          className="gap-2 font-medium"
        >
          <Flame className="h-4 w-4" />
          Spicy Dishes
        </Button>

        {(activeFilterCount > 0 || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <X className="h-4 w-4" />
            Clear All Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                {activeFilterCount + (search ? 1 : 0)}
              </Badge>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}