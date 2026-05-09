import React, { useState, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { CaretDown, CaretUp, IconContext } from '@phosphor-icons/react';
import LandingContactModal from '../components/legal/LandingContactModal';
import LandingFooter from '../components/layout/LandingFooter';
import LandingHeader from '../components/layout/LandingHeader';
import { usePageSEO } from '../utils/pageSEO';
import { publicFaqCategories } from '../data/faqContent';
import { themes, defaultThemeName } from '../theme/themes';

export default function FAQ() {
  usePageSEO();
  const navigate = useNavigate();
  const theme = themes[defaultThemeName];
  const [openIndex, setOpenIndex] = useState(null);
  const [showContact, setShowContact] = useState(false);

  const handleGetStarted = () => {
    startTransition(() => {
      navigate('/login?trial=true');
    });
  };

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

  const cardShadow = '0 25px 50px -12px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.04)';

  return (
    <IconContext.Provider value={{ weight: 'duotone' }}>
      <div
        className="min-h-screen"
        style={{
          backgroundColor: theme.background,
          fontFamily: 'Poppins, sans-serif',
        }}
      >
        <style>{`
          @keyframes tpp-faq-header-in {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes tpp-faq-main-in {
            from { opacity: 0; transform: translateY(18px) scale(0.985); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          .tpp-faq-header-wrap {
            animation: tpp-faq-header-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          .tpp-faq-main-wrap {
            animation: tpp-faq-main-in 0.65s cubic-bezier(0.22, 1, 0.36, 1) 0.08s both;
          }
          .tpp-faq-cta-wrap {
            animation: tpp-faq-main-in 0.65s cubic-bezier(0.22, 1, 0.36, 1) 0.14s both;
          }
          .tpp-faq-logo {
            animation: tpp-faq-logo-in 0.5s cubic-bezier(0.34, 1.2, 0.64, 1) both;
          }
          @media (prefers-reduced-motion: reduce) {
            .tpp-faq-header-wrap,
            .tpp-faq-main-wrap,
            .tpp-faq-cta-wrap {
              animation: none !important;
              opacity: 1 !important;
              transform: none !important;
            }
          }
        `}</style>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />

        <LandingHeader />

        <main>
          {/* Hero — title only (logo lives in LandingHeader) */}
          <section className="px-4 pt-8 pb-6 md:px-6 md:pt-10 md:pb-8">
            <div className="mx-auto max-w-lg text-center tpp-faq-header-wrap">
              <h1
                className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl"
                style={{ color: theme.primaryDark }}
              >
                Frequently Asked Questions
              </h1>
              <p
                className="mx-auto mt-3 max-w-md text-sm leading-relaxed sm:text-base"
                style={{ color: theme.textLight }}
              >
                Everything you need to know about The Pep Planner
              </p>
            </div>
          </section>

          {/* FAQ body — Login-style elevated surface */}
          <section className="px-4 pb-10 md:px-6">
            <div
              className="tpp-faq-main-wrap mx-auto max-w-6xl space-y-10 rounded-2xl border p-5 shadow-xl md:space-y-12 md:p-8 lg:p-10"
              style={{
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,
                boxShadow: cardShadow,
              }}
            >
              {faqCategories.map((category, categoryIndex) => {
                const startIndex = faqCategories
                  .slice(0, categoryIndex)
                  .reduce((sum, cat) => sum + cat.faqs.length, 0);

                return (
                  <div key={categoryIndex} className="space-y-4 md:space-y-5">
                    <h2
                      className="text-lg font-semibold tracking-tight md:text-xl lg:text-2xl"
                      style={{ color: theme.primaryDark, fontFamily: 'Poppins, sans-serif' }}
                    >
                      {category.title}
                    </h2>
                    <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
                      {category.faqs.map((faq, faqIndex) => {
                        const globalIndex = startIndex + faqIndex;
                        const isOpen = openIndex === globalIndex;
                        return (
                          <div
                            key={faqIndex}
                            className="overflow-hidden rounded-xl border transition-shadow duration-200"
                            style={{
                              borderColor: theme.border,
                              backgroundColor: theme.cardBackground,
                              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setOpenIndex(isOpen ? null : globalIndex)}
                              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors md:px-5 md:py-4"
                              style={{
                                backgroundColor: isOpen ? theme.primary : theme.cardBackground,
                                color: isOpen ? theme.textOnPrimary : theme.text,
                              }}
                            >
                              <span
                                className="text-sm font-semibold leading-snug md:text-base"
                                style={{ fontFamily: 'Poppins, sans-serif' }}
                              >
                                {faq.question}
                              </span>
                              {isOpen ? (
                                <CaretUp
                                  className="h-5 w-5 flex-shrink-0"
                                  style={{ color: isOpen ? theme.textOnPrimary : theme.textLight }}
                                  aria-hidden
                                />
                              ) : (
                                <CaretDown
                                  className="h-5 w-5 flex-shrink-0"
                                  style={{ color: theme.textLight }}
                                  aria-hidden
                                />
                              )}
                            </button>
                            {isOpen && (
                              <div
                                className="border-t px-4 py-4 md:px-5 md:py-5"
                                style={{
                                  borderColor: theme.border,
                                  backgroundColor: theme.secondary,
                                }}
                              >
                                <p
                                  className="text-sm leading-relaxed md:text-base"
                                  style={{ color: theme.textLight }}
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
          </section>

          {/* CTA */}
          <section className="px-4 pb-16 md:px-6 md:pb-20">
            <div
              className="tpp-faq-cta-wrap mx-auto max-w-3xl rounded-2xl border p-8 text-center shadow-xl md:p-10"
              style={{
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,
                boxShadow: cardShadow,
              }}
            >
              <h2
                className="mb-3 text-xl font-semibold tracking-tight md:text-2xl lg:text-3xl"
                style={{ color: theme.primaryDark, fontFamily: 'Poppins, sans-serif' }}
              >
                Still have questions?
              </h2>
              <p className="mb-8 text-base md:text-lg" style={{ color: theme.textLight }}>
                Can&apos;t find what you&apos;re looking for? Get in touch with our support team.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                <button
                  type="button"
                  onClick={() => setShowContact(true)}
                  className="w-full max-w-xs rounded-xl px-8 py-3 font-semibold shadow-md transition-all duration-200 hover:shadow-lg sm:w-auto"
                  style={{
                    backgroundColor: theme.primary,
                    color: theme.textOnPrimary,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  Contact support
                </button>
                <span className="text-sm md:text-base" style={{ color: theme.textLight }}>
                  or
                </span>
                <button
                  type="button"
                  onClick={handleGetStarted}
                  className="w-full max-w-xs rounded-xl border-2 px-8 py-3 font-semibold transition-all duration-200 sm:w-auto"
                  style={{
                    borderColor: theme.primary,
                    color: theme.primary,
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = `${theme.primary}18`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  Sign up
                </button>
              </div>
            </div>
          </section>
        </main>

        <LandingFooter />

        <LandingContactModal open={showContact} onClose={() => setShowContact(false)} />
      </div>
    </IconContext.Provider>
  );
}
