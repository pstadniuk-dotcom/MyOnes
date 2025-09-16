import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Beaker } from 'lucide-react';
import supplementImage from '@assets/generated_images/Premium_supplement_bottle_product_2500f07c.png';
import scienceImage from '@assets/generated_images/AI_health_data_visualization_85bb9ba3.png';

export default function ScienceSection() {
  const [hoveredIngredient, setHoveredIngredient] = useState<number | null>(null);

  const ingredients = [
    { name: "Ashwagandha", benefit: "Stress reduction", category: "Adaptogen" },
    { name: "Vitamin D3", benefit: "Immune support", category: "Vitamin" },
    { name: "Magnesium", benefit: "Sleep & recovery", category: "Mineral" },
    { name: "Omega-3", benefit: "Brain health", category: "Essential fatty acid" },
    { name: "B-Complex", benefit: "Energy metabolism", category: "Vitamin" },
    { name: "Turmeric", benefit: "Anti-inflammatory", category: "Herb" },
    { name: "Probiotics", benefit: "Gut health", category: "Microbiome" },
    { name: "CoQ10", benefit: "Cellular energy", category: "Antioxidant" }
  ];

  const handleIngredientHover = (index: number | null) => {
    setHoveredIngredient(index);
    if (index !== null) {
      console.log('Ingredient hovered:', ingredients[index].name);
    }
  };

  return (
    <section className="py-20 bg-background" data-testid="section-science">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground mb-6" data-testid="text-science-headline">
            The Science Behind Your Formula
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-science-description">
            We start with proven formula bases, then add targeted ingredients based on your unique health profile.
          </p>
        </div>

        {/* Formula Visualization */}
        <div className="max-w-6xl mx-auto mb-16">
          <div className="grid lg:grid-cols-3 gap-8 items-center">
            {/* Formula Base */}
            <div className="text-center">
              <Card className="p-8 hover-elevate">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Beaker className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2" data-testid="text-formula-base-title">
                  Formula Base
                </h3>
                <p className="text-muted-foreground mb-4">
                  Proven combinations for foundational health
                </p>
                <div className="space-y-2">
                  <Badge variant="secondary">Multivitamin complex</Badge>
                  <Badge variant="secondary">Essential minerals</Badge>
                  <Badge variant="secondary">Omega fatty acids</Badge>
                </div>
              </Card>
            </div>

            {/* Plus Symbol */}
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <Plus className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>

            {/* Individual Ingredients */}
            <div className="text-center">
              <Card className="p-8 hover-elevate">
                <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <img 
                    src={supplementImage} 
                    alt="Individual ingredients" 
                    className="w-12 h-12 object-contain"
                  />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2" data-testid="text-individual-ingredients-title">
                  Individual Ingredients
                </h3>
                <p className="text-muted-foreground mb-4">
                  Targeted additions based on your data
                </p>
                <div className="space-y-2">
                  <Badge variant="outline">Blood test insights</Badge>
                  <Badge variant="outline">Health goals</Badge>
                  <Badge variant="outline">Lifestyle factors</Badge>
                </div>
              </Card>
            </div>
          </div>

          {/* Equals Your ONES */}
          <div className="text-center mt-8">
            <div className="inline-flex items-center space-x-4">
              <div className="h-px w-16 bg-muted"></div>
              <span className="text-2xl font-bold text-primary">=</span>
              <div className="h-px w-16 bg-muted"></div>
            </div>
            <div className="mt-6">
              <Card className="inline-block p-6 bg-primary/5 border-2 border-primary/20">
                <h3 className="text-2xl font-serif font-bold text-primary" data-testid="text-your-ones-title">
                  Your ONES
                </h3>
                <p className="text-muted-foreground mt-2">Perfectly personalized for you</p>
              </Card>
            </div>
          </div>
        </div>

        {/* Ingredient Grid */}
        <div className="mb-16">
          <h3 className="text-2xl font-serif font-bold text-center text-foreground mb-8" data-testid="text-ingredients-grid-title">
            400+ Premium Ingredients, Infinite Combinations
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {ingredients.map((ingredient, index) => (
              <Card 
                key={index}
                className={`p-4 text-center hover-elevate cursor-pointer transition-all duration-300 ${
                  hoveredIngredient === index ? 'ring-2 ring-primary shadow-lg scale-105' : ''
                }`}
                onMouseEnter={() => handleIngredientHover(index)}
                onMouseLeave={() => handleIngredientHover(null)}
                data-testid={`card-ingredient-${index}`}
              >
                <h4 className="font-semibold text-foreground text-sm mb-1" data-testid={`text-ingredient-name-${index}`}>
                  {ingredient.name}
                </h4>
                <p className="text-xs text-muted-foreground mb-2" data-testid={`text-ingredient-benefit-${index}`}>
                  {ingredient.benefit}
                </p>
                <Badge variant="outline" className="text-xs">
                  {ingredient.category}
                </Badge>
                
                {hoveredIngredient === index && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-primary font-medium">
                      Clinically studied dosage
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Scientific Background */}
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <div>
            <img 
              src={scienceImage} 
              alt="AI-powered health data analysis" 
              className="w-full h-auto rounded-lg shadow-lg"
              data-testid="img-science-visualization"
            />
          </div>
          
          <div className="space-y-6">
            <h3 className="text-2xl font-serif font-bold text-foreground" data-testid="text-scientific-approach-title">
              Our Scientific Approach
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Evidence-based:</strong> Every ingredient is backed by peer-reviewed research
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Bioavailable forms:</strong> We use the most absorbable versions of each nutrient
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Optimal timing:</strong> Ingredients are balanced to work synergistically
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Third-party tested:</strong> Every batch is verified for purity and potency
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}