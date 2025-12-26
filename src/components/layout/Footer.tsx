import { Link } from "react-router-dom";

export const Footer = () => {
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
