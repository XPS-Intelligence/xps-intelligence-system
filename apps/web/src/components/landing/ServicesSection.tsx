import { motion } from "framer-motion";

const services = [
  { title: "Concrete Polishing", desc: "Diamond grinding and polishing for commercial, industrial, and residential floors.", tag: "Core" },
  { title: "Epoxy Coatings", desc: "High-performance epoxy systems for garages, warehouses, and commercial spaces.", tag: "Core" },
  { title: "Decorative Concrete", desc: "Stained, stamped, and decorative finishes for premium residential and commercial projects.", tag: "Premium" },
  { title: "Industrial Flooring", desc: "Heavy-duty floor systems for manufacturing, food processing, and logistics facilities.", tag: "Industrial" },
  { title: "Construction Services", desc: "Pre-construction consulting, floor prep, and new build specifications.", tag: "Construction" },
  { title: "Maintenance Programs", desc: "Ongoing floor care, recoating, and warranty maintenance programs.", tag: "Recurring" },
];

export const ServicesSection = () => (
  <section id="solutions" className="py-24 bg-card/30 border-y border-border">
    <div className="container mx-auto px-4">
      <div className="text-center mb-16">
        <span className="text-xs text-primary font-semibold uppercase tracking-widest">Service Categories</span>
        <h2 className="text-3xl md:text-4xl font-bold mt-3 text-foreground">Built for the Polishing Industry</h2>
        <p className="text-muted-foreground mt-3 max-w-xl mx-auto">XPS Intelligence understands your services, materials, and market — so your AI does too.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {services.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            className="bg-gradient-card border border-border rounded-xl p-6 hover:border-gold transition-all duration-300"
          >
            <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full mb-3">{s.tag}</span>
            <h3 className="font-semibold text-foreground mb-2">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);
