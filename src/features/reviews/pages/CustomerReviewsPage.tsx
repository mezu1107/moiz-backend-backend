// src/pages/CustomerReviewsPage.tsx
// PRODUCTION-READY — FULLY RESPONSIVE (320px → 4K)
// Mobile-first public reviews page with featured, analytics, and all reviews

import ReviewList from '@/features/reviews/components/ReviewList';
import ReviewAnalytics from '@/features/reviews/components/ReviewAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';

export default function CustomerReviewsPage() {
  return (
    <main className="container mx-auto px-4 py-8 md:py-12 lg:py-16 max-w-7xl">
      <header className="text-center mb-12 md:mb-16">
        <h1 className="text-3xl font-bold mb-4 md:text-4xl lg:text-5xl">Customer Reviews</h1>
        <p className="text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto">
          See what our customers are saying about their experience
        </p>
      </header>

      {/* Featured Reviews Section */}
      <section className="mb-16 md:mb-20">
        <div className="flex items-center gap-3 mb-8">
          <Star className="h-7 w-7 md:h-8 md:w-8 text-yellow-500" />
          <h2 className="text-2xl font-semibold md:text-3xl lg:text-4xl">Featured Reviews</h2>
        </div>
        <ReviewList featuredOnly limit={6} />
      </section>

      {/* Analytics Summary */}
      <section className="mb-16 md:mb-20">
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl md:text-2xl">Review Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <ReviewAnalytics />
          </CardContent>
        </Card>
      </section>

      {/* All Approved Reviews */}
      <section>
        <h2 className="text-2xl font-semibold mb-8 md:text-3xl lg:text-4xl">All Reviews</h2>
        <ReviewList />
      </section>
    </main>
  );
}