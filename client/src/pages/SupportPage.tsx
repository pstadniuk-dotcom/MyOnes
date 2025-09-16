import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  HelpCircle, 
  MessageCircle, 
  Phone, 
  Mail, 
  Book, 
  ExternalLink,
  Search,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus
} from 'lucide-react';
import { Link } from 'wouter';

// Mock data for help articles and tickets
const faqItems = [
  {
    id: 'faq-1',
    question: 'How does ONES AI create my personalized formula?',
    answer: 'ONES AI analyzes your health profile, lab results, symptoms, and goals using advanced algorithms. It considers nutrient interactions, bioavailability, and your unique biochemistry to create an optimized supplement formula tailored specifically for you.'
  },
  {
    id: 'faq-2',
    question: 'How often will my formula be updated?',
    answer: 'Your formula is reviewed every 8-12 weeks or when you upload new lab results. ONES AI continuously learns from your feedback and progress to make adjustments that optimize your health outcomes.'
  },
  {
    id: 'faq-3',
    question: 'Is it safe to upload my lab results?',
    answer: 'Yes, your health data is encrypted and stored securely. We use bank-level security protocols and never share your personal health information with third parties. You maintain full control over your data.'
  },
  {
    id: 'faq-4',
    question: 'What if I have allergies or take medications?',
    answer: 'ONES AI factors in all allergies and medications you\'ve listed in your profile. Our AI checks for potential interactions and contraindications to ensure your formula is safe and compatible with your existing treatments.'
  },
  {
    id: 'faq-5',
    question: 'Can I pause or cancel my subscription?',
    answer: 'Yes, you can pause or cancel your subscription at any time from your Orders & Billing page. Paused subscriptions can be resumed when you\'re ready, and cancellations take effect at the end of your current billing cycle.'
  },
  {
    id: 'faq-6',
    question: 'How long does shipping take?',
    answer: 'Standard shipping takes 3-5 business days within the US. You\'ll receive tracking information once your order ships, and we offer expedited shipping options for faster delivery.'
  }
];

const supportTickets = [
  {
    id: 'TIC-001',
    subject: 'Question about Vitamin D dosage',
    status: 'resolved',
    createdAt: '2024-09-20',
    lastUpdate: '2024-09-21',
  },
  {
    id: 'TIC-002',
    subject: 'Billing question - double charge',
    status: 'in-progress',
    createdAt: '2024-09-22',
    lastUpdate: '2024-09-23',
  }
];

