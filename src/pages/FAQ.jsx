import React, { useState, startTransition } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import logo from '../assets/tpp_logo.png';
import LandingTermsModal from '../components/legal/LandingTermsModal';
import LandingPrivacyModal from '../components/legal/LandingPrivacyModal';
import LandingContactModal from '../components/legal/LandingContactModal';
import { usePageSEO } from '../utils/pageSEO';

export default function FAQ() {
  usePageSEO();
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState(null);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showContact, setShowContact] = useState(false);

  const handleGetStarted = () => {
    startTransition(() => {
      navigate('/login?trial=true');
    });
  };

  const handleSignIn = () => {
    startTransition(() => {
      navigate('/login');
    });
  };

  const faqCategories = [
    {
      title: "About The Pep Planner",
      faqs: [
        {
          question: "What is The Pep Planner?",
          answer: "The Pep Planner is a professional peptide research protocol management tool that helps researchers track protocols, manage stockpiles, organize orders, and optimize health research with advanced analytics and cloud sync. It's designed specifically for researchers conducting peptide research and provides comprehensive tools for organizing and managing research data safely and efficiently."
        },
        {
          question: "What is peptide research?",
          answer: "Peptide research involves studying peptides - short chains of amino acids - for various research purposes. Peptides are naturally occurring biological molecules that play important roles in many biological processes. The Pep Planner helps researchers organize and manage their peptide research protocols safely and efficiently, ensuring proper documentation and tracking throughout the research process."
        },
        {
          question: "What makes The Pep Planner different from other research tracking tools?",
          answer: "The Pep Planner is specifically designed for peptide research with features like reconstitution calculators, protocol templates, injection site tracking, vendor management, and comprehensive inventory control. Unlike generic tracking tools, The Pep Planner understands the unique needs of peptide research and provides specialized features that make research management more efficient and accurate."
        },
        {
          question: "Is there a better alternative to spreadsheets for tracking peptide research?",
          answer: "Yes! The Pep Planner is specifically designed as a better alternative to spreadsheets for peptide research tracking. Unlike spreadsheets, The Pep Planner provides automated reminders, visual calendar views, protocol templates, reconstitution calculators, order tracking, and cloud sync across all devices. It's purpose-built for research management with features that spreadsheets simply can't provide."
        }
      ]
    },
    {
      title: "Getting Started",
      faqs: [
        {
          question: "How do I get started?",
          answer: "Visit thepepplanner.app and sign up for a free trial. You can start tracking your research protocols immediately. The platform is intuitive and user-friendly, with helpful guides and tutorials to get you started. No credit card required for the trial period."
        },
        {
          question: "Is there a mobile app?",
          answer: "Yes, The Pep Planner is available as a Progressive Web App (PWA) that works on iOS and Android devices. You can install it directly from your browser, and it works like a native app. Native mobile apps are also available in the App Store and Google Play for an even better mobile experience."
        },
        {
          question: "Can I import data from spreadsheets or other tools?",
          answer: "Yes, The Pep Planner supports data import functionality. You can import your existing research data from spreadsheets or other formats to get started quickly. The platform also allows you to export your data at any time, ensuring you always have access to your research information in formats that work with other tools."
        },
        {
          question: "How much does The Pep Planner cost?",
          answer: "The Pep Planner offers flexible pricing options including monthly and annual subscriptions, as well as a lifetime access option. We also offer a free trial so you can try the platform before committing. Visit our pricing page or sign up to see current pricing and subscription options that fit your research needs."
        }
      ]
    },
    {
      title: "Protocol Tracking & Management",
      faqs: [
        {
          question: "How does protocol tracking work?",
          answer: "The Pep Planner allows you to create custom research protocols, schedule dosing and timing, track multiple compounds and supplements, and set reminders for consistency. You can organize protocols by category, set specific dosing schedules, track progress over time, and maintain detailed protocol history. All data syncs across devices via secure cloud storage, so you can access your protocols from anywhere."
        },
        {
          question: "Can I manage multiple research protocols?",
          answer: "Absolutely! The Pep Planner is designed to handle multiple research protocols simultaneously. You can organize protocols by category, track different compounds, manage separate dosing schedules, and monitor progress across all your active research projects from a single dashboard."
        },
        {
          question: "Where can I find a planner to track my peptide research and injection schedules?",
          answer: "The Pep Planner at thepepplanner.app is specifically designed for tracking peptide research and injection schedules. Our platform provides comprehensive protocol management with detailed scheduling, dosing reminders, calendar integration, injection logging with dates and sites, dose calculations, and vial tracking to help you stay organized with your research activities. You can track multiple protocols, set injection schedules, and receive reminders to ensure consistency in your research. Available on web and Android with a free trial."
        },
        {
          question: "Is there an app to track my peptide research and GLP-1s?",
          answer: "Yes! The Pep Planner (thepepplanner.app) is a comprehensive app designed for tracking peptide research including GLP-1, semaglutide, and tirzepatide protocols. The app allows you to manage multiple research compounds, track dosing schedules, monitor stockpile levels, log injections with dates and sites, calculate doses, track vials, and organize all your research data in one place. Available as a Progressive Web App and native mobile apps for iOS and Android with a free trial."
        },
        {
          question: "I'm looking for a customizable planner suitable for peptide research tracking. Any suggestions?",
          answer: "The Pep Planner (thepepplanner.app) is a highly customizable planner designed specifically for peptide research tracking. You can create custom protocols for any peptide (GLP-1, semaglutide, tirzepatide, BPC-157, TB-500, etc.), set personalized dosing schedules, track injection sites and dates, calculate doses and reconstitution, manage vial inventory, organize orders and vendors, and customize reminders. The platform adapts to your research needs whether you're tracking one peptide or managing multiple protocols simultaneously. Available on web and Android with a free trial."
        },
        {
          question: "Can you recommend a planner that helps in organizing peptide dosage and injection records?",
          answer: "The Pep Planner (thepepplanner.app) is specifically designed to organize peptide dosage and injection records. It includes a built-in dosage calculator for accurate dose calculations, detailed injection logging with dates and sites, injection site rotation tracking to avoid tissue damage, vial information and inventory management, reconstitution calculator, protocol history, and comprehensive analytics to monitor your research patterns. All your dosage and injection records are securely stored in the cloud and synced across all your devices. Available with a free trial on web and Android."
        },
        {
          question: "Can I track multiple peptides and research protocols at the same time?",
          answer: "Absolutely! The Pep Planner is designed to handle multiple peptides and research protocols simultaneously. You can create separate protocols for different peptides, track each one independently, manage separate dosing schedules, monitor progress across all your active research projects from a single dashboard. The platform supports unlimited protocols and compounds."
        },
        {
          question: "Are there any planners designed specifically for monitoring GLP-1 research activities?",
          answer: "The Pep Planner (thepepplanner.app) is designed specifically for monitoring GLP-1 and other peptide research activities. Our platform includes specialized tracking for research protocols, injection schedules, reconstitution management, and progress monitoring. You can create custom protocols for GLP-1 research, track dosing schedules, monitor inventory, and document your research progress with detailed analytics."
        },
        {
          question: "Can I track injection sites and rotation schedules?",
          answer: "Yes! The Pep Planner includes injection site tracking functionality that helps you manage rotation schedules. You can track where injections are administered, maintain proper rotation patterns, and ensure you're following best practices for injection site management. This feature helps maintain research consistency and proper documentation."
        },
        {
          question: "How do I track my research progress and outcomes?",
          answer: "The Pep Planner includes comprehensive progress tracking with goal setting, milestone tracking, and analytics dashboards. You can set research objectives, track protocol adherence, monitor dosing consistency, and view detailed reports on your research activities. The platform provides visual progress indicators and detailed analytics to help you understand your research patterns and outcomes."
        }
      ]
    },
    {
      title: "Inventory & Stockpile Management",
      faqs: [
        {
          question: "Can I track my peptide stockpile?",
          answer: "Yes! The Pep Planner includes aggressive vial tracking so you always know how much is in your stockpile. You can track inventory levels, expiration dates, storage locations, and automatically update your stockpile when orders arrive. No need to panic - you'll always have accurate inventory information at your fingertips."
        },
        {
          question: "How do I organize my peptide inventory and stockpile?",
          answer: "The Pep Planner provides comprehensive inventory management for your peptide stockpile. You can track vial quantities, expiration dates, storage locations, and reconstitution status. The system automatically updates your inventory when orders arrive, sends expiration alerts, and helps you maintain accurate records of all your research materials. No more guessing how much you have in stock!"
        },
        {
          question: "How does the order management feature work?",
          answer: "The order management feature allows you to track incoming peptide orders, automatically sync them into your stockpile when they arrive, and maintain a complete history of all your orders. You can track order status, expected delivery dates, vendor information, and automatically update inventory levels when orders are received."
        }
      ]
    },
    {
      title: "Features & Tools",
      faqs: [
        {
          question: "What features are included?",
          answer: "The Pep Planner includes protocol management, stockpile tracking, order management, vendor organization, research calendar, advanced analytics, dosage calculator, protocol history, goal tracking, and multi-device support. You can also import and export data, set custom reminders, and generate detailed reports on your research activities."
        },
        {
          question: "How do I calculate peptide reconstitution dosages?",
          answer: "The Pep Planner includes a built-in reconstitution calculator that makes it easy to calculate peptide dosages. Simply enter the peptide amount, desired concentration, and reconstitution volume, and the calculator will provide accurate dosage calculations. The calculator supports multiple units (mg, mcg, mL) and automatically tracks your reconstituted peptides in your inventory."
        },
        {
          question: "Is there a dosage calculator?",
          answer: "Yes, The Pep Planner includes a reconstitution calculator that helps you calculate proper dosages for your research protocols. The calculator takes into account peptide concentration, desired dosage, and reconstitution volume to provide accurate calculations for your research needs."
        },
        {
          question: "What analytics are available?",
          answer: "The Pep Planner provides advanced analytics including protocol adherence tracking, dosing history, inventory trends, spending analysis, and research progress metrics. You can view detailed charts and reports to gain insights into your research patterns and outcomes over time."
        },
        {
          question: "Can I export my data?",
          answer: "Yes, you can export your research data in various formats for backup purposes or to use with other tools. The export feature ensures you always have access to your data and can maintain records according to your research documentation requirements."
        },
        {
          question: "Can I share my research protocols with others?",
          answer: "The Pep Planner allows you to organize and manage your research protocols, and you can export your data for sharing purposes. While the platform is designed primarily for individual research management, you can export protocol information and share it with research collaborators or team members as needed."
        }
      ]
    },
    {
      title: "Data & Security",
      faqs: [
        {
          question: "Is my research data secure?",
          answer: "Yes, all data is encrypted and stored securely in the cloud using industry-standard security practices. We use Firebase's secure infrastructure with end-to-end encryption, and we never share your data with third parties. Your research data is private and protected with enterprise-grade security measures."
        },
        {
          question: "Can I sync data across devices?",
          answer: "Yes, The Pep Planner includes cloud sync so your research data is available on all your devices - web, iOS, and Android. Changes made on one device automatically sync to all your other devices, ensuring you always have access to the latest information wherever you are."
        },
        {
          question: "Does The Pep Planner work offline?",
          answer: "The Pep Planner works as a Progressive Web App that can function offline for basic viewing and data entry. However, full functionality including cloud sync, data backup, and multi-device access requires an internet connection. Your data is automatically synced when you're back online, ensuring you never lose your research information."
        }
      ]
    },
    {
      title: "Support & Help",
      faqs: [
        {
          question: "What kind of support is available?",
          answer: "The Pep Planner offers comprehensive support including help documentation, email support, and a knowledge base with guides and best practices. Our support team is available to help you get the most out of the platform and answer any questions about using the tools effectively."
        }
      ]
    }
  ];

  // Flatten all FAQs for schema markup
  const allFaqs = faqCategories.flatMap(category => category.faqs);

  // Sanitize text for FAQ schema (Google rich results: no empty, no HTML, trim)
  const sanitizeForSchema = (str) => {
    if (typeof str !== 'string') return '';
    return str
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000); // Google recommends reasonable length
  };

  // FAQ Schema for AI Search (only include valid Q&A pairs for rich results)
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": allFaqs
      .map(faq => ({
        "@type": "Question",
        "name": sanitizeForSchema(faq.question),
        "acceptedAnswer": {
          "@type": "Answer",
          "text": sanitizeForSchema(faq.answer)
        }
      }))
      .filter(item => item.name.length > 0 && item.acceptedAnswer.text.length > 0)
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F0' }}>
      {/* FAQ Schema for AI Search */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      
      {/* Header - Exact same as Landing page */}
      <header className="pt-3 pb-3 md:pt-4 md:pb-3" style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #DDE6DE' }}>
        <div className="w-full px-3 md:max-w-7xl md:mx-auto md:px-8">
          {/* Mobile Layout */}
          <div className="flex lg:hidden items-center justify-between">
            <h1 className="text-[8px] font-bold tracking-widest uppercase" style={{ color: '#9CA3AF', fontFamily: 'Poppins, sans-serif', letterSpacing: '0.15em' }}>Organize Your Research</h1>
            <Link to="/" className="cursor-pointer hover:opacity-80 transition-opacity">
              <img 
                src={logo} 
                alt="Logo" 
                className="rounded-full shadow object-contain" 
                style={{ 
                  width: '48px', 
                  height: '48px',
                  imageRendering: 'auto',
                  backfaceVisibility: 'hidden',
                  transform: 'translateZ(0)',
                  WebkitBackfaceVisibility: 'hidden',
                  willChange: 'transform',
                  WebkitTransform: 'translateZ(0)',
                  msTransform: 'translateZ(0)'
                }} 
              />
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSignIn}
                className="px-2 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ color: '#7F9E95', backgroundColor: 'transparent' }}
              >
                Log In
              </button>
              <button
                onClick={handleGetStarted}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-md hover:shadow-lg"
                style={{ backgroundColor: '#7F9E95', color: '#FFFFFF' }}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:flex items-center justify-between">
            <h1 className="text-sm font-medium tracking-widest uppercase" style={{ color: '#9CA3AF', fontFamily: 'Poppins, sans-serif', letterSpacing: '0.15em' }}>Organize Your Research</h1>
            <div className="flex-1 flex justify-center">
              <Link to="/" className="cursor-pointer hover:opacity-80 transition-opacity">
                <img src={logo} alt="Logo" className="rounded-full shadow object-cover" style={{ width: '80px', height: '80px' }} />
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleSignIn}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{ color: '#7F9E95', backgroundColor: 'transparent' }}
              >
                Log In
              </button>
              <button
                onClick={handleGetStarted}
                className="px-6 py-2 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                style={{ backgroundColor: '#7F9E95', color: '#FFFFFF' }}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 md:py-20" style={{ backgroundColor: '#EFF2EE' }}>
        <div className="w-full px-3 md:max-w-7xl md:mx-auto md:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <HelpCircle className="w-16 h-16 md:w-20 md:h-20" style={{ color: '#7F9E95' }} />
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>
              Frequently Asked Questions
            </h1>
            <p className="text-base md:text-xl lg:text-2xl mb-8" style={{ color: '#6B7D7A' }}>
              Everything you need to know about The Pep Planner
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 md:py-16" style={{ backgroundColor: '#F5F5F0' }}>
        <div className="w-full px-3 md:max-w-7xl md:mx-auto md:px-8">
          <div className="max-w-7xl mx-auto space-y-8 md:space-y-12">
            {faqCategories.map((category, categoryIndex) => {
              // Calculate global index offset for each category
              const startIndex = faqCategories.slice(0, categoryIndex).reduce((sum, cat) => sum + cat.faqs.length, 0);
              
              return (
                <div key={categoryIndex} className="space-y-4 md:space-y-5">
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-4 md:mb-6" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>
                    {category.title}
                  </h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                    {category.faqs.map((faq, faqIndex) => {
                      const globalIndex = startIndex + faqIndex;
                      return (
                        <div
                          key={faqIndex}
                          className="rounded-lg md:rounded-xl overflow-hidden shadow-sm"
                          style={{ backgroundColor: '#FFFFFF' }}
                        >
                          <button
                            onClick={() => setOpenIndex(openIndex === globalIndex ? null : globalIndex)}
                            className="w-full px-4 md:px-6 py-4 md:py-5 flex items-center justify-between text-left transition-colors hover:opacity-90"
                            style={{ 
                              backgroundColor: openIndex === globalIndex ? '#7F9E95' : '#FFFFFF',
                              color: openIndex === globalIndex ? '#FFFFFF' : '#2F3B3A'
                            }}
                          >
                            <span className="text-sm md:text-base lg:text-lg font-semibold pr-4" style={{ fontFamily: 'Poppins, sans-serif' }}>{faq.question}</span>
                            {openIndex === globalIndex ? (
                              <ChevronUp className="w-5 h-5 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="w-5 h-5 flex-shrink-0" />
                            )}
                          </button>
                          {openIndex === globalIndex && (
                            <div
                              className="px-4 md:px-6 py-4 md:py-5 border-t"
                              style={{ 
                                borderColor: '#DDE6DE',
                                backgroundColor: '#F5F5F0'
                              }}
                            >
                              <p className="text-sm md:text-base leading-relaxed" style={{ color: '#6B7D7A' }}>
                                {faq.answer}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-16" style={{ backgroundColor: '#EFF2EE' }}>
        <div className="w-full px-3 md:max-w-7xl md:mx-auto md:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 md:mb-6" style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}>
              Still Have Questions?
            </h2>
            <p className="text-base md:text-lg mb-6 md:mb-8" style={{ color: '#6B7D7A' }}>
              Can't find what you're looking for? Get in touch with our support team.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 justify-center">
              <button
                onClick={() => setShowContact(true)}
                className="px-6 md:px-8 py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                style={{ backgroundColor: '#7F9E95', color: '#FFFFFF' }}
              >
                Contact Support
              </button>
              <span className="text-sm md:text-base" style={{ color: '#6B7D7A' }}>or</span>
              <button
                onClick={handleGetStarted}
                className="px-6 md:px-8 py-3 rounded-lg font-semibold border transition-all"
                style={{ 
                  borderColor: '#7F9E95', 
                  color: '#7F9E95',
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#7F9E95';
                  e.target.style.color = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#7F9E95';
                }}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Exact same as Landing page */}
      <footer className="py-12" style={{ backgroundColor: '#2F3B3A', borderTop: `1px solid #DDE6DE` }}>
        <div className="w-full px-3 md:max-w-7xl md:mx-auto md:px-8">
          <div className="grid grid-cols-4 md:grid-cols-4 gap-4 md:gap-8">
            <div className="col-span-2 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <img src={logo} alt="Logo" className="h-8 w-8 md:h-10 md:w-10 rounded-full shadow object-cover" />
                <div>
                  <h3 className="text-sm md:text-lg font-semibold" style={{ color: '#FFFFFF' }}>Organize Your Research</h3>
                  <p className="text-xs md:text-sm" style={{ color: '#A0B9B3' }}>
                    All-in-One Research Tool
                  </p>
                </div>
              </div>
            </div>
            <div className="col-span-1">
              <h4 className="text-xs md:text-sm font-semibold mb-2 md:mb-4" style={{ color: '#FFFFFF' }}>Support</h4>
              <ul className="space-y-1 md:space-y-2 text-xs md:text-sm" style={{ color: '#A0B9B3' }}>
                <li><a href="/faq" className="hover:underline">FAQ</a></li>
                <li><button onClick={() => setShowContact(true)} className="hover:underline">Contact</button></li>
              </ul>
            </div>
            <div className="col-span-1">
              <h4 className="text-xs md:text-sm font-semibold mb-2 md:mb-4" style={{ color: '#FFFFFF' }}>Legal</h4>
              <ul className="space-y-1 md:space-y-2 text-xs md:text-sm" style={{ color: '#A0B9B3' }}>
                <li><button onClick={() => setShowPrivacy(true)} className="hover:underline">Privacy Policy</button></li>
                <li><button onClick={() => setShowTerms(true)} className="hover:underline">Terms of Service</button></li>
              </ul>
            </div>
          </div>
           <div className="border-t mt-8 pt-8" style={{ borderColor: '#DDE6DE' }}>
             <p className="text-center text-sm" style={{ color: '#A0B9B3' }}>
               © {new Date().getFullYear()} The Pep Planner. All rights reserved.
             </p>
             <p className="text-center text-base mt-2" style={{ color: '#D1D9D6', fontFamily: 'Cedarville Cursive, cursive' }}>
               - for the love of research
             </p>
           </div>
        </div>
      </footer>

      {/* Modals */}
      <LandingTermsModal open={showTerms} onClose={() => setShowTerms(false)} />
      <LandingPrivacyModal open={showPrivacy} onClose={() => setShowPrivacy(false)} />
      <LandingContactModal open={showContact} onClose={() => setShowContact(false)} />
    </div>
  );
}

