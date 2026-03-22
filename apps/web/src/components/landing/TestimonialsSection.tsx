import { Star } from "lucide-react";

const testimonials = [
  { name: "Marcus Rivera", role: "Regional Sales Manager — Southeast", quote: "XPS Intelligence cut my lead research time by 70%. The AI assistant is like having a senior sales analyst on every call.", rating: 5 },
  { name: "Jessica Chen", role: "Territory Rep — West Coast", quote: "The proposal engine alone paid for itself in the first month. I can create polished estimates in minutes.", rating: 5 },
  { name: "David Thompson", role: "VP of Operations", quote: "Finally, a platform that understands the polishing industry. The competitive intelligence features are game-changing.", rating: 5 },
];

export const TestimonialsSection = () => (
  <section className="py-24 bg-background">
    <div className="container mx-auto px-4">
      <div className="text-center mb-16">
        <span className="text-xs text-primary font-semibold uppercase tracking-widest">Testimonials</span>
        <h2 className="text-3xl md:text-4xl font-bold mt-3 text-foreground">Trusted by Top Performers</h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {testimonials.map((t) => (
          <div key={t.name} className="bg-gradient-card border border-border rounded-xl p-6 hover:border-gold transition-all duration-300">
            <div className="flex gap-0.5 mb-4">
              {Array.from({ length: t.rating }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-primary text-primary" />
              ))}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 italic">"{t.quote}"</p>
            <div>
              <div className="text-sm font-semibold text-foreground">{t.name}</div>
              <div className="text-xs text-muted-foreground">{t.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
