import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getReviews, Review } from '@/lib/revyoos-api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSession } from '@/components/SessionContextProvider';

const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useSession();

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedReviews = await getReviews(profile?.revyoos_holding_ids);
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
  }, [profile]);

  const renderSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(3)].map((_, index) => (
        <Card key={index} className="p-4">
          <div className="flex items-center mb-2">
            <Skeleton className="h-9 w-9 rounded-full mr-3" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <Skeleton className="h-12 w-full mt-2" />
        </Card>
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
                <AlertTitle>Erreur</Alert-Title>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : reviews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reviews.map((review) => (
                  <Card key={review.id} className="p-4">
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
                    <p className="text-gray-700 dark:text-gray-300">{review.comment}</p>
                  </Card>
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