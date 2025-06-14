import React from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star } from 'lucide-react';

const reviews = [
  {
    id: 'R001',
    author: 'Alice Wonderland',
    avatar: '/avatars/02.png',
    rating: 5,
    date: '2025-06-01',
    comment: 'Superbe séjour, l\'appartement était impeccable et très bien situé. Je recommande vivement !',
  },
  {
    id: 'R002',
    author: 'Bob The Builder',
    avatar: '/avatars/03.png',
    rating: 4,
    date: '2025-05-25',
    comment: 'Très bon rapport qualité-prix. Quelques petits détails à améliorer mais globalement satisfait.',
  },
  {
    id: 'R003',
    author: 'Charlie Chaplin',
    avatar: '/avatars/04.png',
    rating: 5,
    date: '2025-05-10',
    comment: 'Expérience parfaite du début à la fin. Hôte très réactif et logement conforme aux attentes.',
  },
];

const ReviewsPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Mes Avis</h1>
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Vos avis et notes</CardTitle>
          </CardHeader>
          <CardContent>
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
                      <div className="flex items-center text-sm text-yellow-500">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-current' : 'text-gray-300'}`} />
                        ))}
                        <span className="ml-2 text-gray-500 dark:text-gray-400">{review.date}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">{review.comment}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ReviewsPage;