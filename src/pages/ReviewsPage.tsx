/** @jsxImportSource react */
import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Star,
  AlertTriangle,
  Languages,
  Sparkles,
  MessageSquareQuote,
  Search,
  Quote,
  TrendingUp,
  Award,
  Building2,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getReviews, getReviewSynthesis, Review } from '@/lib/reviews-api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const reviewsPerPage = 9;
const MAX_COMMENT_LENGTH = 220;

function formatSource(source: string): string {
  if (!source) return 'Autre';
  const map: Record<string, string> = {
    AIRBNB: 'Airbnb',
    BOOKING: 'Booking.com',
    HOMEAWAY: 'Abritel',
    EXPEDIA: 'Expedia',
    DIRECT: 'Direct',
    GOOGLE: 'Google',
    VRBO: 'Vrbo',
  };
  return map[source.toUpperCase()] ?? source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();
}

function sourceClasses(source: string): string {
  const key = source.toUpperCase();
  const map: Record<string, string> = {
    AIRBNB: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    BOOKING: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    HOMEAWAY: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
    EXPEDIA: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    DIRECT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    GOOGLE: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  };
  return map[key] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
}

function sourceDot(source: string): string {
  const key = source.toUpperCase();
  const map: Record<string, string> = {
    AIRBNB: 'bg-rose-500',
    BOOKING: 'bg-blue-500',
    HOMEAWAY: 'bg-indigo-500',
    EXPEDIA: 'bg-amber-500',
    DIRECT: 'bg-emerald-500',
    GOOGLE: 'bg-violet-500',
  };
  return map[key] ?? 'bg-gray-400';
}

function StarRating({ rating, className, size = 'sm' }: { rating: number; className?: string; size?: 'sm' | 'md' }) {
  const rounded = Math.round(rating);
  const dim = size === 'md' ? 'h-5 w-5' : 'h-4 w-4';
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={cn(
            dim,
            i < rounded ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-gray-300 dark:text-gray-600',
          )}
        />
      ))}
    </div>
  );
}

