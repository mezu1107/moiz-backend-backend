// src/pages/AdminReviewsDashboard.tsx
// PRODUCTION-READY — FULLY RESPONSIVE (320px → 4K)
// Mobile-first admin dashboard with tabs, fluid layout

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminReviewTable from '@/features/reviews/components/AdminReviewTable';
import ReviewAnalytics from '@/features/reviews/components/ReviewAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminReviewsDashboard() {
  return (
    <main className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
      <header className="mb-10">
        <h1 className="text-3xl font-bold md:text-4xl lg:text-5xl">Reviews Dashboard</h1>
      </header>

      <Tabs defaultValue="analytics" className="space-y-8">
        <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-flex">
          <TabsTrigger value="analytics" className="text-sm md:text-base">
            Analytics
          </TabsTrigger>
          <TabsTrigger value="management" className="text-sm md:text-base">
            Review Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-8">
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl md:text-2xl">Review Analytics Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ReviewAnalytics />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="management" className="space-y-8">
          <AdminReviewTable />
        </TabsContent>
      </Tabs>
    </main>
  );
}