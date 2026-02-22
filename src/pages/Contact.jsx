import React from 'react';
import { Mail } from 'lucide-react';
import LandingHeader from '../components/layout/LandingHeader';
import LandingFooter from '../components/layout/LandingFooter';
import ContactFormContent from '../components/common/ContactFormContent';
import { usePageSEO } from '../utils/pageSEO';

export default function Contact() {
  usePageSEO();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F0', fontFamily: 'Poppins, sans-serif' }}>
      <LandingHeader />
      <div className="py-12 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl border p-6 md:p-8" style={{ borderColor: '#DDE6DE' }}>
            <div className="flex items-center gap-3 mb-6 pb-6 border-b" style={{ borderColor: '#DDE6DE' }}>
              <div className="p-2 rounded-full" style={{ backgroundColor: '#F5F5F0' }}>
                <Mail className="w-6 h-6" style={{ color: '#7F9E95' }} />
              </div>
              <h1 className="text-2xl font-bold" style={{ color: '#2F3B3A' }}>Contact Us</h1>
            </div>
            <ContactFormContent source="contact_page" />
          </div>
        </div>
      </div>
      <LandingFooter />
    </div>
  );
}
