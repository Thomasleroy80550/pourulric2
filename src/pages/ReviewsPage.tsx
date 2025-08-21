/** @jsxImportSource react */
import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getReviews, Review } from '@/lib/revyoos-api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSession } from '@/components/SessionContextProvider';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from '@/lib/utils';
import DOMPurify from 'dompurify'; // Import DOMPurify

const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set()); // State for "Voir plus"
  const { profile } = useSession();
  
  const reviewsPerPage = 9;
  const MAX_COMMENT_LENGTH = 150; // Max characters before truncating

  useEffect(() => {
    const fetchReviews = async () => {
      if (!profile?.revyoos_holding_ids) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const fetchedReviews = await getReviews(profile.revyoos_holding_ids);
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

  const indexOfLastReview = currentPage * reviewsPerPage;
  const indexOfFirstReview = indexOfLastReview - reviewsPerPage;
  const currentReviews = reviews.slice(indexOfFirstReview, indexOfLastReview);
  const pageCount = Math.ceil(reviews.length / reviewsPerPage);

  const toggleExpand = (reviewId: string) => {
    setExpandedReviews((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  };

  const renderSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, index) => (
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
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : reviews.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentReviews.map((review) => {
                    const isExpanded = expandedReviews.has(review.id);
                    const sanitizedComment = DOMPurify.sanitize(review.comment);
                    const needsTruncation = sanitizedComment.length > MAX_COMMENT_LENGTH;
                    const displayedComment = needsTruncation && !isExpanded
                      ? sanitizedComment.substring(0, MAX_COMMENT_LENGTH) + '...'
                      : sanitizedComment;

                    return (
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
                            {review.source && (
                              <p className="text-xs text-muted-foreground mt-1">Source: {review.source}</p>
                            )}
                          </div>
                        </div>
                        <p 
                          className="text-gray-700 dark:text-gray-300"
                          dangerouslySetInnerHTML={{ __html: displayedComment }}
                        />
                        {needsTruncation && (
                          <button 
                            onClick={() => toggleExpand(review.id)} 
                            className="text-blue-500 hover:underline text-sm mt-1"
                          >
                            {isExpanded ? 'Voir moins' : 'Voir plus'}
                          </button>
                        )}
                      </Card>
                    );
                  })}
                </div>
                {pageCount > 1 && (
                  <div className="mt-8">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage((prev) => Math.max(prev - 1, 1));
                            }}
                            className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
                          />
                        </PaginationItem>
                        <PaginationItem>
                          <span className="px-4 py-2 text-sm">
                            Page {currentPage} sur {pageCount}
                          </span>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage((prev) => Math.min(prev + 1, pageCount));
                            }}
                            className={cn(currentPage === pageCount && "pointer-events-none opacity-50")}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
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