// src/features/analytics/AnalyticsPage.tsx

import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import AnalyticsDashboard from './components/AnalyticsDashboard';

type Period =
  | 'today'
  | 'yesterday'
  | '24h'
  | '7d'
  | '30d'
  | '90d'
  | 'custom';

export default function AnalyticsPage(): JSX.Element {
  const [period, setPeriod] = useState<Period>('7d');

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const isCustom = period === 'custom';

  return (
    <main className="min-h-screen w-full">
      {/* Max-width wrapper — fluid & responsive up to 4K */}
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <header className="mb-8 space-y-2">
          <h1 className="text-[clamp(1.75rem,3vw,2.5rem)] font-bold tracking-tight">
            Order Analytics Dashboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-3xl">
            Monitor sales, performance, customer behavior, and real-time
            operations.
          </p>
        </header>

        {/* Analytics Card */}
        <Card className="overflow-hidden">
          {/* Controls Header */}
          <CardHeader className="border-b space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-[clamp(1.25rem,2.5vw,1.75rem)]">
                  Performance Overview
                </CardTitle>
                <CardDescription className="text-sm">
                  {isCustom
                    ? dateRange?.from && dateRange?.to
                      ? `Custom range: ${format(
                          dateRange.from,
                          'PPP'
                        )} – ${format(dateRange.to, 'PPP')}`
                      : 'Select a custom date range'
                    : `Period: ${
                        period === 'today'
                          ? 'Today'
                          : period === 'yesterday'
                          ? 'Yesterday'
                          : `Last ${period
                              .replace('d', ' days')
                              .replace('h', ' hours')}`
                      }`}
                </CardDescription>
              </div>

              {/* Filters — mobile first */}
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap lg:w-auto">
                {/* Period Select */}
                <Select
                  value={period}
                  onValueChange={(value: Period) => {
                    setPeriod(value);
                    if (value !== 'custom') {
                      setDateRange(undefined);
                    }
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[200px] h-11">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>

                {/* Date Range Picker (only when custom) */}
                {isCustom && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full sm:w-[260px] h-11 justify-start text-left font-normal',
                          !dateRange?.from && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                        {dateRange?.from && dateRange?.to ? (
                          `${format(
                            dateRange.from,
                            'LLL dd, y'
                          )} – ${format(dateRange.to, 'LLL dd, y')}`
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>

                    {/* Calendar adapts automatically */}
                    <PopoverContent
                      className="w-auto p-0"
                      align="end"
                      sideOffset={8}
                    >
                      <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                        disabled={(date) =>
                          date > new Date() ||
                          date <
                            new Date(
                              new Date().setFullYear(
                                new Date().getFullYear() - 2
                              )
                            )
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          </CardHeader>

          {/* Dashboard Content */}
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <AnalyticsDashboard />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
