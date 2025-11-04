import React from 'react';
import { Apple, Share, Plus, Home, Smartphone } from 'lucide-react';
import { isIOSBrowser } from '../../utils/platform';

/**
 * Simple inline banner for iOS users on Landing page
 * Prominently displays install instructions
 */
export default function IOSInstallBanner() {
  // Only show on iOS browsers
  if (!isIOSBrowser()) {
    return null;
  }

  return (
    <div className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-lg">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-3 shadow-md">
          <Apple size={32} className="text-white" />
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Smartphone size={20} className="text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">
              iPhone/iPad Users!
            </h3>
          </div>
          
          <p className="text-gray-700 mb-4">
            Install <strong>The Pep Planner</strong> on your home screen for the best experience — no App Store needed!
          </p>

          {/* Quick Instructions */}
          <div className="bg-white rounded-xl p-4 space-y-3 shadow-sm border border-blue-100">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                1
              </div>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-gray-700">Tap</span>
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-md border border-blue-200">
                  <Share size={16} className="text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">Share</span>
                </div>
                <span className="text-gray-700">below</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                2
              </div>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-gray-700">Select</span>
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-md border border-blue-200">
                  <Plus size={14} className="text-blue-600" />
                  <Home size={14} className="text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">Add to Home Screen</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                3
              </div>
              <span className="text-gray-700">Tap <strong>Add</strong> to confirm ✨</span>
            </div>
          </div>

          {/* Benefits */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              ✓ Full-screen experience
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              ✓ Quick access
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              ✓ Works offline
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

