import { motion, Variants } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Rahul S.",
    role: "Pro Bettor",
    content: "Royall11 has completely changed how I bet. The instant payouts and live odds are incredible. Won ₹50k last month!",
    rating: 5,
    avatar: "RS",
  },
  {
    name: "Priya M.",
    role: "Sports Enthusiast",
    content: "The user interface is so clean and easy to use. I love the coin flip game - it's addictive and the 2x payouts are real!",
    rating: 5,
    avatar: "PM",
  },
  {
    name: "Amit K.",
    role: "Regular User",
    content: "Best betting platform in India. Deposits are instant, withdrawals are fast, and customer support is always helpful.",
    rating: 5,
    avatar: "AK",
  },
];

export const TestimonialsSection = () => {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
  };

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background accent */}
      <motion.div
        className="absolute -left-48 top-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 10, repeat: Infinity }}
      />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-wide mb-4">
            What Our <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">Winners</span> Say
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Join thousands of satisfied bettors who trust Royall11
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              variants={itemVariants}
              whileHover={{ y: -5 }}
              className="group"
            >
              <div className="relative p-6 rounded-2xl bg-card/50 backdrop-blur-xl border border-border hover:border-primary/30 transition-all duration-500 h-full">
                {/* Quote icon */}
                <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/10" />
                
                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                
                {/* Content */}
                <p className="text-foreground/90 mb-6 leading-relaxed">"{testimonial.content}"</p>
                
                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-sm font-bold text-primary-foreground">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
