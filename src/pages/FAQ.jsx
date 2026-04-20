import React, { useState, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import LandingContactModal from '../components/legal/LandingContactModal';
import LandingFooter from '../components/layout/LandingFooter';
import LandingHeader from '../components/layout/LandingHeader';
import { usePageSEO } from '../utils/pageSEO';
import { publicFaqCategories } from '../data/faqContent';

export default function FAQ() {
  usePageSEO();
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState(null);
  const [showContact, setShowContact] = useState(false);

  const handleGetStarted = () => {
    startTransition(() => {
      navigate('/login?trial=true');
    });
  };

  // Canonical source: src/data/faqContent.js (shared with Settings → Help Center).
  const faqCategories = publicFaqCategories;

  const allFaqs = faqCategories.flatMap((category) => category.faqs);

  const sanitizeForSchema = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/\s+/g, ' ').trim().slice(0, 5000);
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: allFaqs
      .map((faq) => ({
        '@type': 'Question',
        name: sanitizeForSchema(faq.question),
        acceptedAnswer: {
          '@type': 'Answer',
          text: sanitizeForSchema(faq.answer),
        },
      }))
      .filter((item) => item.name.length > 0 && item.acceptedAnswer.text.length > 0),
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F0' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <LandingHeader />

      <section className="py-12 md:py-20" style={{ backgroundColor: '#EFF2EE' }}>
        <div className="w-full px-3 md:max-w-7xl md:mx-auto md:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <HelpCircle className="w-16 h-16 md:w-20 md:h-20" style={{ color: '#7F9E95' }} />
            </div>
            <h1
              className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6"
              style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}
            >
              Frequently Asked Questions
            </h1>
            <p className="text-base md:text-xl lg:text-2xl mb-8" style={{ color: '#6B7D7A' }}>
              Everything you need to know about The Pep Planner
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16" style={{ backgroundColor: '#F5F5F0' }}>
        <div className="w-full px-3 md:max-w-7xl md:mx-auto md:px-8">
          <div className="max-w-7xl mx-auto space-y-8 md:space-y-12">
            {faqCategories.map((category, categoryIndex) => {
              const startIndex = faqCategories
                .slice(0, categoryIndex)
                .reduce((sum, cat) => sum + cat.faqs.length, 0);

              return (
                <div key={categoryIndex} className="space-y-4 md:space-y-5">
                  <h2
                    className="text-xl md:text-2xl lg:text-3xl font-bold mb-4 md:mb-6"
                    style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}
                  >
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
                            onClick={() =>
                              setOpenIndex(openIndex === globalIndex ? null : globalIndex)
                            }
                            className="w-full px-4 md:px-6 py-4 md:py-5 flex items-center justify-between text-left transition-colors hover:opacity-90"
                            style={{
                              backgroundColor:
                                openIndex === globalIndex ? '#7F9E95' : '#FFFFFF',
                              color: openIndex === globalIndex ? '#FFFFFF' : '#2F3B3A',
                            }}
                          >
                            <span
                              className="text-sm md:text-base lg:text-lg font-semibold pr-4"
                              style={{ fontFamily: 'Poppins, sans-serif' }}
                            >
                              {faq.question}
                            </span>
                            {openIndex === globalIndex ? (
                              <ChevronUp className="w-5 h-5 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="w-5 h-5 flex-shrink-0" />
                            )}
                          </button>
                          {openIndex === globalIndex && (
                            <div
                              className="px-4 md:px-6 py-4 md:py-5 border-t"
                              style={{ borderColor: '#DDE6DE', backgroundColor: '#F5F5F0' }}
                            >
                              <p
                                className="text-sm md:text-base leading-relaxed"
                                style={{ color: '#6B7D7A' }}
                              >
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

      <section className="py-12 md:py-16" style={{ backgroundColor: '#EFF2EE' }}>
        <div className="w-full px-3 md:max-w-7xl md:mx-auto md:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2
              className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 md:mb-6"
              style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}
            >
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
              <span className="text-sm md:text-base" style={{ color: '#6B7D7A' }}>
                or
              </span>
              <button
                onClick={handleGetStarted}
                className="px-6 md:px-8 py-3 rounded-lg font-semibold border transition-all"
                style={{
                  borderColor: '#7F9E95',
                  color: '#7F9E95',
                  backgroundColor: 'transparent',
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

      <LandingFooter />

      <LandingContactModal open={showContact} onClose={() => setShowContact(false)} />
    </div>
  );
}
