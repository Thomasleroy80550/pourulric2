import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getReviews, Review } from '@/lib/revyoos-api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedReviews = await getReviews();
        setReviews(fetchedReviews);
      } catch (err: any) {
        const errorMessage = `Erreur lors de la récupération des avis : ${err.message}`;
        setError(errorMessage);
        console.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  const renderSkeletons = () => (
    <div className="space-y-6">
      {[...Array(3)].map((_, index) => (
        <div key={index} className="border-b pb-4 last:border-b-0 last:pb-0">
          <div className="flex items-center mb-2">
            <Skeleton className="h-9 w-9 rounded-full mr-3" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <Skeleton className="h-12 w-full mt-2" />
        </div>
      ))}
    </div>
  );

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Mes Avis</h1>
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Vos avis et notes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              renderSkeletons()
            ) : error ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : reviews.length > 0 ? (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                    <div className="flex items-center mb-2">
                      <Avatar className="h-9 w-9 mr-3">
                        <AvatarImage src={review.avatar} alt={review.author} />
                        <AvatarFallback>{review.author.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{review.author}</p>
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center text-yellow-500">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-current' : 'text-gray-300'}`} />
                            ))}
                          </div>
                          <span className="ml-2">{review.date}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 pl-12">{review.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                Aucun avis trouvé pour le moment.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ReviewsPage;