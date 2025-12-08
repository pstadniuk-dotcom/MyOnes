import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Clock, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import HeaderV2 from '@/components/HeaderV2';
import FooterV2 from '@/components/FooterV2';

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
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message Sent!",
      description: "We'll get back to you within 24-48 hours.",
    });
    setFormData({ name: '', email: '', inquiryType: '', message: '' });
  };

  const selectedInquiry = inquiryTypes.find(t => t.value === formData.inquiryType);

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <HeaderV2 />
      {/* Hero Section */}
      <section className="pt-32 pb-16">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="max-w-4xl mx-auto text-center">
            <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase mb-4 block">
              Contact
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-[#1B4332] mb-6" data-testid="heading-contact-hero">
              Get in Touch
            </h1>
            <p className="text-xl text-[#52796F] max-w-2xl mx-auto" data-testid="text-contact-description">
              Have questions? We're here to help. Select what you need help with and we'll get back to you as soon as possible.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-6 max-w-3xl">
          {/* Contact Form */}
          <div className="bg-[#FAF7F2] rounded-2xl p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[#1B4332]">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="border-[#1B4332]/20 focus:border-[#1B4332] bg-white"
                    data-testid="input-contact-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#1B4332]">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="border-[#1B4332]/20 focus:border-[#1B4332] bg-white"
                    data-testid="input-contact-email"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="inquiryType" className="text-[#1B4332]">What can we help you with?</Label>
                <Select
                  value={formData.inquiryType}
                  onValueChange={(value) => setFormData({ ...formData, inquiryType: value })}
                >
                  <SelectTrigger className="border-[#1B4332]/20 focus:border-[#1B4332] bg-white" data-testid="select-inquiry-type">
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
                  <p className="text-xs text-[#52796F] mt-1">{selectedInquiry.description}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-[#1B4332]">Message</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={6}
                  required
                  className="border-[#1B4332]/20 focus:border-[#1B4332] bg-white"
                  placeholder="Tell us more about your inquiry..."
                  data-testid="textarea-contact-message"
                />
              </div>
              
              <Button 
                type="submit" 
                size="lg" 
                className="w-full bg-[#1B4332] hover:bg-[#1B4332]/90" 
                data-testid="button-contact-submit"
                disabled={!formData.inquiryType}
              >
                Send Message
              </Button>
            </form>
          </div>

          {/* Info Cards */}
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            <div className="bg-[#FAF7F2] rounded-xl p-6 text-center">
              <Clock className="w-6 h-6 text-[#1B4332] mx-auto mb-3" />
              <h3 className="font-medium text-[#1B4332] mb-1">Quick Response</h3>
              <p className="text-sm text-[#52796F]">We typically respond within 24-48 hours</p>
            </div>
            <div className="bg-[#FAF7F2] rounded-xl p-6 text-center">
              <MessageSquare className="w-6 h-6 text-[#1B4332] mx-auto mb-3" />
              <h3 className="font-medium text-[#1B4332] mb-1">All Inquiries Welcome</h3>
              <p className="text-sm text-[#52796F]">Press, partnerships, support & more</p>
            </div>
            <div className="bg-[#FAF7F2] rounded-xl p-6 text-center">
              <Shield className="w-6 h-6 text-[#1B4332] mx-auto mb-3" />
              <h3 className="font-medium text-[#1B4332] mb-1">Secure & Private</h3>
              <p className="text-sm text-[#52796F]">Your information is protected</p>
            </div>
          </div>
        </div>
      </section>
      <FooterV2 />
    </div>
  );
}
