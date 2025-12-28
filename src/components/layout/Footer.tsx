import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, MessageCircle, Instagram } from "lucide-react";

interface SocialLinks {
  telegram_link: string;
  whatsapp_link: string;
  instagram_link: string;
}

export const Footer = () => {
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    telegram_link: "",
    whatsapp_link: "",
    instagram_link: "",
  });

  useEffect(() => {
    const fetchSocialLinks = async () => {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "site_config")
          .maybeSingle();

        if (!error && data?.value) {
          const config = data.value as Record<string, unknown>;
          setSocialLinks({
            telegram_link: (config.telegram_link as string) || "",
            whatsapp_link: (config.whatsapp_link as string) || "",
            instagram_link: (config.instagram_link as string) || "",
          });
        }
      } catch {
        // Silently handle errors - social links are optional
      }
    };

    fetchSocialLinks();
  }, []);

  const hasSocialLinks = socialLinks.telegram_link || socialLinks.whatsapp_link || socialLinks.instagram_link;

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="font-bold text-lg text-white">R</span>
              </div>
              <span className="font-bold text-xl tracking-tight text-gray-900">ROYALL11</span>
            </Link>
            <p className="text-sm text-gray-500">
              The ultimate prediction gaming platform. 
              Play responsibly.
            </p>
          </div>

          {/* Games */}
          <div>
            <p className="font-semibold text-gray-900 mb-4">Games</p>
            <ul className="space-y-2 text-sm text-gray-500">
              <li>
                <Link to="/matches" className="hover:text-blue-600 transition-colors">
                  Live Matches
                </Link>
              </li>
              <li>
                <Link to="/coinflip" className="hover:text-blue-600 transition-colors">
                  Coin Flip
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <p className="font-semibold text-gray-900 mb-4">Account</p>
            <ul className="space-y-2 text-sm text-gray-500">
              <li>
                <Link to="/login" className="hover:text-blue-600 transition-colors">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-blue-600 transition-colors">
                  Register
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-blue-600 transition-colors">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <p className="font-semibold text-gray-900 mb-4">Support</p>
            <ul className="space-y-2 text-sm text-gray-500">
              <li>
                <Link to="/terms" className="hover:text-blue-600 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-blue-600 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/responsible-gaming" className="hover:text-blue-600 transition-colors">
                  Responsible Gaming
                </Link>
              </li>
            </ul>

            {/* Social Links */}
            {hasSocialLinks && (
              <div className="mt-4 flex items-center gap-3">
                {socialLinks.telegram_link && (
                  <a
                    href={socialLinks.telegram_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-[#0088cc] flex items-center justify-center text-white hover:opacity-80 transition-opacity"
                    title="Telegram"
                  >
                    <Send className="h-4 w-4" />
                  </a>
                )}
                {socialLinks.whatsapp_link && (
                  <a
                    href={socialLinks.whatsapp_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center text-white hover:opacity-80 transition-opacity"
                    title="WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                )}
                {socialLinks.instagram_link && (
                  <a
                    href={socialLinks.instagram_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#fd5949] via-[#d6249f] to-[#285AEB] flex items-center justify-center text-white hover:opacity-80 transition-opacity"
                    title="Instagram"
                  >
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            © 2024 Royall11. All rights reserved.
          </p>
          <p className="text-xs text-gray-600">
            18+ Only. Play Responsibly. Gambling can be addictive.
          </p>
        </div>
      </div>
    </footer>
  );
};
