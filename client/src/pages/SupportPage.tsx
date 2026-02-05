import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  HelpCircle,
  MessageCircle,
  Mail,
  Book,
  Search,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus
} from 'lucide-react';
import { Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/use-toast';
import { apiRequest, queryClient } from '@/shared/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import type { FaqItem, SupportTicket, HelpArticle } from '@shared/schema';

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
            <h2 key={key++} className="text-2xl font-bold text-gray-900 mt-8 mb-4 first:mt-0">
              {content}
            </h2>
          ) : (
            <h3 key={key++} className="text-xl font-semibold text-gray-800 mt-6 mb-3">
              {content}
            </h3>
          )
        );
      } else if (sectionType === 'list') {
        elements.push(
          <ul key={key++} className="space-y-2 my-4 ml-6">
            {currentSection.map((item, idx) => (
              <li key={idx} className="text-gray-700 text-base leading-relaxed list-disc">
                {formatInlineText(item.replace(/^[-*]\s*/, ''))}
              </li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <p key={key++} className="text-gray-700 text-base leading-relaxed my-4">
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
          return <strong key={idx} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
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
    description: 'Learn the basics of using Ones AI',
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

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'resolved':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'in_progress':
      return <Clock className="w-4 h-4 text-yellow-600" />;
    case 'open':
      return <AlertCircle className="w-4 h-4 text-blue-600" />;
    case 'closed':
      return <CheckCircle className="w-4 h-4 text-gray-600" />;
    default:
      return <AlertCircle className="w-4 h-4 text-red-600" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'resolved':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'open':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    case 'closed':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    default:
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  }
};

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState('help');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Form state for new ticket
  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: '',
    description: '',
    priority: 'medium'
  });

  // Fetch FAQ items
  const { data: faqData, isLoading: faqLoading, error: faqError } = useQuery<{ faqItems: FaqItem[] }>({
    queryKey: ['/api/support/faq'],
  });

  // Fetch help articles
  const { data: helpData, isLoading: helpLoading } = useQuery<{ articles: HelpArticle[] }>({
    queryKey: ['/api/support/help'],
  });

  // Fetch user support tickets
  const { data: ticketsData, isLoading: ticketsLoading } = useQuery<{ tickets: SupportTicket[] }>({
    queryKey: ['/api/support/tickets'],
    enabled: !!user,
  });

  // Create support ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async (ticketData: typeof newTicket) => {
      const response = await apiRequest('POST', '/api/support/tickets', ticketData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Support ticket created',
        description: 'We\'ll get back to you within 24 hours.',
      });
      setNewTicket({
        subject: '',
        category: '',
        description: '',
        priority: 'medium'
      });
      // Invalidate tickets query to refetch
      queryClient.invalidateQueries({ queryKey: ['/api/support/tickets'] });
      setActiveTab('tickets');
    },
    onError: (error) => {
      toast({
        title: 'Error creating ticket',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    },
  });

  const faqItems = faqData?.faqItems || [];
  const helpArticles = helpData?.articles || [];
  const supportTickets = ticketsData?.tickets || [];

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
    return {
      ...config,
      articles: articlesInCategory
    };
  });

  const handleCreateTicket = () => {
    if (!newTicket.subject || !newTicket.description || !newTicket.category) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    createTicketMutation.mutate(newTicket);
  };

  return (
    <div className="space-y-6" data-testid="page-support">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-support-title">
            Help & Support
          </h1>
          <p className="text-muted-foreground">
            Get help, find answers, or contact our support team
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="help" data-testid="tab-help">Help Center</TabsTrigger>
          <TabsTrigger value="contact" data-testid="tab-contact">Contact Support</TabsTrigger>
          <TabsTrigger value="tickets" data-testid="tab-tickets">My Tickets</TabsTrigger>
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
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6" data-testid="breadcrumbs">
                  <button
                    onClick={() => {
                      setSelectedArticle(null);
                      setSelectedCategory(null);
                      setSearchQuery('');
                    }}
                    className="hover:text-foreground transition-colors"
                    data-testid="breadcrumb-home"
                  >
                    Help Center
                  </button>
                  <ChevronRight className="w-4 h-4" />
                  <button
                    onClick={() => {
                      setSelectedArticle(null);
                      setSelectedCategory(selectedArticle.category);
                      setSearchQuery('');
                    }}
                    className="hover:text-foreground transition-colors"
                    data-testid="breadcrumb-category"
                  >
                    {selectedArticle.category}
                  </button>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-foreground">{selectedArticle.title}</span>
                </div>

                {/* Back Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedArticle(null)}
                  className="mb-6"
                  data-testid="button-back"
                >
                  <ChevronRight className="w-4 h-4 rotate-180 mr-2" />
                  Back to Articles
                </Button>

                {/* Article Content */}
                <div className="space-y-6">
                  <div className="border-b pb-6">
                    <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900" data-testid="article-title">
                      {selectedArticle.title}
                    </h1>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">{selectedArticle.category}</Badge>
                      <span>•</span>
                      <span>Last updated {new Date(selectedArticle.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <ArticleContent content={selectedArticle.content} />
                </div>
              </CardContent>
            </Card>
          ) : selectedCategory ? (
            /* Category Article List View */
            <Card data-testid="section-category-articles">
              <CardContent className="pt-6">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6" data-testid="breadcrumbs">
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setSearchQuery('');
                    }}
                    className="hover:text-foreground transition-colors"
                    data-testid="breadcrumb-home"
                  >
                    Help Center
                  </button>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-foreground">{selectedCategory}</span>
                </div>

                {/* Category Title */}
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">{selectedCategory}</h2>
                  <p className="text-muted-foreground">
                    {helpArticles.filter(a => a.category === selectedCategory).length} articles
                  </p>
                </div>

                {/* Article Cards Grid */}
                <div className="grid gap-4 md:grid-cols-2" data-testid="article-cards-grid">
                  {helpArticles
                    .filter(article => article.category === selectedCategory)
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((article) => {
                      const excerpt = article.content.slice(0, 150) + (article.content.length > 150 ? '...' : '');
                      return (
                        <Card
                          key={article.id}
                          className="hover-elevate cursor-pointer transition-all"
                          onClick={() => {
                            setSelectedArticle(article);
                            setSelectedCategory(article.category);
                          }}
                          data-testid={`article-card-${article.id}`}
                        >
                          <CardContent className="pt-6">
                            <h3 className="font-semibold mb-2 line-clamp-2">
                              {article.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                              {excerpt}
                            </p>
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-xs">
                                Updated {new Date(article.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </Badge>
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          ) : searchQuery ? (
            /* Search Results - Article Cards */
            filteredArticles.length > 0 ? (
              <Card data-testid="section-search-results">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Search Results
                  </CardTitle>
                  <CardDescription>
                    Found {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredArticles.map((article) => {
                      const excerpt = article.content.slice(0, 150) + (article.content.length > 150 ? '...' : '');
                      return (
                        <Card
                          key={article.id}
                          className="hover-elevate cursor-pointer transition-all"
                          onClick={() => {
                            setSelectedArticle(article);
                            setSelectedCategory(article.category);
                          }}
                          data-testid={`search-result-${article.id}`}
                        >
                          <CardContent className="pt-6">
                            <div className="mb-2">
                              <Badge variant="secondary" className="text-xs mb-2">
                                {article.category}
                              </Badge>
                            </div>
                            <h3 className="font-semibold mb-2 line-clamp-2">
                              {article.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                              {excerpt}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                Updated {new Date(article.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : null
          ) : (
            /* Default View - Category Cards */
            <div className="grid gap-4 md:grid-cols-2" data-testid="category-cards-grid">
              {helpCategories.map((category, idx) => (
                <Card
                  key={idx}
                  className="hover-elevate transition-all cursor-pointer"
                  onClick={() => setSelectedCategory(category.category)}
                  data-testid={`category-card-${category.category.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <category.icon className="w-5 h-5 text-primary" />
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-2">{category.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{category.description}</p>
                    <Badge variant="secondary" className="text-xs">
                      {category.articles} articles
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* FAQ Section */}
          <Card data-testid="section-faq">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Frequently Asked Questions
              </CardTitle>
              <CardDescription>
                Find quick answers to common questions
              </CardDescription>
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
                    <AccordionItem key={item.id} value={item.id} data-testid={`faq-${item.id}`}>
                      <AccordionTrigger className="text-left text-sm">{item.question}</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : searchQuery ? (
                <div className="text-center py-8">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No results found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Try different keywords or contact support for personalized help
                  </p>
                  <Button variant="outline" onClick={() => setActiveTab('contact')} data-testid="button-contact-support">
                    Contact Support
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No FAQs available yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Check back soon for helpful answers to common questions
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-6">
          {/* Contact Options */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card data-testid="section-contact-form">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Submit a Support Ticket
                </CardTitle>
                <CardDescription>
                  Get personalized help from our support team
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="ticket-subject">Subject</Label>
                    <Input
                      id="ticket-subject"
                      placeholder="Brief description of your issue"
                      value={newTicket.subject}
                      onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                      data-testid="input-ticket-subject"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ticket-category">Category</Label>
                    <Select value={newTicket.category} onValueChange={(value) => setNewTicket({ ...newTicket, category: value })}>
                      <SelectTrigger data-testid="select-ticket-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="formula">Formula & Health</SelectItem>
                        <SelectItem value="billing">Billing & Account</SelectItem>
                        <SelectItem value="technical">Technical Issue</SelectItem>
                        <SelectItem value="shipping">Shipping & Delivery</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="ticket-priority">Priority</Label>
                  <Select value={newTicket.priority} onValueChange={(value) => setNewTicket({ ...newTicket, priority: value })}>
                    <SelectTrigger data-testid="select-ticket-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="ticket-message">Message</Label>
                  <Textarea
                    id="ticket-message"
                    placeholder="Please provide as much detail as possible about your issue..."
                    className="min-h-[120px]"
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                    data-testid="textarea-ticket-message"
                  />
                </div>

                <Button
                  className="w-full"
                  disabled={!newTicket.subject || !newTicket.description || !newTicket.category || createTicketMutation.isPending}
                  onClick={handleCreateTicket}
                  data-testid="button-submit-ticket"
                >
                  {createTicketMutation.isPending ? 'Creating...' : 'Submit Support Ticket'}
                </Button>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <div className="space-y-6">
              <Card data-testid="section-contact-info">
                <CardHeader>
                  <CardTitle>Email Support</CardTitle>
                  <CardDescription>
                    Prefer email? Send us a message and we'll respond within 24 hours
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4 p-4 bg-primary/5 border rounded-lg">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-lg mb-1">support@ones.ai</div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Our support team typically responds within 24 hours during business days
                      </p>
                      <div className="text-xs text-muted-foreground">
                        <strong>Note:</strong> For faster assistance, we recommend submitting a support ticket using the form above
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="section-emergency-contact">
                <CardHeader>
                  <CardTitle className="text-red-600">Medical Emergency</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200">
                    <p className="text-sm text-red-800 dark:text-red-300 mb-3">
                      <strong>Important:</strong> Ones AI provides supplement recommendations, not medical advice.
                      For medical emergencies, please contact emergency services immediately.
                    </p>
                    <div className="space-y-1 text-sm text-red-700 dark:text-red-400">
                      <div><strong>Emergency:</strong> 911</div>
                      <div><strong>Poison Control:</strong> 1-800-222-1222</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-6">
          <Card data-testid="section-support-tickets">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>My Support Tickets</CardTitle>
                  <CardDescription>
                    Track your support requests and responses
                  </CardDescription>
                </div>
                <Button onClick={() => setActiveTab('contact')} data-testid="button-new-ticket">
                  <Plus className="w-4 h-4 mr-2" />
                  New Ticket
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {ticketsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-6 w-1/2" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                  ))}
                </div>
              ) : supportTickets.length > 0 ? (
                <div className="space-y-4">
                  {supportTickets.map((ticket) => (
                    <Card key={ticket.id} className="hover-elevate cursor-pointer" data-testid={`ticket-${ticket.id}`}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(ticket.status)}
                              <span className="font-medium">{ticket.id.slice(0, 8)}...</span>
                            </div>
                            <Badge className={getStatusColor(ticket.status)}>
                              {ticket.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <h4 className="font-medium mb-2">{ticket.subject}</h4>
                        <div className="text-sm text-muted-foreground">
                          Last updated: {new Date(ticket.updatedAt).toLocaleDateString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No support tickets yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    When you contact support, your tickets will appear here
                  </p>
                  <Button onClick={() => setActiveTab('contact')} data-testid="button-create-first-ticket">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Create Your First Ticket
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}