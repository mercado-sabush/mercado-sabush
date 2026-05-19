import React from 'react';
import { Search, ShoppingBag, ArrowRight, Star, Truck, ShieldCheck, Zap, Store, MessageSquare, PlusCircle } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { Link } from '../components/common/RouteLink';
import { CATEGORIES, CATEGORY_ICONS } from '../constants';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export function Home() {
  const { t, i18n } = useTranslation();
  return (
    <div className="flex flex-col gap-12 pb-16">
      {/* Hero Section */}
      <section className="relative h-[500px] flex items-center overflow-hidden bg-blue-600">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-400 rounded-full blur-3xl -ml-10 -mb-10"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 w-full relative z-10 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 text-center md:text-left">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-extrabold text-white leading-tight"
            >
              <Trans i18nKey="home.hero_title">
                Find products from <span className="text-orange-400">retailers</span> and <span className="text-green-400">wholesalers</span> near you.
              </Trans>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-blue-100 text-lg md:text-xl mt-6 max-w-lg mx-auto md:mx-0"
            >
              {t('home.hero_subtitle')}
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-10 flex flex-col sm:flex-row gap-4 justify-center md:justify-start items-center"
            >
              <Link to="/marketplace" className="px-8 py-4 bg-white text-blue-600 font-bold rounded-xl shadow-lg hover:bg-gray-100 transform hover:scale-105 transition-all flex items-center justify-center gap-2">
                {t('home.browse_products')} <ShoppingBag className="w-5 h-5" />
              </Link>
              
              <div className="flex bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-1">
                <Link to="/login" className="px-6 py-3 text-white font-black text-sm hover:bg-white/10 rounded-lg transition-all uppercase tracking-widest">
                  {t('nav.login')}
                </Link>
                <Link to="/login?mode=register" className="px-6 py-3 bg-white text-blue-600 font-black text-sm rounded-lg shadow-xl hover:scale-105 transition-all uppercase tracking-widest">
                  {t('nav.register')}
                </Link>
              </div>

              {/* Home Language Toggle */}
              <div className="flex bg-white/20 backdrop-blur-md rounded-xl p-1 border border-white/30 ml-0 sm:ml-4">
                <button 
                  onClick={() => i18n.changeLanguage('pt')} 
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-black transition-all",
                    i18n.language === 'pt' ? "bg-white text-blue-600 shadow-sm" : "text-white hover:bg-white/10"
                  )}
                >
                  PT
                </button>
                <button 
                  onClick={() => i18n.changeLanguage('en')} 
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-black transition-all",
                    i18n.language === 'en' ? "bg-white text-blue-600 shadow-sm" : "text-white hover:bg-white/10"
                  )}
                >
                  EN
                </button>
              </div>
            </motion.div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex-1 hidden md:block"
          >
            <div className="relative">
               <img 
                 src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=800" 
                 alt="Mozambique Shopping" 
                 loading="lazy"
                 className="rounded-3xl shadow-2xl border-4 border-white transform rotate-3"
               />
               <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-lg flex items-center gap-3">
                 <div className="bg-green-100 p-2 rounded-lg text-green-600">
                    <Truck className="w-6 h-6" />
                 </div>
                 <div>
                    <p className="text-xs text-gray-500 font-medium">{t('home.fast_delivery')}</p>
                    <p className="text-sm font-bold">{t('home.delivery_countrywide')}</p>
                 </div>
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Marketplace Search (for mobile/hero sub) */}
      <section className="max-w-4xl mx-auto px-4 -mt-10 relative z-20 w-full md:hidden">
        <div className="bg-white p-2 rounded-2xl shadow-xl border border-gray-100 flex items-center">
          <div className="p-3 text-gray-400">
            <Search className="w-6 h-6" />
          </div>
          <input 
            type="text" 
            placeholder={t('home.search_placeholder')} 
            className="flex-1 py-4 border-none focus:ring-0 text-gray-700 bg-transparent"
          />
          <button className="bg-blue-600 text-white p-3 rounded-xl">
             <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="max-w-7xl mx-auto px-4 w-full grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { icon: ShieldCheck, title: t('home.verified_sellers'), desc: t('home.safe_shopping'), color: "blue" },
          { icon: Zap, title: t('home.fast_delivery'), desc: t('home.countrywide'), color: "orange" },
          { icon: MessageSquare, title: t('home.chat_sellers'), desc: t('home.whatsapp_ready'), color: "green" },
          { icon: Star, title: t('home.quality_goods'), desc: t('home.top_rated'), color: "purple" }
        ].map((badge, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className={`p-3 rounded-xl bg-${badge.color}-50 text-${badge.color}-600`}>
              <badge.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{badge.title}</p>
              <p className="text-xs text-gray-500">{badge.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 w-full">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{t('home.browse_categories')}</h2>
          <Link to="/marketplace" className="text-blue-600 font-semibold text-sm flex items-center gap-1 hover:underline">
            {t('home.see_all')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {CATEGORIES.slice(0, 14).map((cat) => {
            const Icon = CATEGORY_ICONS[cat.icon] || ShoppingBag;
            return (
              <Link key={cat.id} to={`/marketplace?category=${cat.id}`} className="group flex flex-col items-center p-6 bg-white rounded-3xl border border-gray-100 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-50 transition-all text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all mb-4">
                  <Icon className="w-8 h-8" />
                </div>
                <p className="text-sm font-bold text-gray-900 mb-1">{cat.translationKey ? t(cat.translationKey) : cat.name}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{cat.productCount}+ {t('common.products', 'Products')}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Trending Products */}
      <section className="max-w-7xl mx-auto px-4 w-full">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{t('home.trending_products')}</h2>
          <Link to="/marketplace" className="text-blue-600 font-semibold text-sm hover:underline">{t('common.view_all')}</Link>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Mock Trending Products */}
          {[1,2,3,4].map((i) => (
             <div key={i} className="bg-white rounded-3xl border border-gray-100 overflow-hidden group hover:shadow-xl transition-all">
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={`https://images.unsplash.com/photo-${1500000000000 + i}?auto=format&fit=crop&q=80&w=400`} 
                    alt="Product" 
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur p-2 rounded-full shadow-sm">
                    <Zap className="w-4 h-4 text-orange-500 fill-orange-500" />
                  </div>
                  <div className="absolute bottom-3 left-3 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest">
                    {t('home.delivery_available')}
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-2">{t('categories.electronics')}</p>
                  <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-blue-600 transition-colors">Premium Smartphone X</h3>
                  <div className="flex items-center gap-1 mb-3">
                    <Star className="w-3 h-3 text-orange-400 fill-orange-400" />
                    <span className="text-xs font-bold text-gray-700">4.8</span>
                    <span className="text-xs text-gray-400 font-medium">(25 {t('reviews.title')})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400 line-through">25,000 {t('common.currency')}</p>
                      <p className="text-xl font-black text-gray-900">22,500 <span className="text-sm font-bold">{t('common.currency')}</span></p>
                    </div>
                    <button className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-900 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                       <PlusCircle className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                      <Store className="w-3 h-3" /> Tech Hub Maputo
                    </p>
                    <button className="text-green-500 hover:scale-110 transition-transform">
                       <MessageSquare className="w-5 h-5" />
                    </button>
                  </div>
                </div>
             </div>
          ))}
        </div>
      </section>

      {/* Call to Action for Sellers */}
      <section className="max-w-7xl mx-auto px-4 w-full">
        <div className="bg-gray-900 rounded-[40px] p-12 relative overflow-hidden flex flex-col md:flex-row items-center gap-12 text-center md:text-left">
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
             <div className="grid grid-cols-4 gap-4 transform rotate-12 scale-150">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="aspect-square bg-white rounded-2xl"></div>
                ))}
             </div>
          </div>
          
          <div className="flex-1 relative z-10">
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">{t('home.empower_business')}</h2>
            <p className="text-gray-400 text-lg mt-6 max-w-lg">
              {t('home.seller_cta_desc')}
            </p>
            <div className="mt-10 flex flex-wrap gap-4 justify-center md:justify-start">
               <Link to="/register-seller" className="px-10 py-5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all flex items-center gap-2">
                 {t('home.join_mercado')} <ArrowRight className="w-5 h-5" />
               </Link>
               <div className="flex items-center gap-4 text-white font-bold px-6 py-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <span className="text-blue-400">500+</span> {t('home.sellers_active')}
               </div>
            </div>
          </div>
          
          <div className="flex-1 relative z-10 w-full max-w-sm">
             <div className="bg-white p-6 rounded-3xl shadow-xl space-y-4 transform rotate-2">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 font-bold">98%</div>
                  <p className="text-gray-900 font-bold">{t('home.seller_satisfaction')}</p>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full w-[98%] bg-green-500"></div>
                </div>
                <div className="pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <ShieldCheck className="w-4 h-4 text-blue-500" /> {t('home.advanced_stats')}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <MessageSquare className="w-4 h-4 text-green-500" /> {t('home.whatsapp_leads')}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Zap className="w-4 h-4 text-orange-500" /> {t('home.easy_management')}
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Featured Sellers */}
      <section className="max-w-7xl mx-auto px-4 w-full mb-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{t('home.best_sellers')}</h2>
          <Link to="/marketplace" className="text-blue-600 font-semibold text-sm hover:underline">{t('home.view_all_shops')}</Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[
            { name: "Maputo Supermarket", cat: "Grocery & Home", loc: "Maputo City", logo: "M" },
            { name: "Beira Auto Parts", cat: "Automotive", loc: "Beira", logo: "B" },
            { name: "Nampula Tech Wholesalers", cat: "Electronics", loc: "Nampula", logo: "N" }
          ].map((seller, i) => (
             <Link key={i} to={`/store/${i}`} className="bg-white p-6 rounded-[32px] border border-gray-100 hover:border-blue-500 hover:shadow-xl transition-all flex items-center gap-6 group">
                <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black text-3xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                  {seller.logo}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">{seller.name}</h3>
                    <ShieldCheck className="w-4 h-4 text-blue-500 fill-blue-500" />
                  </div>
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-2">{seller.cat}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                       <Zap className="w-3 h-3 text-orange-500" /> 150+ Products
                    </p>
                    <div className="flex items-center gap-1">
                       <Star className="w-3 h-3 text-orange-400 fill-orange-400" />
                       <span className="text-xs font-bold text-gray-700">4.9</span>
                    </div>
                  </div>
                </div>
             </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
