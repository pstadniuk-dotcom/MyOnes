import { Link } from "wouter";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { useToast } from "@/shared/hooks/use-toast";
import { MessageSquare } from "lucide-react";

const footerLinks = {
  product: [
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Science", href: "/science" },
  ],
  company: [
    { label: "About", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Partnerships", href: "/partnerships" },
  ],
  legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Disclaimer", href: "/disclaimer" },
  ],
};

const inquiryTypes = [
  { value: "support", label: "General Support" },
  { value: "press", label: "Press & Media" },
  { value: "creator", label: "Creator / Influencer" },
  { value: "partnership", label: "Partnership Inquiry" },
  { value: "feedback", label: "Product Feedback" },
  { value: "billing", label: "Billing Question" },
  { value: "other", label: "Other" },
];

function ContactDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    inquiryType: '',
    message: ''
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message Sent!",
      description: "We'll get back to you within 24-48 hours.",
    });
    setFormData({ name: '', email: '', inquiryType: '', message: '' });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-[#52796F] hover:text-[#1B4332] text-sm cursor-pointer transition-colors text-left">
          Contact Us
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-[#FAF7F2]">
        <DialogHeader>
          <DialogTitle className="text-[#1B4332] flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Get in Touch
          </DialogTitle>
          <DialogDescription className="text-[#52796F]">
            Send us a message and we'll respond within 24-48 hours.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="footer-name" className="text-[#1B4332]">Name</Label>
            <Input
              id="footer-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="border-[#1B4332]/20 focus:border-[#1B4332] bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="footer-email" className="text-[#1B4332]">Email</Label>
            <Input
              id="footer-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="border-[#1B4332]/20 focus:border-[#1B4332] bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="footer-inquiry" className="text-[#1B4332]">What can we help with?</Label>
            <Select
              value={formData.inquiryType}
              onValueChange={(value) => setFormData({ ...formData, inquiryType: value })}
              required
            >
              <SelectTrigger className="border-[#1B4332]/20 focus:border-[#1B4332] bg-white">
                <SelectValue placeholder="Select inquiry type" />
              </SelectTrigger>
              <SelectContent>
                {inquiryTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="footer-message" className="text-[#1B4332]">Message</Label>
            <Textarea
              id="footer-message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={4}
              required
              className="border-[#1B4332]/20 focus:border-[#1B4332] bg-white"
              placeholder="Tell us more about your inquiry..."
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-[#1B4332] hover:bg-[#1B4332]/90"
            disabled={!formData.inquiryType}
          >
            Send Message
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function FooterV2() {
  return (
    <footer className="bg-[#FAF7F2] border-t border-[#1B4332]/10">
      <div className="container mx-auto px-6 max-w-7xl py-16">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/">
              <span className="text-2xl font-semibold text-[#1B4332] tracking-tight cursor-pointer">
                ONES
              </span>
            </Link>
            <p className="mt-4 text-[#52796F] text-sm leading-relaxed">
              Personalized supplements powered by AI. Built from your unique biology.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-medium text-[#1B4332] mb-4">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>
                    <span className="text-[#52796F] hover:text-[#1B4332] text-sm cursor-pointer transition-colors">
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-[#1B4332] mb-4">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>
                    <span className="text-[#52796F] hover:text-[#1B4332] text-sm cursor-pointer transition-colors">
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
              <li>
                <ContactDialog />
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-[#1B4332] mb-4">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>
                    <span className="text-[#52796F] hover:text-[#1B4332] text-sm cursor-pointer transition-colors">
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-[#1B4332]/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#52796F] text-sm">
            © {new Date().getFullYear()} ONES Health. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-[#52796F]">
            <span>HIPAA Compliant</span>
            <span>•</span>
            <span>GMP Certified</span>
            <span>•</span>
            <span>Made in USA</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
