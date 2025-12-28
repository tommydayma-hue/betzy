import { Link, useNavigate } from "react-router-dom";
import { Wallet, Menu, X, LogOut, User, History, HelpCircle, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationsModal } from "./NotificationsModal";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isBalanceUpdating, setIsBalanceUpdating] = useState(false);
  const prevBalanceRef = useRef<number | null>(null);
  const [telegramLink, setTelegramLink] = useState<string>("");
  const [whatsappLink, setWhatsappLink] = useState<string>("");

  const walletBalance = profile?.wallet_balance ?? 0;
  const displayName = profile?.username || user?.email?.split('@')[0] || 'User';

  // Fetch support links from site settings
  useEffect(() => {
    const fetchSupportLinks = async () => {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "site_config")
          .maybeSingle();
        
        if (!error && data?.value && typeof data.value === 'object') {
          const config = data.value as { telegram_link?: string; whatsapp_link?: string };
          setTelegramLink(config.telegram_link || "");
          setWhatsappLink(config.whatsapp_link || "");
        }
      } catch {
        // Silently handle errors - support links are optional
      }
    };
    fetchSupportLinks();
  }, []);

  useEffect(() => {
    if (prevBalanceRef.current !== null && prevBalanceRef.current !== walletBalance) {
      setIsBalanceUpdating(true);
      const timer = setTimeout(() => setIsBalanceUpdating(false), 1500);
      return () => clearTimeout(timer);
    }
    prevBalanceRef.current = walletBalance;
  }, [walletBalance]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("You have been logged out");
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="font-bold text-lg text-white">B</span>
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900 hidden sm:block">
              ROYALL11
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
              Home
            </Link>
            <Link to="/matches" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
              Live Matches
            </Link>
            <Link to="/coinflip" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
              Coin Flip
            </Link>
            <Link to="/history" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
              History
            </Link>
            <Link to="/rules" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
              Rules
            </Link>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            {telegramLink && (
              <a
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[#0088cc] rounded-lg hover:bg-[#0077b5] transition-colors"
              >
                <Send className="h-4 w-4" />
                Telegram
              </a>
            )}
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#20bd5a] transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            )}
            <NotificationsModal />
            {user ? (
              <>
                <Link to="/dashboard">
                  <button 
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                      isBalanceUpdating 
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Wallet className={`h-4 w-4 ${isBalanceUpdating ? 'text-emerald-600' : 'text-gray-500'}`} />
                    <span className="font-semibold">₹{walletBalance.toFixed(2)}</span>
                  </button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{displayName}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-white border border-gray-200">
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="cursor-pointer text-gray-700">
                        <Wallet className="h-4 w-4 mr-2 text-gray-500" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/history" className="cursor-pointer text-gray-700">
                        <History className="h-4 w-4 mr-2 text-gray-500" />
                        History
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/support" className="cursor-pointer text-gray-700">
                        <HelpCircle className="h-4 w-4 mr-2 text-gray-500" />
                        Help & Support
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-200" />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600">
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link to="/login">
                  <button className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    Login
                  </button>
                </Link>
                <Link to="/register">
                  <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                    Register
                  </button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-2">
            {telegramLink && (
              <a
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-white bg-[#0088cc] rounded-lg"
              >
                <Send className="h-5 w-5" />
              </a>
            )}
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-white bg-[#25D366] rounded-lg"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
            )}
            <NotificationsModal />
            <button
              className="p-2 text-gray-700"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 bg-white animate-fade-in">
            <nav className="flex flex-col gap-1">
              <Link 
                to="/" 
                className="px-4 py-3 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/matches" 
                className="px-4 py-3 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Live Matches
              </Link>
              <Link 
                to="/coinflip" 
                className="px-4 py-3 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Coin Flip
              </Link>
              <Link 
                to="/rules" 
                className="px-4 py-3 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Rules
              </Link>
              
              {user ? (
                <>
                  <Link 
                    to="/dashboard" 
                    className="px-4 py-3 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    to="/history" 
                    className="px-4 py-3 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    History
                  </Link>
                  <Link 
                    to="/support" 
                    className="px-4 py-3 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Help & Support
                  </Link>
                  <div className="px-4 pt-2">
                    <button 
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                      onClick={() => {
                        handleSignOut();
                        setIsMenuOpen(false);
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex gap-2 px-4 pt-3">
                  <Link to="/login" className="flex-1" onClick={() => setIsMenuOpen(false)}>
                    <button className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      Login
                    </button>
                  </Link>
                  <Link to="/register" className="flex-1" onClick={() => setIsMenuOpen(false)}>
                    <button className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                      Register
                    </button>
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