const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  const [reviewSynthesis, setReviewSynthesis] = useState<string>("");
  const [loadingSynthesis, setLoadingSynthesis] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'top' | 'low'>('recent');

  useEffect(() => {
    const fetchReviewsAndSynthesis = async () => {
      setLoading(true);
      setLoadingSynthesis(true);
      setError(null);
      try {
        const fetchedReviews = await getReviews();
        setReviews(fetchedReviews);
        setLoading(false);

        const fetchedSynthesis = await getReviewSynthesis(fetchedReviews);
        setReviewSynthesis(fetchedSynthesis);
      } catch (err: any) {
        const errorMessage = `Erreur lors de la récupération des avis ou de la synthèse : ${err.message}`;
        setError(errorMessage);
        console.error(errorMessage);
      } finally {
        setLoading(false);
        setLoadingSynthesis(false);
      }
    };

    fetchReviewsAndSynthesis();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sourceFilter, sortBy]);

  const averageRatingNum = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;
  const averageRating = reviews.length > 0 ? averageRatingNum.toFixed(1) : 'N/A';

  const distribution = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0]; // index 0 => 1 star ... index 4 => 5 stars
    reviews.forEach((review) => {
      const star = Math.min(5, Math.max(1, Math.round(review.rating)));
      buckets[star - 1] += 1;
    });
    return buckets;
  }, [reviews]);

  const fiveStarPct = reviews.length > 0 ? Math.round((distribution[4] / reviews.length) * 100) : 0;

  const sources = useMemo(() => {
    const set = new Set<string>();
    reviews.forEach((review) => review.source && set.add(review.source));
    return Array.from(set).sort();
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let result = reviews.filter((review) => {
      const matchesSource = sourceFilter === 'all' || review.source === sourceFilter;
      const matchesQuery =
        !query ||
        review.comment.toLowerCase().includes(query) ||
        review.author.toLowerCase().includes(query);
      return matchesSource && matchesQuery;
    });

    if (sortBy === 'top') {
      result = [...result].sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'low') {
      result = [...result].sort((a, b) => a.rating - b.rating);
    }
    return result;
  }, [reviews, searchQuery, sourceFilter, sortBy]);

  const indexOfLastReview = currentPage * reviewsPerPage;
  const indexOfFirstReview = indexOfLastReview - reviewsPerPage;
  const currentReviews = filteredReviews.slice(indexOfFirstReview, indexOfLastReview);
  const pageCount = Math.ceil(filteredReviews.length / reviewsPerPage);

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

  const handleTranslate = (text: string) => {
    const url = `https://translate.google.com/?sl=auto&tl=fr&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const renderSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {[...Array(6)].map((_, index) => (
        <Card key={index} className="p-5">
          <div className="flex items-center mb-3">
            <Skeleton className="h-10 w-10 rounded-full mr-3" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-4 w-full mt-2" />
          <Skeleton className="h-4 w-5/6 mt-2" />
          <Skeleton className="h-4 w-2/3 mt-2" />
        </Card>
      ))}
    </div>
  );

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm font-medium text-primary mb-2">
            <MessageSquareQuote className="h-4 w-4" />
            Satisfaction voyageurs
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Mes Avis</h1>
          <p className="text-muted-foreground mt-1">
            Retrouvez tous les commentaires laissés par vos voyageurs, toutes plateformes confondues.
          </p>
        </div>

        {/* Quick stats strip */}
        {!error && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              {
                label: 'Note moyenne',
                value: loading ? null : averageRating,
                suffix: loading ? '' : '/ 5',
                icon: Star,
                color: 'text-amber-500',
                bg: 'bg-amber-100 dark:bg-amber-950/40',
              },
              {
                label: "Total d'avis",
                value: loading ? null : reviews.length.toString(),
                icon: MessageSquareQuote,
                color: 'text-primary',
                bg: 'bg-primary/10',
              },
              {
                label: 'Avis 5 étoiles',
                value: loading ? null : `${fiveStarPct}%`,
                icon: Award,
                color: 'text-emerald-500',
                bg: 'bg-emerald-100 dark:bg-emerald-950/40',
              },
              {
                label: 'Plateformes',
                value: loading ? null : sources.length.toString(),
                icon: Building2,
                color: 'text-violet-500',
                bg: 'bg-violet-100 dark:bg-violet-950/40',
              },
            ].map((stat) => (
              <Card key={stat.label} className="overflow-hidden">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl shrink-0', stat.bg)}>
                    <stat.icon className={cn('h-5 w-5', stat.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                    {stat.value === null ? (
                      <Skeleton className="h-6 w-16 mt-1" />
                    ) : (
                      <p className="text-xl font-bold leading-tight">
                        {stat.value}
                        {stat.suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{stat.suffix}</span>}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Summary + Synthesis */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Rating overview */}
          <Card className="lg:col-span-1 overflow-hidden">
            <CardContent className="p-6">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-24" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40 shrink-0">
                      <span className="text-2xl font-bold leading-none text-amber-600 dark:text-amber-400">{averageRating}</span>
                      <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70">sur 5</span>
                    </div>
                    <div>
                      <StarRating rating={averageRatingNum} size="md" />
                      <p className="text-sm text-muted-foreground mt-1.5">
                        Basé sur <span className="font-medium text-foreground">{reviews.length}</span> avis
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-2.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = distribution[star - 1];
                      const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 text-sm">
                          <span className="flex items-center gap-1 w-8 text-muted-foreground">
                            {star}
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                          </span>
                          <Progress value={pct} className="h-2 flex-1" />
                          <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* AI synthesis */}
          <Card className="lg:col-span-2 relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
            <CardContent className="p-6 relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">Synthèse intelligente</h2>
                <Badge variant="secondary" className="ml-auto gap-1">
                  <Sparkles className="h-3 w-3" />
                  IA
                </Badge>
              </div>

              {loadingSynthesis ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : reviewSynthesis ? (
                <div className="relative">
                  <Quote className="absolute -left-1 -top-1 h-7 w-7 text-primary/15" />
                  <p className="pl-7 text-[15px] leading-relaxed text-foreground/90">
                    {reviewSynthesis}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {reviews.length > 0
                    ? "Aucune synthèse n'a pu être générée pour le moment."
                    : "La synthèse apparaîtra dès que vous aurez des avis."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        {!loading && !error && reviews.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher dans les avis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full sm:w-[190px]">
                <SelectValue placeholder="Plateforme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les plateformes</SelectItem>
                {sources.map((source) => (
                  <SelectItem key={source} value={source}>{formatSource(source)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
              <SelectTrigger className="w-full sm:w-[170px]">
                <SelectValue placeholder="Trier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Plus récents</SelectItem>
                <SelectItem value="top">Mieux notés</SelectItem>
                <SelectItem value="low">Moins bien notés</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Results count */}
        {!loading && !error && reviews.length > 0 && (
          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>
              <span className="font-medium text-foreground">{filteredReviews.length}</span>{' '}
              avis {(searchQuery || sourceFilter !== 'all') ? 'trouvés' : 'au total'}
            </span>
          </div>
        )}

        {/* Reviews grid */}
        {loading ? (
          renderSkeletons()
        ) : error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <MessageSquareQuote className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Aucun avis pour le moment</h3>
            <p className="text-muted-foreground mt-1 max-w-sm">
              Vos avis clients apparaîtront ici automatiquement dès qu'ils seront collectés.
            </p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <Search className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Aucun avis ne correspond à votre recherche.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {currentReviews.map((review) => {
                const isExpanded = expandedReviews.has(review.id);
                const sanitizedComment = DOMPurify.sanitize(review.comment);
                const needsTruncation = sanitizedComment.length > MAX_COMMENT_LENGTH;
                const displayedComment = needsTruncation && !isExpanded
                  ? sanitizedComment.substring(0, MAX_COMMENT_LENGTH) + '…'
                  : sanitizedComment;

                return (
                  <Card
                    key={review.id}
                    className="group flex flex-col p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border-border/60"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-10 w-10 shrink-0 ring-2 ring-background shadow-sm">
                          <AvatarImage src={review.avatar} alt={review.author} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                            {review.author.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold truncate leading-tight">{review.author}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{review.date}</p>
                        </div>
                      </div>
                      {review.source && (
                        <Badge variant="secondary" className={cn('shrink-0 border-0 font-medium gap-1.5', sourceClasses(review.source))}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', sourceDot(review.source))} />
                          {formatSource(review.source)}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <StarRating rating={review.rating} />
                      <span className="text-sm font-semibold text-amber-500">{review.rating.toFixed(1)}</span>
                    </div>

                    <p
                      className="text-sm leading-relaxed text-foreground/80 flex-grow"
                      dangerouslySetInnerHTML={{ __html: displayedComment }}
                    />

                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/60 text-sm">
                      {needsTruncation && (
                        <button
                          onClick={() => toggleExpand(review.id)}
                          className="font-medium text-primary hover:underline"
                        >
                          {isExpanded ? 'Voir moins' : 'Voir plus'}
                        </button>
                      )}
                      <button
                        onClick={() => handleTranslate(review.comment)}
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors ml-auto"
                        title="Traduire l'avis"
                      >
                        <Languages className="h-4 w-4" />
                        Traduire
                      </button>
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
                      <span className="px-4 py-2 text-sm text-muted-foreground">
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
        )}
      </div>
    </MainLayout>
  );
};

export default ReviewsPage;
