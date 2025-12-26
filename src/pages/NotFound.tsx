import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      {/* Background Effects */}
      <div className="fixed top-1/4 left-1/4 w-72 h-72 bg-destructive/10 rounded-full blur-[120px]" />
      <div className="fixed bottom-1/4 right-1/4 w-72 h-72 bg-primary/10 rounded-full blur-[100px]" />
      
      <div className="text-center relative z-10 animate-fade-in">
        <h1 className="font-display text-8xl md:text-9xl font-bold text-glow mb-4">404</h1>
        <h2 className="font-display text-2xl md:text-3xl font-bold tracking-wide mb-4">
          Page Not Found
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/">
          <Button variant="neon" size="lg" className="gap-2">
            <Home className="h-5 w-5" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
