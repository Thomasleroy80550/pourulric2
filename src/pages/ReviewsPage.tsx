/** @jsxImportSource react */
import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, AlertTriangle, Languages } from 'lucide-react';
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
import DOMPurify from 'dompurify';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReplyReviewDialog } from '@/components/ReplyReviewDialog';
import { getReviewRepliesForUser, ReviewReply } from '@/lib/review-replies-api';

const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  const { profile } = useSession();
  const [replies, setReplies] = useState<Map<string, ReviewReply>>(new Map());
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  
  const reviewsPerPage = 9;
  const MAX_COMMENT_LENGTH = 150;

  // Calculate average rating
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : 'N/A';

  // Determine badge variant based on average rating
  const getBadgeVariant = (rating: string) => {
    const numRating = parseFloat(rating);
    if (isNaN(numRating)) return "outline"; // For "N/A"
    if (numRating >= 4.5) return "default"; // Green-like (primary)
    if (numRating >= 3.5) return "secondary"; // Blue-like (secondary)
    if (numRating >= 2.5) return "destructive"; // Red-like (destructive) - using destructive for average/below average
    return "destructive"; // Below 2.5, also destructive
  };

  const fetchReviewsAndReplies = async () => {
    if (!profile?.revyoos_holding_ids) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [fetchedReviews, fetchedReplies] = await Promise.all([
        getReviews(profile.revyoos_holding_ids),
        getReviewRepliesForUser()
      ]);
      setReviews(fetchedReviews);
      const repliesMap = new Map(fetchedReplies.map(reply => [reply.review_id, reply]));
      setReplies(repliesMap);
    } catch (err: any) {
      const errorMessage = `Erreur lors de la récupération des données : ${err.message}`;
      setError(errorMessage);
      console.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviewsAndReplies();
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

  const handleReplyClick = (review: Review) => {
    setSelectedReview(review);
    setIsReplyDialogOpen(true);
  };

  const handleReplySuccess = () => {
    fetchReviewsAndReplies();
  };

  const handleTranslate = (text: string) => {
    const url = `https://translate.google.com/?sl=auto&tl=fr&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
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
            <CardTitle className="text-lg font-semibold flex items-center justify-between">
              <span>Vos avis et notes</span>
              {reviews.length > 0 && (
                <Badge variant={getBadgeVariant(averageRating)} className="text-base px-3 py-1">
                  Note moyenne : {averageRating} / 5
                </Badge>
              )}
            </CardTitle>
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
                    const existingReply = replies.get(review.id);

                    return (
                      <Card key={review.id} className="p-4 flex flex-col">
                        <div className="flex-grow">
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
                        </div>
                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                          <div className="flex items-center space-x-2">
                            {needsTruncation && (
                              <button 
                                onClick={() => toggleExpand(review.id)} 
                                className="text-blue-500 hover:underline text-sm"
                              >
                                {isExpanded ? 'Voir moins' : 'Voir plus'}
                              </button>
                            )}
                            <button
                              onClick={() => handleTranslate(review.comment)}
                              className="text-gray-500 hover:text-gray-700 text-sm flex items-center"
                              title="Traduire l'avis"
                            >
                              <Languages className="h-4 w-4 mr-1" />
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {existingReply ? (
                              <>
                                {existingReply.status === 'pending_approval' && <Badge variant="secondary">En attente</Badge>}
                                {existingReply.status === 'approved' && <Badge variant="default">Publiée</Badge>}
                                {existingReply.status === 'rejected' && <Badge variant="destructive">Rejetée</Badge>}
                                {(existingReply.status === 'pending_approval' || existingReply.status === 'rejected') && (
                                  <Button variant="outline" size="sm" onClick={() => handleReplyClick(review)}>
                                    Modifier
                                  </Button>
                                )}
                              </>
                            ) : (
                              <Button variant="default" size="sm" onClick={() => handleReplyClick(review)}>
                                Répondre
                              </Button>
                            )}
                          </div>
                        </div>
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
        <ReplyReviewDialog
          isOpen={isReplyDialogOpen}
          onOpenChange={setIsReplyDialogOpen}
          review={selectedReview}
          existingReply={selectedReview ? replies.get(selectedReview.id) : undefined}
          onSuccess={handleReplySuccess}
        />
      </div>
    </MainLayout>
  );
};

export default ReviewsPage;