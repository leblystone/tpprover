import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, AlertTriangle, Shield, FileText } from 'lucide-react';
import { themes, defaultThemeName } from '../theme/themes';
import logo from '../assets/tpp_logo.png';
import LandingFooter from '../components/layout/LandingFooter';

export default function DeleteAccount() {
  const navigate = useNavigate();
  const theme = themes[defaultThemeName];

  const deletionSteps = [
    {
      step: 1,
      title: "Send an Email",
      description: "Email us at contact@thepepplanner.com with your account deletion request."
    },
    {
      step: 2,
      title: "Include Your Email",
      description: "Make sure to include the email address associated with your account."
    },
    {
      step: 3,
      title: "Confirmation",
      description: "We'll confirm your identity and process your deletion request within 24-48 hours."
    },
    {
      step: 4,
      title: "Deletion Complete",
      description: "You'll receive a final confirmation email once your account and data have been deleted."
    }
  ];

  const importantNotes = [
    "Account deletion is permanent and cannot be undone",
    "All your research data, protocols, and schedules will be permanently deleted",
    "Active subscriptions will be cancelled automatically",
    "You will not be able to recover any data after deletion",
    "The process typically takes 24-48 hours to complete"
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
      {/* Navigation */}
      <nav className="border-b" style={{ backgroundColor: theme.white, borderColor: theme.border }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img src={logo} alt="The Pep Planner" className="h-8 w-8 rounded-full mr-3" />
              <span className="text-xl font-bold" style={{ color: theme.primaryDark }}>The Pep Planner</span>
            </div>
            <div className="flex space-x-8">
              <button type="button" onClick={() => navigate('/')} className="text-sm font-medium hover:opacity-75 transition-opacity bg-transparent border-0 cursor-pointer p-0" style={{ color: theme.text }}>Home</button>
              <button type="button" onClick={() => navigate('/about')} className="text-sm font-medium hover:opacity-75 transition-opacity bg-transparent border-0 cursor-pointer p-0" style={{ color: theme.text }}>About</button>
              <button type="button" onClick={() => navigate('/features')} className="text-sm font-medium hover:opacity-75 transition-opacity bg-transparent border-0 cursor-pointer p-0" style={{ color: theme.text }}>Features</button>
              <button type="button" onClick={() => navigate('/pricing')} className="text-sm font-medium hover:opacity-75 transition-opacity bg-transparent border-0 cursor-pointer p-0" style={{ color: theme.text }}>Pricing</button>
              <button type="button" onClick={() => navigate('/contact')} className="text-sm font-medium hover:opacity-75 transition-opacity bg-transparent border-0 cursor-pointer p-0" style={{ color: theme.text }}>Contact</button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full" style={{ backgroundColor: theme.dangerLight || '#fee2e2' }}>
              <AlertTriangle className="w-12 h-12" style={{ color: theme.danger || '#dc2626' }} />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6" style={{ color: theme.primaryDark }}>
            The Pep Planner Account Deletion
          </h1>
          <p className="text-xl md:text-2xl mb-8" style={{ color: theme.textLight }}>
            Request deletion of your The Pep Planner account and associated data.
          </p>
        </div>
      </div>

      {/* Deletion Process */}
      <div className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: theme.white }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-center" style={{ color: theme.primaryDark }}>
            How to Request Account Deletion
          </h2>
          <p className="text-center text-lg mb-12" style={{ color: theme.textLight }}>
            Follow these steps to permanently delete your The Pep Planner account:
          </p>
          
          <div className="space-y-6 mb-12">
            {deletionSteps.map((item, index) => (
              <div 
                key={index} 
                className="flex items-start p-6 rounded-xl border"
                style={{ 
                  backgroundColor: theme.background,
                  borderColor: theme.border
                }}
              >
                <div 
                  className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mr-6"
                  style={{ 
                    backgroundColor: theme.primary,
                    color: 'white'
                  }}
                >
                  {item.step}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2" style={{ color: theme.primaryDark }}>
                    {item.title}
                  </h3>
                  <p className="text-sm" style={{ color: theme.textLight }}>
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Contact Section */}
          <div className="p-8 rounded-xl text-center" style={{ backgroundColor: theme.primaryLight || '#f0f9ff' }}>
            <Mail className="w-12 h-12 mx-auto mb-4" style={{ color: theme.primary }} />
            <h3 className="text-2xl font-bold mb-4" style={{ color: theme.primaryDark }}>
              Send Your Deletion Request
            </h3>
            <p className="text-lg mb-6" style={{ color: theme.text }}>
              Email us at:
            </p>
            <a 
              href="mailto:contact@thepepplanner.com?subject=Account%20Deletion%20Request"
              className="inline-block px-8 py-4 rounded-lg font-semibold text-white text-lg transition-colors"
              style={{ backgroundColor: theme.primary }}
              onMouseEnter={(e) => e.target.style.backgroundColor = theme.primaryDark}
              onMouseLeave={(e) => e.target.style.backgroundColor = theme.primary}
            >
              contact@thepepplanner.com
            </a>
            <p className="text-sm mt-4" style={{ color: theme.textLight }}>
              Please include your account email address in your request
            </p>
          </div>
        </div>
      </div>

      {/* Important Information */}
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="p-8 rounded-xl border-2" style={{ 
            backgroundColor: theme.white,
            borderColor: theme.danger || '#dc2626'
          }}>
            <div className="flex items-center mb-6">
              <AlertTriangle className="w-8 h-8 mr-3" style={{ color: theme.danger || '#dc2626' }} />
              <h2 className="text-2xl font-bold" style={{ color: theme.primaryDark }}>
                Important Information
              </h2>
            </div>
            
            <div className="space-y-4">
              <p className="font-semibold text-lg mb-4" style={{ color: theme.text }}>
                Before requesting deletion, please note:
              </p>
              <ul className="space-y-3">
                {importantNotes.map((note, index) => (
                  <li key={index} className="flex items-start">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full mt-2 mr-3" 
                         style={{ backgroundColor: theme.danger || '#dc2626' }} />
                    <span className="text-sm" style={{ color: theme.textLight }}>
                      {note}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Data Deletion Details */}
      <div className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: theme.white }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center" style={{ color: theme.primaryDark }}>
            What Data Gets Deleted
          </h2>
          
          <div className="space-y-6 mb-8">
            <div className="p-6 rounded-xl border" style={{ 
              backgroundColor: theme.background,
              borderColor: theme.border
            }}>
              <h3 className="text-xl font-semibold mb-4 flex items-center" style={{ color: theme.primaryDark }}>
                <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: theme.danger || '#dc2626' }} />
                Data That Will Be Permanently Deleted
              </h3>
              <ul className="space-y-3 ml-6">
                <li className="text-sm" style={{ color: theme.textLight }}>
                  <strong>Account Information:</strong> Your name, email address, and profile details
                </li>
                <li className="text-sm" style={{ color: theme.textLight }}>
                  <strong>Research Protocols:</strong> All saved research protocols and related notes
                </li>
                <li className="text-sm" style={{ color: theme.textLight }}>
                  <strong>Research Calendar:</strong> All scheduled research activities and reminders
                </li>
                <li className="text-sm" style={{ color: theme.textLight }}>
                  <strong>Research Journal:</strong> All journal entries and notes
                </li>
                <li className="text-sm" style={{ color: theme.textLight }}>
                  <strong>Stockpile Records:</strong> All inventory and supply tracking data
                </li>
                <li className="text-sm" style={{ color: theme.textLight }}>
                  <strong>Orders & Vendors:</strong> All order history and vendor information
                </li>
                <li className="text-sm" style={{ color: theme.textLight }}>
                  <strong>Goals & Badges:</strong> All goals, achievements, and badge progress
                </li>
                <li className="text-sm" style={{ color: theme.textLight }}>
                  <strong>Settings & Preferences:</strong> All app settings and customizations
                </li>
                <li className="text-sm" style={{ color: theme.textLight }}>
                  <strong>Subscription Information:</strong> Active subscriptions will be cancelled
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-xl border" style={{ 
              backgroundColor: theme.background,
              borderColor: theme.border
            }}>
              <h3 className="text-xl font-semibold mb-4 flex items-center" style={{ color: theme.primaryDark }}>
                <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: theme.warning || '#f59e0b' }} />
                Data That May Be Retained (Temporarily)
              </h3>
              <ul className="space-y-3 ml-6">
                <li className="text-sm" style={{ color: theme.textLight }}>
                  <strong>Transaction Records:</strong> Financial transaction records may be retained for up to 7 years for tax and accounting purposes as required by law
                </li>
                <li className="text-sm" style={{ color: theme.textLight }}>
                  <strong>Security Logs:</strong> Authentication and security logs may be retained for up to 90 days for fraud prevention
                </li>
                <li className="text-sm" style={{ color: theme.textLight }}>
                  <strong>Backup Systems:</strong> Data in automated backup systems will be permanently deleted within 30 days
                </li>
                <li className="text-sm" style={{ color: theme.textLight }}>
                  <strong>Anonymized Analytics:</strong> Some aggregated, anonymized usage statistics may be retained indefinitely for product improvement (no personal identifiers)
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-xl" style={{ 
              backgroundColor: theme.primaryLight || '#f0f9ff'
            }}>
              <h3 className="text-xl font-semibold mb-3" style={{ color: theme.primaryDark }}>
                Deletion Timeline
              </h3>
              <div className="space-y-2 text-sm" style={{ color: theme.text }}>
                <p><strong>Immediate:</strong> Account access is revoked</p>
                <p><strong>Within 24-48 hours:</strong> Primary data deletion is completed</p>
                <p><strong>Within 30 days:</strong> All backup systems are purged</p>
                <p><strong>Up to 90 days:</strong> Security logs are removed</p>
                <p><strong>Up to 7 years:</strong> Required financial records (as mandated by law)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alternatives Section */}
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center" style={{ color: theme.primaryDark }}>
            Before You Go...
          </h2>
          <p className="text-center text-lg mb-12" style={{ color: theme.textLight }}>
            Consider these alternatives to account deletion:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl text-center" style={{ backgroundColor: theme.background }}>
              <Shield className="w-10 h-10 mx-auto mb-4" style={{ color: theme.primary }} />
              <h3 className="font-semibold mb-3" style={{ color: theme.primaryDark }}>
                Pause Subscription
              </h3>
              <p className="text-sm mb-4" style={{ color: theme.textLight }}>
                Cancel your subscription but keep your account and data for future use.
              </p>
              <a 
                href="/app/account/subscription" 
                className="text-sm font-medium hover:opacity-75 transition-opacity"
                style={{ color: theme.primary }}
              >
                Manage Subscription
              </a>
            </div>
            
            <div className="p-6 rounded-xl text-center" style={{ backgroundColor: theme.background }}>
              <FileText className="w-10 h-10 mx-auto mb-4" style={{ color: theme.primary }} />
              <h3 className="font-semibold mb-3" style={{ color: theme.primaryDark }}>
                Export Your Data
              </h3>
              <p className="text-sm mb-4" style={{ color: theme.textLight }}>
                Download all your research data before deleting your account.
              </p>
              <a 
                href="/app/settings/data" 
                className="text-sm font-medium hover:opacity-75 transition-opacity"
                style={{ color: theme.primary }}
              >
                Export Data
              </a>
            </div>
            
            <div className="p-6 rounded-xl text-center" style={{ backgroundColor: theme.background }}>
              <Mail className="w-10 h-10 mx-auto mb-4" style={{ color: theme.primary }} />
              <h3 className="font-semibold mb-3" style={{ color: theme.primaryDark }}>
                Contact Support
              </h3>
              <p className="text-sm mb-4" style={{ color: theme.textLight }}>
                Having issues? Our support team is here to help resolve any problems.
              </p>
              <a 
                href="/contact" 
                className="text-sm font-medium hover:opacity-75 transition-opacity"
                style={{ color: theme.primary }}
              >
                Get Support
              </a>
            </div>
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}

