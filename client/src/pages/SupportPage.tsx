import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/components/ui/accordion';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  HelpCircle,
  MessageCircle,
  Mail,
  Book,
  Search,
  ChevronRight,
  AlertCircle,
  Phone,
  Smartphone,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { FaqItem, HelpArticle } from '@shared/schema';

// Article content renderer with better formatting
function ArticleContent({ content }: { content: string }) {
  // Split content into sections and format
  const formatContent = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let currentSection: string[] = [];
    let sectionType: 'paragraph' | 'list' | 'heading' = 'paragraph';
    let key = 0;

    const flushSection = () => {
      if (currentSection.length === 0) return;

      const content = currentSection.join('\n').trim();
      if (!content) return;

      if (sectionType === 'heading') {
        // Check heading level based on content (ALL CAPS = h2, sentence case = h3)
        const isMainHeading = content === content.toUpperCase() && content.length > 3;
        elements.push(
          isMainHeading ? (
            <h2 key={key++} className="text-2xl font-bold text-[#054700] mt-8 mb-4 first:mt-0">
              {content}
            </h2>
          ) : (
            <h3 key={key++} className="text-xl font-semibold text-[#054700] mt-6 mb-3">
              {content}
            </h3>
          )
        );
      } else if (sectionType === 'list') {
        elements.push(
          <ul key={key++} className="space-y-2 my-4 ml-6">
            {currentSection.map((item, idx) => (
              <li key={idx} className="text-[#054700]/80 text-base leading-relaxed list-disc">
                {formatInlineText(item.replace(/^[-*]\s*/, ''))}
              </li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <p key={key++} className="text-[#054700]/80 text-base leading-relaxed my-4">
            {formatInlineText(content)}
          </p>
        );
      }

      currentSection = [];
    };

    const formatInlineText = (text: string) => {
      // Convert **bold** to <strong>
      const parts = text.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={idx} className="font-semibold text-[#054700]">{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Empty line - flush current section
      if (!trimmed) {
        flushSection();
        sectionType = 'paragraph';
        return;
      }

      // Heading detection (ALL CAPS lines or lines that look like headings)
      if (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && !trimmed.match(/^[-*]/)) {
        flushSection();
        sectionType = 'heading';
        currentSection.push(trimmed);
        flushSection();
        return;
      }

      // List item detection
      if (trimmed.match(/^[-*]\s+/)) {
        if (sectionType !== 'list') {
          flushSection();
          sectionType = 'list';
        }
        currentSection.push(trimmed);
        return;
      }

      // Regular paragraph
      if (sectionType !== 'paragraph') {
        flushSection();
        sectionType = 'paragraph';
      }
      currentSection.push(trimmed);
    });

    flushSection();
    return elements;
  };

  return (
    <div className="article-content max-w-3xl" data-testid="article-content">
      {formatContent(content)}
    </div>
  );
}

// Help category configurations
const helpCategoryConfigs = [
  {
    title: 'Getting Started',
    description: 'Learn the basics of using Ones',
    icon: Book,
    category: 'Getting Started'
  },
  {
    title: 'Formula & Health',
    description: 'Understanding your personalized formula',
    icon: HelpCircle,
    category: 'Formula & Health'
  },
  {
    title: 'Billing & Subscription',
    description: 'Managing your account and payments',
    icon: AlertCircle,
    category: 'Billing & Subscription'
  },
  {
    title: 'Technical Support',
    description: 'Troubleshooting and technical issues',
    icon: MessageCircle,
    category: 'Technical Support'
  }
];

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState('help');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);

  // Fetch FAQ items
  const { data: faqData, isLoading: faqLoading, error: faqError } = useQuery<{ faqItems: FaqItem[] }>({
    queryKey: ['/api/support/faq'],
  });

  // Fetch help articles
  const { data: helpData } = useQuery<{ articles: HelpArticle[] }>({
    queryKey: ['/api/support/help'],
  });

  const faqItems = faqData?.faqItems || [];
  const helpArticles = helpData?.articles || [];

  // Filter FAQs based on search query
  const filteredFAQs = faqItems.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter help articles based on search query
  const filteredArticles = helpArticles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Generate help categories with article counts
  const helpCategories = helpCategoryConfigs.map(config => {
    const articlesInCategory = helpArticles.filter(article =>
      article.category === config.category
    ).length;
    return { ...config, articles: articlesInCategory };
  });

  return (
    <div className="space-y-6" data-testid="page-support">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-support-title">
            Help & Support
          </h1>
          <p className="text-muted-foreground">
            Get help, find answers, or contact our team
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="help" data-testid="tab-help">Help Center</TabsTrigger>
          <TabsTrigger value="contact" data-testid="tab-contact">Contact Us</TabsTrigger>
        </TabsList>

        <TabsContent value="help" className="space-y-6">
          {/* Search */}
          <Card data-testid="section-help-search">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search help articles and FAQs..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-help-search"
                />
              </div>
            </CardContent>
          </Card>

          {/* Article Detail View */}
          {selectedArticle ? (
            <Card data-testid="section-article-detail">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                  <button onClick={() => { setSelectedArticle(null); setSelectedCategory(null); setSearchQuery(''); }} className="hover:text-foreground transition-colors">
                    Help Center
                  </button>
                  <ChevronRight className="w-4 h-4" />
                  <button onClick={() => { setSelectedArticle(null); setSelectedCategory(selectedArticle.category); setSearchQuery(''); }} className="hover:text-foreground transition-colors">
                    {selectedArticle.category}
                  </button>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-foreground">{selectedArticle.title}</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedArticle(null)} className="mb-6">
                  <ChevronRight className="w-4 h-4 rotate-180 mr-2" />
                  Back to Articles
                </Button>
                <div className="space-y-6">
                  <div className="border-b pb-6">
                    <h1 className="text-3xl md:text-4xl font-bold mb-3 text-[#054700]">{selectedArticle.title}</h1>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">{selectedArticle.category}</Badge>
                      <span>Last updated {new Date(selectedArticle.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <ArticleContent content={selectedArticle.content} />
                </div>
              </CardContent>
            </Card>
          ) : selectedCategory ? (
            <Card data-testid="section-category-articles">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                  <button onClick={() => { setSelectedCategory(null); setSearchQuery(''); }} className="hover:text-foreground transition-colors">Help Center</button>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-foreground">{selectedCategory}</span>
                </div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">{selectedCategory}</h2>
                  <p className="text-muted-foreground">{helpArticles.filter(a => a.category === selectedCategory).length} articles</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {helpArticles
                    .filter(article => article.category === selectedCategory)
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((article) => (
                      <Card key={article.id} className="hover-elevate cursor-pointer transition-all" onClick={() => { setSelectedArticle(article); setSelectedCategory(article.category); }}>
                        <CardContent className="pt-6">
                          <h3 className="font-semibold mb-2 line-clamp-2">{article.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{article.content.slice(0, 150)}...</p>
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">Updated {new Date(article.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Badge>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </CardContent>
            </Card>
          ) : searchQuery && filteredArticles.length > 0 ? (
            <Card data-testid="section-search-results">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Search className="w-5 h-5" />Search Results</CardTitle>
                <CardDescription>Found {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredArticles.map((article) => (
                    <Card key={article.id} className="hover-elevate cursor-pointer transition-all" onClick={() => { setSelectedArticle(article); setSelectedCategory(article.category); }}>
                      <CardContent className="pt-6">
                        <Badge variant="secondary" className="text-xs mb-2">{article.category}</Badge>
                        <h3 className="font-semibold mb-2 line-clamp-2">{article.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{article.content.slice(0, 150)}...</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2" data-testid="category-cards-grid">
              {helpCategories.map((category, idx) => (
                <Card key={idx} className="hover-elevate transition-all cursor-pointer" onClick={() => setSelectedCategory(category.category)}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg"><category.icon className="w-5 h-5 text-primary" /></div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-2">{category.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{category.description}</p>
                    <Badge variant="secondary" className="text-xs">{category.articles} articles</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* FAQ Section */}
          <Card data-testid="section-faq">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><HelpCircle className="w-5 h-5" />Frequently Asked Questions</CardTitle>
              <CardDescription>Find quick answers to common questions</CardDescription>
            </CardHeader>
            <CardContent>
              {faqLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : faqError ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">Failed to load FAQs</h3>
                  <p className="text-sm text-muted-foreground">Please try again later.</p>
                </div>
              ) : filteredFAQs.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {filteredFAQs.map((item) => (
                    <AccordionItem key={item.id} value={item.id}>
                      <AccordionTrigger className="text-left text-sm">{item.question}</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{item.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : searchQuery ? (
                <div className="text-center py-8">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No results found</h3>
                  <p className="text-sm text-muted-foreground mb-4">Try different keywords or reach out to us directly</p>
                  <Button variant="outline" onClick={() => setActiveTab('contact')}>Contact Us</Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No FAQs available yet</h3>
                  <p className="text-sm text-muted-foreground">Check back soon for helpful answers to common questions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-6">
          {/* Contact Methods */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card data-testid="section-contact-email">
              <CardContent className="pt-6 text-center">
                <div className="p-4 bg-primary/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Email Us</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Send us an email and we'll get back to you within 24 hours
                </p>
                <a
                  href="mailto:support@ones.health"
                  className="text-primary font-medium hover:underline text-lg"
                >
                  support@ones.health
                </a>
              </CardContent>
            </Card>

            <Card data-testid="section-contact-phone">
              <CardContent className="pt-6 text-center">
                <div className="p-4 bg-primary/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Phone className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Call Us</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Speak with our team Monday–Friday, 9am–5pm EST
                </p>
                <a
                  href="tel:+13414443914"
                  className="text-primary font-medium hover:underline text-lg"
                >
                  (341) 444-3914
                </a>
              </CardContent>
            </Card>

            <Card data-testid="section-contact-text">
              <CardContent className="pt-6 text-center">
                <div className="p-4 bg-primary/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Smartphone className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Text Us</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Send a text for quick questions — we usually reply within minutes
                </p>
                <a
                  href="sms:+13414443914"
                  className="text-primary font-medium hover:underline text-lg"
                >
                  (341) 444-3914
                </a>
              </CardContent>
            </Card>
          </div>

          {/* Medical Emergency */}
          <Card data-testid="section-emergency-contact">
            <CardHeader>
              <CardTitle className="text-red-600">Medical Emergency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200">
                <p className="text-sm text-red-800 dark:text-red-300 mb-3">
                  <strong>Important:</strong> Ones provides supplement recommendations, not medical advice.
                  For medical emergencies, please contact emergency services immediately.
                </p>
                <div className="space-y-1 text-sm text-red-700 dark:text-red-400">
                  <div><strong>Emergency:</strong> 911</div>
                  <div><strong>Poison Control:</strong> 1-800-222-1222</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
