import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const languages = [
  { code: 'pt', name: 'Português', flag: '🇲🇿' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
];

export const LanguageSelector: React.FC<{ variant?: 'nav' | 'minimal' | 'full' }> = ({ variant = 'nav' }) => {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = async (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
    
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          preferredLanguage: code
        });
      } catch (error) {
        console.error('Error saving language preference:', error);
      }
    }
  };

  if (variant === 'minimal') {
    return (
      <div className="flex gap-4">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-bold transition-all",
              i18n.language === lang.code 
                ? "bg-blue-600 text-white" 
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            )}
          >
            {lang.flag} {lang.name.split(' ')[0]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl transition-all",
          variant === 'nav' 
            ? "hover:bg-gray-100 text-gray-700 font-bold text-sm"
            : "bg-white border border-gray-100 shadow-sm text-gray-900 font-bold"
        )}
      >
        <Globe className="w-4 h-4 text-blue-600" />
        <span className="hidden md:inline">{currentLanguage.flag} {currentLanguage.name}</span>
        <span className="md:hidden">{currentLanguage.flag}</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
            >
              <div className="p-2 space-y-1">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-colors",
                      i18n.language === lang.code
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-xl">{lang.flag}</span>
                      {lang.name}
                    </span>
                    {i18n.language === lang.code && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
