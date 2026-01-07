// src/features/reviews/components/HomeTopReviews.tsx
import { useTopReviews } from '../hooks/useTopReviews';
import ReviewCard from './ReviewCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { Link } from 'react-router-dom'; // or your router

export default function HomeTopReviews() {
  const { data, isLoading, isError } = useTopReviews({ limit: 8 });

  if (isLoading) {
    return <TopReviewsSkeleton />;
  }

  if (isError || !data || data.reviews.length === 0) {
    return null; // or fallback message
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold tracking-tight mb-4">
            What Our Customers Say
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Real reviews from happy foodies who love our meals
          </p>
          {data.count > 0 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-6 w-6 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <span className="text-lg font-medium">
                Trusted by {data.count}+ customers
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {data.reviews.map((review) => (
            <ReviewCard
              key={review._id}
              review={review}
              showReply={true} // optional: hide reply on homepage if too long
            />
          ))}
        </div>

        {data.reviews.length >= 6 && (
          <div className="text-center mt-12">
            <Button asChild size="lg">
              <Link to="/reviews">View All Reviews</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function TopReviewsSkeleton() {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <Skeleton className="h-12 w-96 mx-auto mb-12" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}