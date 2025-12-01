import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Calendar, ArrowRight, BookOpen } from 'lucide-react';
import HeaderV2 from '@/components/HeaderV2';
import FooterV2 from '@/components/FooterV2';

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
    <div className="min-h-screen bg-[#FAF7F2]">
      <HeaderV2 />
      {/* Hero Section */}
      <section className="pt-32 pb-24">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="max-w-4xl mx-auto text-center">
            <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase mb-4 block">
              Insights
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-[#1B4332] mb-6" data-testid="heading-blog-hero">
              Health & Wellness Blog
            </h1>
            <p className="text-xl text-[#52796F] max-w-2xl mx-auto" data-testid="text-blog-description">
              Insights on personalized nutrition, supplement science, and optimizing your health journey.
            </p>
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post) => (
              <div key={post.id} className="bg-[#FAF7F2] rounded-2xl p-8 hover:shadow-md transition-shadow" data-testid={`card-blog-${post.id}`}>
                <div className="flex items-center gap-2 text-sm text-[#52796F] mb-4">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  <span>•</span>
                  <span>{post.readTime}</span>
                </div>
                <h3 className="text-xl font-medium text-[#1B4332] mb-2">{post.title}</h3>
                <p className="text-[#52796F] mb-4">{post.excerpt}</p>
                <Button variant="ghost" size="sm" className="text-[#1B4332] hover:text-[#1B4332]/80" data-testid={`button-read-${post.id}`}>
                  Read More <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Coming Soon Message */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-4 bg-[#FAF7F2] rounded-2xl">
              <BookOpen className="w-5 h-5 text-[#1B4332]" />
              <p className="text-[#52796F]">
                More articles coming soon. Subscribe to our newsletter to stay updated!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="text-center">
            <h2 className="text-3xl font-light text-[#1B4332] mb-6">
              Never Miss a Health Tip
            </h2>
            <p className="text-[#52796F] mb-8">
              Get the latest insights on personalized nutrition delivered to your inbox.
            </p>
            <Link href="/">
              <Button size="lg" className="bg-[#1B4332] hover:bg-[#1B4332]/90" data-testid="button-subscribe-blog">
                Subscribe to Newsletter <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
      <FooterV2 />
    </div>
  );
}
