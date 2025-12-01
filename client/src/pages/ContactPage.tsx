import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Mail, MessageSquare, Phone, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import HeaderV2 from '@/components/HeaderV2';
import FooterV2 from '@/components/FooterV2';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message Sent!",
      description: "We'll get back to you within 24 hours.",
    });
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <HeaderV2 />
      {/* Hero Section */}
      <section className="pt-32 pb-24">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="max-w-4xl mx-auto text-center">
            <span className="text-[#D4A574] font-medium tracking-wider text-sm uppercase mb-4 block">
              Contact
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-[#1B4332] mb-6" data-testid="heading-contact-hero">
              Get in Touch
            </h1>
            <p className="text-xl text-[#52796F] max-w-2xl mx-auto" data-testid="text-contact-description">
              Have questions? We're here to help. Reach out and we'll respond as soon as possible.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-light text-[#1B4332] mb-6">Send us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[#1B4332]">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="border-[#1B4332]/20 focus:border-[#1B4332]"
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
                    className="border-[#1B4332]/20 focus:border-[#1B4332]"
                    data-testid="input-contact-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-[#1B4332]">Subject</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    className="border-[#1B4332]/20 focus:border-[#1B4332]"
                    data-testid="input-contact-subject"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-[#1B4332]">Message</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={6}
                    required
                    className="border-[#1B4332]/20 focus:border-[#1B4332]"
                    data-testid="textarea-contact-message"
                  />
                </div>
                <Button type="submit" size="lg" className="w-full bg-[#1B4332] hover:bg-[#1B4332]/90" data-testid="button-contact-submit">
                  Send Message
                </Button>
              </form>
            </div>

            {/* Contact Information */}
            <div className="space-y-6">
              <h2 className="text-2xl font-light text-[#1B4332] mb-6">Contact Information</h2>
              
              <div className="bg-[#FAF7F2] rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <Mail className="w-5 h-5 text-[#1B4332] mt-1" />
                  <div>
                    <h3 className="text-lg font-medium text-[#1B4332] mb-1">Email</h3>
                    <p className="text-[#52796F]">support@ones.health</p>
                    <p className="text-xs text-[#52796F] mt-1">Response within 24 hours</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#FAF7F2] rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <MessageSquare className="w-5 h-5 text-[#1B4332] mt-1" />
                  <div>
                    <h3 className="text-lg font-medium text-[#1B4332] mb-1">Live Chat</h3>
                    <p className="text-[#52796F]">Available Mon-Fri, 9am-6pm PST</p>
                    <p className="text-xs text-[#52796F] mt-1">Click the chat icon in the bottom right</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#FAF7F2] rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <Phone className="w-5 h-5 text-[#1B4332] mt-1" />
                  <div>
                    <h3 className="text-lg font-medium text-[#1B4332] mb-1">Phone</h3>
                    <p className="text-[#52796F]">1-800-ONES-HELP</p>
                    <p className="text-xs text-[#52796F] mt-1">Mon-Fri, 9am-6pm PST</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#FAF7F2] rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <MapPin className="w-5 h-5 text-[#1B4332] mt-1" />
                  <div>
                    <h3 className="text-lg font-medium text-[#1B4332] mb-1">Office</h3>
                    <p className="text-[#52796F]">123 Health Street</p>
                    <p className="text-[#52796F]">San Francisco, CA 94102</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <FooterV2 />
    </div>
  );
}
