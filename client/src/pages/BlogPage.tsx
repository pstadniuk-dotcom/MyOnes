import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Calendar, ArrowRight, BookOpen } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function BlogPage() {
  const blogPosts = [
    {
      id: 1,
      title: 'Understanding Personalized Nutrition',
      excerpt: 'Learn how AI-powered health assessments can create custom supplement formulas tailored to your unique needs.',
      date: '2024-03-15',
      category: 'Science',
      readTime: '5 min read'
    },
    {
      id: 2,
      title: 'The Science Behind Blood Test Analysis',
      excerpt: 'Discover how we analyze your biomarkers to identify nutritional gaps and optimize your supplement formula.',
      date: '2024-03-10',
      category: 'Health',
      readTime: '7 min read'
    },
    {
      id: 3,
      title: '5 Signs You Need Personalized Supplements',
      excerpt: 'Generic vitamins might not be enough. Here are the signs that indicate you need a customized approach.',
      date: '2024-03-05',
      category: 'Wellness',
      readTime: '4 min read'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Hero Section */}
      <section className="py-24 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-foreground mb-6" data-testid="heading-blog-hero">
              Health & Wellness Blog
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto" data-testid="text-blog-description">
              Insights on personalized nutrition, supplement science, and optimizing your health journey.
            </p>
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogPosts.map((post) => (
                <Card key={post.id} className="hover-elevate" data-testid={`card-blog-${post.id}`}>
                  <CardHeader>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                      <span>•</span>
                      <span>{post.readTime}</span>
                    </div>
                    <CardTitle className="text-xl mb-2">{post.title}</CardTitle>
                    <CardDescription>{post.excerpt}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" size="sm" data-testid={`button-read-${post.id}`}>
                      Read More <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Coming Soon Message */}
            <div className="mt-16 text-center">
              <div className="inline-flex items-center gap-3 px-6 py-4 bg-primary/5 rounded-md">
                <BookOpen className="w-5 h-5 text-primary" />
                <p className="text-muted-foreground">
                  More articles coming soon. Subscribe to our newsletter to stay updated!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-20 bg-primary/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-serif font-bold text-foreground mb-6">
              Never Miss a Health Tip
            </h2>
            <p className="text-muted-foreground mb-8">
              Get the latest insights on personalized nutrition delivered to your inbox.
            </p>
            <Link href="/">
              <Button size="lg" data-testid="button-subscribe-blog">
                Subscribe to Newsletter <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
