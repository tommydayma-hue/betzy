import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Phone, ArrowLeft, MessageCircle, Headphones } from "lucide-react";

const ForgotPassword = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-24 pb-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-xl bg-orange-500 flex items-center justify-center mx-auto mb-4">
                <Phone className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Forgot Password?</h1>
              <p className="text-gray-500 mt-1">Contact our support team to reset your password</p>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 mb-6">
              <p className="text-sm text-amber-800">
                <strong>How it works:</strong> Our support team will verify your identity and help you reset your password securely.
              </p>
            </div>

            {/* Contact Options */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Contact Support:</h3>
              
              {/* WhatsApp */}
              <a
                href="https://wa.me/919876543210"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">WhatsApp Support</p>
                  <p className="text-sm text-gray-500">Fastest response • Available 24/7</p>
                </div>
              </a>

              {/* Support Page */}
              <Link
                to="/support"
                className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                  <Headphones className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Create Support Ticket</p>
                  <p className="text-sm text-gray-500">Submit a password reset request</p>
                </div>
              </Link>
            </div>

            {/* Instructions */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-2">What to include:</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Your registered mobile number</li>
                <li>• Your username (if you remember)</li>
                <li>• Last transaction details (optional)</li>
              </ul>
            </div>

            <div className="mt-6 text-center">
              <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ForgotPassword;