const helpCategories = [
  {
    title: 'Getting Started',
    description: 'Learn the basics of using ONES AI',
    icon: Book,
    articles: 8
  },
  {
    title: 'Formula & Health',
    description: 'Understanding your personalized formula',
    icon: HelpCircle,
    articles: 12
  },
  {
    title: 'Billing & Subscription',
    description: 'Managing your account and payments',
    icon: AlertCircle,
    articles: 6
  },
  {
    title: 'Technical Support',
    description: 'Troubleshooting and technical issues',
    icon: MessageCircle,
    articles: 4
  }
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'resolved':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'in-progress':
      return <Clock className="w-4 h-4 text-yellow-600" />;
    default:
      return <AlertCircle className="w-4 h-4 text-red-600" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'resolved':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'in-progress':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    default:
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  }
};

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState('help');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state for new ticket
  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: '',
    message: '',
    priority: 'medium'
  });

  const filteredFAQs = faqItems.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

          {/* Help Categories */}
          {!searchQuery && (
            <div className="grid gap-4 md:grid-cols-2">
              {helpCategories.map((category, idx) => (
                <Card key={idx} className="hover-elevate transition-colors cursor-pointer" data-testid={`help-category-${idx}`}>
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
              <Accordion type="single" collapsible className="w-full">
                {filteredFAQs.map((item) => (
                  <AccordionItem key={item.id} value={item.id} data-testid={`faq-${item.id}`}>
                    <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {filteredFAQs.length === 0 && searchQuery && (
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
              )}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card data-testid="section-quick-links">
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
              <CardDescription>
                Common actions and helpful resources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                <Button variant="outline" className="justify-start h-auto p-4" asChild data-testid="link-ai-consultation">
                  <Link href="/dashboard/consultation">
                    <div>
                      <div className="font-medium">Ask ONES AI</div>
                      <div className="text-sm text-muted-foreground">Get instant help from our AI assistant</div>
                    </div>
                  </Link>
                </Button>
                
                <Button variant="outline" className="justify-start h-auto p-4" asChild data-testid="link-formula-help">
                  <Link href="/dashboard/formula">
                    <div>
                      <div className="font-medium">Understand My Formula</div>
                      <div className="text-sm text-muted-foreground">Learn about your supplement formula</div>
                    </div>
                  </Link>
                </Button>

                <Button variant="outline" className="justify-start h-auto p-4" asChild data-testid="link-upload-labs">
                  <Link href="/dashboard/profile?tab=reports">
                    <div>
                      <div className="font-medium">Upload Lab Results</div>
                      <div className="text-sm text-muted-foreground">Add blood work for better recommendations</div>
                    </div>
                  </Link>
                </Button>

                <Button variant="outline" className="justify-start h-auto p-4" asChild data-testid="link-billing-help">
                  <Link href="/dashboard/orders">
                    <div>
                      <div className="font-medium">Billing & Orders</div>
                      <div className="text-sm text-muted-foreground">Manage subscription and payments</div>
                    </div>
                  </Link>
                </Button>
              </div>
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
                      onChange={(e) => setNewTicket({...newTicket, subject: e.target.value})}
                      data-testid="input-ticket-subject"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ticket-category">Category</Label>
                    <Select value={newTicket.category} onValueChange={(value) => setNewTicket({...newTicket, category: value})}>
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
                  <Select value={newTicket.priority} onValueChange={(value) => setNewTicket({...newTicket, priority: value})}>
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
                    value={newTicket.message}
                    onChange={(e) => setNewTicket({...newTicket, message: e.target.value})}
                    data-testid="textarea-ticket-message"
                  />
                </div>

                <Button 
                  className="w-full" 
                  disabled={!newTicket.subject || !newTicket.message || !newTicket.category}
                  data-testid="button-submit-ticket"
                >
                  Submit Support Ticket
                </Button>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <div className="space-y-6">
              <Card data-testid="section-contact-info">
                <CardHeader>
                  <CardTitle>Other Ways to Reach Us</CardTitle>
                  <CardDescription>
                    Multiple channels for getting help and support
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Mail className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">Email Support</div>
                      <div className="text-sm text-muted-foreground">support@ones.ai</div>
                      <div className="text-xs text-muted-foreground">Response within 24 hours</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Phone className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">Phone Support</div>
                      <div className="text-sm text-muted-foreground">1-800-ONES-AI</div>
                      <div className="text-xs text-muted-foreground">Mon-Fri, 9AM-6PM EST</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <MessageCircle className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">Live Chat</div>
                      <div className="text-sm text-muted-foreground">Available on website</div>
                      <div className="text-xs text-muted-foreground">Mon-Fri, 9AM-6PM EST</div>
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
                      <strong>Important:</strong> ONES AI provides supplement recommendations, not medical advice. 
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
              {supportTickets.length > 0 ? (
                <div className="space-y-4">
                  {supportTickets.map((ticket) => (
                    <Card key={ticket.id} className="hover-elevate cursor-pointer" data-testid={`ticket-${ticket.id}`}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(ticket.status)}
                              <span className="font-medium">{ticket.id}</span>
                            </div>
                            <Badge className={getStatusColor(ticket.status)}>
                              {ticket.status.replace('-', ' ')}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <h4 className="font-medium mb-2">{ticket.subject}</h4>
                        <div className="text-sm text-muted-foreground">
                          Last updated: {new Date(ticket.lastUpdate).toLocaleDateString()}
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