import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export const CTASection = () => (
  <section className="py-24 border-t border-border">
    <div className="container mx-auto px-4 text-center">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Ready to Dominate Your Territory?</h2>
        <p className="text-muted-foreground mb-8">Join the XPS Intelligence platform and unlock AI-powered sales tools built for the polishing industry.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="gold" size="lg" asChild>
            <Link to="/login">Start Now <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
          <Button variant="gold-outline" size="lg" asChild>
            <Link to="/login">Request Demo</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/login">Create Proposal</Link>
          </Button>
        </div>
      </div>
    </div>
  </section>
);
