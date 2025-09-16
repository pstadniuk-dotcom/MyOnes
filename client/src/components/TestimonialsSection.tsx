import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import testimonialWoman from '@assets/generated_images/Customer_testimonial_woman_headshot_83cadbc6.png';
import testimonialMan from '@assets/generated_images/Customer_testimonial_man_headshot_e6097c8b.png';

export default function TestimonialsSection() {
  const testimonials = [
    {
      name: "Sarah Chen",
      age: 32,
      role: "Marketing Director",
      image: testimonialWoman,
      quote: "I went from struggling with afternoon energy crashes to feeling consistently energized throughout the day. My sleep quality improved dramatically within the first month.",
      results: [
        { metric: "Energy levels", improvement: "+85%" },
        { metric: "Sleep quality", improvement: "+70%" },
        { metric: "Stress management", improvement: "+60%" }
      ],
      timeFrame: "30 days"
    },
    {
      name: "Michael Rodriguez",
      age: 45,
      role: "Software Engineer",
      image: testimonialMan,
      quote: "As someone who tried everything, I was skeptical. But the AI-powered approach actually worked. My biomarkers improved and I feel 10 years younger.",
      results: [
        { metric: "Focus & clarity", improvement: "+90%" },
        { metric: "Recovery time", improvement: "+75%" },
        { metric: "Overall wellness", improvement: "+80%" }
      ],
      timeFrame: "90 days"
    }
  ];

  const stats = [
    { value: "87%", label: "Report better energy within 30 days" },
    { value: "92%", label: "Continue their subscription after 6 months" },
    { value: "78%", label: "See improvements in sleep quality" },
    { value: "10,000+", label: "Health journeys optimized with ONES" }
  ];

  const handleTestimonialClick = (name: string) => {
    console.log('Testimonial clicked:', name);
  };

  return (
    <section className="py-20 bg-muted/50" data-testid="section-testimonials">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground mb-6" data-testid="text-testimonials-headline">
            Real Results from Real People
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-testimonials-description">
            See how personalized nutrition is transforming health outcomes for thousands of people.
          </p>
        </div>

        {/* Key Statistics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-16 max-w-6xl mx-auto">
          {stats.map((stat, index) => (
            <div key={index} className="text-center" data-testid={`stat-${index}`}>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2" data-testid={`text-stat-value-${index}`}>
                {stat.value}
              </div>
              <p className="text-sm text-muted-foreground" data-testid={`text-stat-label-${index}`}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Testimonial Cards */}
        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto mb-16">
          {testimonials.map((testimonial, index) => (
            <Card 
              key={index}
              className="p-8 hover-elevate transition-all duration-300 cursor-pointer"
              onClick={() => handleTestimonialClick(testimonial.name)}
              data-testid={`card-testimonial-${index}`}
            >
              {/* Header */}
              <div className="flex items-center space-x-4 mb-6">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={testimonial.image} alt={testimonial.name} />
                  <AvatarFallback>{testimonial.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold text-foreground" data-testid={`text-testimonial-name-${index}`}>
                    {testimonial.name}, {testimonial.age}
                  </h3>
                  <p className="text-muted-foreground" data-testid={`text-testimonial-role-${index}`}>
                    {testimonial.role}
                  </p>
                </div>
              </div>

              {/* Star Rating */}
              <div className="flex items-center space-x-1 mb-4">
                {Array.from({length: 5}).map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-foreground italic mb-6 leading-relaxed" data-testid={`text-testimonial-quote-${index}`}>
                "{testimonial.quote}"
              </blockquote>

              {/* Results */}
              <div className="space-y-3 mb-4">
                <h4 className="text-sm font-medium text-muted-foreground">Results after {testimonial.timeFrame}:</h4>
                <div className="grid grid-cols-1 gap-2">
                  {testimonial.results.map((result, resultIndex) => (
                    <div key={resultIndex} className="flex justify-between items-center py-2 border-b border-border last:border-b-0">
                      <span className="text-sm text-foreground" data-testid={`text-result-metric-${index}-${resultIndex}`}>
                        {result.metric}
                      </span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                        {result.improvement}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Time Badge */}
              <div className="flex justify-end">
                <Badge variant="outline" data-testid={`badge-timeframe-${index}`}>
                  {testimonial.timeFrame} results
                </Badge>
              </div>
            </Card>
          ))}
        </div>

        {/* Social Proof */}
        <div className="text-center">
          <div className="inline-flex items-center space-x-8 bg-background p-6 rounded-lg shadow-sm">
            <div className="flex items-center space-x-2">
              <div className="flex -space-x-2">
                {[testimonialWoman, testimonialMan].map((img, i) => (
                  <Avatar key={i} className="w-8 h-8 border-2 border-background">
                    <AvatarImage src={img} alt={`Customer ${i + 1}`} />
                    <AvatarFallback>U{i + 1}</AvatarFallback>
                  </Avatar>
                ))}
                <div className="w-8 h-8 bg-primary rounded-full border-2 border-background flex items-center justify-center">
                  <span className="text-xs text-primary-foreground font-bold">+</span>
                </div>
              </div>
              <span className="text-sm text-muted-foreground">10,000+ members</span>
            </div>
            
            <div className="h-8 w-px bg-border"></div>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                {Array.from({length: 5}).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">4.9/5 average rating</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}