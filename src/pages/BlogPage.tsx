import React from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const BlogPage: React.FC = () => {
  const blogPosts = [
    {
      id: 1,
      title: "Optimisez vos revenus locatifs : 5 astuces incontournables",
      excerpt: "Découvrez comment maximiser la rentabilité de votre bien immobilier grâce à nos conseils d'experts.",
      date: "15 juillet 2024",
      link: "#", // Placeholder link
    },
    {
      id: 2,
      title: "Ménage et entretien : les secrets d'une propriété impeccable",
      excerpt: "Un guide complet pour maintenir votre logement en parfait état et garantir la satisfaction de vos locataires.",
      date: "10 juillet 2024",
      link: "#", // Placeholder link
    },
    {
      id: 3,
      title: "La gestion des avis clients : transformez les critiques en opportunités",
      excerpt: "Apprenez à gérer efficacement les retours de vos voyageurs pour améliorer votre réputation en ligne.",
      date: "01 juillet 2024",
      link: "#", // Placeholder link
    },
  ];

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Notre Blog</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Retrouvez ici nos articles et conseils pour optimiser la gestion de vos propriétés et améliorer l'expérience de vos voyageurs.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogPosts.map((post) => (
            <Card key={post.id} className="shadow-md">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">{post.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 mb-4">{post.excerpt}</p>
                <p className="text-sm text-gray-500 mb-4">Publié le {post.date}</p>
                <Button variant="outline" className="w-full" asChild>
                  <a href={post.link}>
                    Lire l'article <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default BlogPage;