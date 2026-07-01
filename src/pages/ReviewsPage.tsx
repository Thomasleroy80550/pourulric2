/** @jsxImportSource react */
import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Star,
  AlertTriangle,
  Languages,
  MessageSquareQuote,
  Search,
  Award,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getReviews, Review } from '@/lib/reviews-api';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const reviewsPerPage = 15;

function formatSource(source: string): string {
  if (!source) return 'Autre';
  const map: Record<string, string> = {
    AIRBNB: 'Airbnb',
    BOOKING: 'Booking.com',
    HOMEAWAY: 'Vrbo / Abritel',
    VRBO: 'Vrbo / Abritel',
    EXPEDIA: 'Expedia',
    DIRECT: 'Direct',
    BE: 'Site web',
    GOOGLE: 'Google',
  };
  return map[source.toUpperCase()] ?? source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();
}

function sourceClasses(source: string): string {
  const key = source.toUpperCase();
  const map: Record<string, string> = {
    AIRBNB: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    BOOKING: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    HOMEAWAY: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
    VRBO: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
    EXPEDIA: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    DIRECT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    BE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
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
    VRBO: 'bg-indigo-500',
    EXPEDIA: 'bg-amber-500',
    DIRECT: 'bg-emerald-500',
    BE: 'bg-emerald-500',
    GOOGLE: 'bg-violet-500',
  };
  return map[key] ?? 'bg-gray-400';
}

function StarRating({ rating, className }: { rating: number; className?: string }) {
  const rounded = Math.round(rating);
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={cn(
            'h-3.5 w-3.5',
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
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'top' | 'low'>('recent');

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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sourceFilter, sortBy]);

  const averageRatingNum = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;
  const averageRating = reviews.length > 0 ? averageRatingNum.toFixed(1) : 'N/A';

  const fiveStarCount = useMemo(
    () => reviews.filter((r) => Math.round(r.rating) === 5).length,
    [reviews],
  );
  const fiveStarPct = reviews.length > 0 ? Math.round((fiveStarCount / reviews.length) * 100) : 0;

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

  const renderSkeletonRows = () => (
    <div className="divide-y divide-border/60">
      {[...Array(8)].map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="w-40 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 flex-1" />
        </div>
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

        {/* Toolbar */}
        {!loading && !error && reviews.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
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

        {/* Compact list / table */}
        {loading ? (
          <Card className="overflow-hidden">{renderSkeletonRows()}</Card>
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
            <Card className="overflow-hidden">
              {/* Table header (desktop) */}
              <div className="hidden md:grid grid-cols-[minmax(0,220px)_120px_130px_1fr_110px] items-center gap-4 px-4 py-3 bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b">
                <span>Logement</span>
                <span>Note</span>
                <span>Plateforme</span>
                <span>Commentaire</span>
                <span className="text-right">Date</span>
              </div>

              <div className="divide-y divide-border/60">
                {currentReviews.map((review) => {
                  const isExpanded = expandedReviews.has(review.id);
                  const sanitizedComment = DOMPurify.sanitize(review.comment);
                  const hasComment = sanitizedComment.trim().length > 0;
                  const initials = review.author.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

                  return (
                    <div
                      key={review.id}
                      className="group px-4 py-3.5 transition-colors hover:bg-muted/40"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,220px)_120px_130px_1fr_110px] items-start md:items-center gap-2 md:gap-4">
                        {/* Author */}
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 shrink-0 ring-2 ring-background shadow-sm">
                            <AvatarImage src={review.avatar} alt={review.author} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium truncate">{review.author}</span>
                        </div>

                        {/* Rating */}
                        <div className="flex items-center gap-1.5 pl-12 md:pl-0">
                          <StarRating rating={review.rating} />
                          <span className="text-xs font-semibold text-amber-500">{review.rating.toFixed(1)}</span>
                        </div>

                        {/* Platform */}
                        <div className="pl-12 md:pl-0">
                          {review.source && (
                            <Badge variant="secondary" className={cn('border-0 font-medium gap-1.5', sourceClasses(review.source))}>
                              <span className={cn('h-1.5 w-1.5 rounded-full', sourceDot(review.source))} />
                              {formatSource(review.source)}
                            </Badge>
                          )}
                        </div>

                        {/* Comment */}
                        <div className="min-w-0 pl-12 md:pl-0">
                          {hasComment ? (
                            <button
                              onClick={() => toggleExpand(review.id)}
                              className="flex items-start gap-1 text-left text-sm text-foreground/80 w-full group/comment"
                            >
                              <span
                                className={cn('flex-1', !isExpanded && 'line-clamp-1 md:line-clamp-2')}
                                dangerouslySetInnerHTML={{ __html: sanitizedComment }}
                              />
                              <ChevronDown
                                className={cn(
                                  'h-4 w-4 shrink-0 mt-0.5 text-muted-foreground transition-transform',
                                  isExpanded && 'rotate-180',
                                )}
                              />
                            </button>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">Pas de commentaire</span>
                          )}
                        </div>

                        {/* Date + actions */}
                        <div className="flex items-center justify-between md:justify-end gap-2 pl-12 md:pl-0">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{review.date}</span>
                          {hasComment && (
                            <button
                              onClick={() => handleTranslate(review.comment)}
                              className="text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="Traduire l'avis"
                            >
                              <Languages className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {pageCount > 1 && (
              <div className="mt-6">
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
