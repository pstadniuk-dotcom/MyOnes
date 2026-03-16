import { useState, useEffect } from 'react';
import { useSearch } from 'wouter';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { MessageSquare, Clock, Shield } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';
import HeaderV2 from '@/features/marketing/components/HeaderV2';
import FooterV2 from '@/features/marketing/components/FooterV2';

const inquiryTypes = [
  { value: "support", label: "General Support", description: "Questions about your account or supplements" },
  { value: "press", label: "Press & Media", description: "Media inquiries, interviews, press releases" },
  { value: "creator", label: "Creator / Influencer", description: "Collaboration and partnership opportunities" },
  { value: "partnership", label: "Business Partnership", description: "B2B partnerships and integrations" },
  { value: "feedback", label: "Product Feedback", description: "Share your experience and suggestions" },
  { value: "billing", label: "Billing Question", description: "Subscription, payments, refunds" },
  { value: "other", label: "Other", description: "Anything else we can help with" },
];

export default function ContactPage() {
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const typeFromUrl = searchParams.get('type');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    inquiryType: '',
    message: ''
  });
  const { toast } = useToast();

  // Auto-select inquiry type from URL param
  useEffect(() => {
    if (typeFromUrl && inquiryTypes.some(t => t.value === typeFromUrl)) {
      setFormData(prev => ({ ...prev, inquiryType: typeFromUrl }));
    }
  }, [typeFromUrl]);

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          category: formData.inquiryType,
          subject: `${formData.inquiryType} inquiry from ${formData.name}`,
          message: formData.message,
          source: 'contact_form',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit');
      }

      toast({
        title: "Message Sent!",
        description: "We'll get back to you within 24-48 hours.",
      });
      setFormData({ name: '', email: '', inquiryType: '', message: '' });
    } catch {
      toast({
        title: "Failed to send",
        description: "Please try again or email us directly at support@ones.health",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedInquiry = inquiryTypes.find(t => t.value === formData.inquiryType);

  return (
    <div className="min-h-screen bg-[#ede8e2]">
      <HeaderV2 />
      {/* Hero Section */}
      <section className="pt-32 pb-16">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="max-w-4xl mx-auto text-center">
            <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase mb-4 block">
              Contact
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-[#054700] mb-6" data-testid="heading-contact-hero">
              Get in Touch
            </h1>
            <p className="text-xl text-[#5a6623] max-w-2xl mx-auto" data-testid="text-contact-description">
              Have questions? We're here to help. Select what you need help with and we'll get back to you as soon as possible.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-6 max-w-3xl">
          {/* Contact Form */}
          <div className="bg-[#ede8e2] rounded-2xl p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[#054700]">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="border-[#054700]/20 focus:border-[#054700] bg-white"
                    data-testid="input-contact-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#054700]">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="border-[#054700]/20 focus:border-[#054700] bg-white"
                    data-testid="input-contact-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inquiryType" className="text-[#054700]">What can we help you with?</Label>
                <Select
                  value={formData.inquiryType}
                  onValueChange={(value) => setFormData({ ...formData, inquiryType: value })}
                >
                  <SelectTrigger className="border-[#054700]/20 focus:border-[#054700] bg-white" data-testid="select-inquiry-type">
                    <SelectValue placeholder="Select inquiry type" />
                  </SelectTrigger>
                  <SelectContent>
                    {inquiryTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex flex-col">
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedInquiry && (
                  <p className="text-xs text-[#5a6623] mt-1">{selectedInquiry.description}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-[#054700]">Message</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={6}
                  required
                  className="border-[#054700]/20 focus:border-[#054700] bg-white"
                  placeholder="Tell us more about your inquiry..."
                  data-testid="textarea-contact-message"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full bg-[#054700] hover:bg-[#054700]/90"
                data-testid="button-contact-submit"
                disabled={!formData.inquiryType}
              >
                Send Message
              </Button>
            </form>
          </div>

          {/* Info Cards */}
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            <div className="bg-[#ede8e2] rounded-xl p-6 text-center">
              <Clock className="w-6 h-6 text-[#054700] mx-auto mb-3" />
              <h3 className="font-medium text-[#054700] mb-1">Quick Response</h3>
              <p className="text-sm text-[#5a6623]">We typically respond within 24-48 hours</p>
            </div>
            <div className="bg-[#ede8e2] rounded-xl p-6 text-center">
              <MessageSquare className="w-6 h-6 text-[#054700] mx-auto mb-3" />
              <h3 className="font-medium text-[#054700] mb-1">All Inquiries Welcome</h3>
              <p className="text-sm text-[#5a6623]">Press, partnerships, support & more</p>
            </div>
            <div className="bg-[#ede8e2] rounded-xl p-6 text-center">
              <Shield className="w-6 h-6 text-[#054700] mx-auto mb-3" />
              <h3 className="font-medium text-[#054700] mb-1">Secure & Private</h3>
              <p className="text-sm text-[#5a6623]">Your information is protected</p>
            </div>
          </div>
        </div>
      </section>
      <FooterV2 />
    </div>
  );
}
