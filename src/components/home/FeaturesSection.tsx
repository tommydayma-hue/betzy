import { motion, Variants } from "framer-motion";
import { Wallet, Clock, Shield, TrendingUp, Smartphone, Headphones } from "lucide-react";

const features = [
  {
    icon: TrendingUp,
    title: "Real-Time Odds",
    description: "Get live, dynamic odds that update instantly as the game progresses",
    gradient: "from-primary to-blue-400",
  },
  {
    icon: Wallet,
    title: "Instant Payouts",
    description: "Withdraw your winnings instantly to your preferred payment method",
    gradient: "from-success to-emerald-400",
  },
  {
    icon: Shield,
    title: "Bank-Grade Security",
    description: "Your funds and data are protected with enterprise-level encryption",
    gradient: "from-purple-500 to-pink-400",
  },
  {
    icon: Clock,
    title: "24/7 Betting",
    description: "Place bets anytime, anywhere with our always-on platform",
    gradient: "from-warning to-orange-400",
  },
  {
    icon: Smartphone,
    title: "Mobile First",
    description: "Optimized experience on any device, desktop or mobile",
    gradient: "from-cyan-500 to-blue-400",
  },
  {
    icon: Headphones,
    title: "Live Support",
    description: "Expert support team available round the clock to assist you",
    gradient: "from-rose-500 to-pink-400",
  },
];

export const FeaturesSection = () => {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-wide mb-4">
            Why Choose <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">BetZone</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Experience the most advanced betting platform with features designed for winners
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="group"
            >
              <div className="relative p-6 rounded-2xl bg-card/50 backdrop-blur-xl border border-border hover:border-primary/30 transition-all duration-500 h-full">
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative">
                  <motion.div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} p-0.5 mb-5`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="w-full h-full rounded-[10px] bg-card flex items-center justify-center">
                      <feature.icon className="h-6 w-6 text-foreground" />
                    </div>
                  </motion.div>
                  
                  <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
