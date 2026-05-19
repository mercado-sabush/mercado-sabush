import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Store, Product } from '../types';
import { Star, MapPin, MessageSquare, ShieldCheck, Flag, ArrowLeft, Share2, Heart, Search, Filter } from 'lucide-react';
import { Link } from '../components/common/RouteLink';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';
import { ReportModal } from '../components/modals/ReportModal';
import { handleFirestoreError, OperationType } from '../lib/firebaseErrors';

export function StoreDetails({ id }: { id: string }) {
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  useEffect(() => {
    async function fetchStore() {
      try {
        const storeDoc = await getDoc(doc(db, 'stores', id));
        if (storeDoc.exists()) {
          setStore({ ...storeDoc.data(), id: storeDoc.id } as Store);
          
          // Fetch products for this store
          const q = query(collection(db, 'products'), where('storeId', '==', id));
          const querySnapshot = await getDocs(q);
          setProducts(querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Product[]);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `stores/${id}`);
      } finally {
        setLoading(false);
      }
    }
    fetchStore();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-black text-gray-900 mb-4">Store Not Found</h2>
        <p className="text-gray-500 mb-8 font-medium">The store you are looking for does not exist or has been removed.</p>
        <Link to="/marketplace" className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-3xl font-black hover:bg-blue-700 transition-all">
          <ArrowLeft className="w-5 h-5" /> Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Banner & Profile */}
      <div className="relative mb-32">
        <div className="h-64 sm:h-80 w-full rounded-[40px] overflow-hidden relative border border-gray-100">
          <img 
            src={store.banner || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1200'} 
            className="w-full h-full object-cover" 
            alt="Store Banner"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
        </div>
        
        <div className="absolute -bottom-24 left-8 right-8 flex flex-col md:flex-row items-end md:items-center justify-between gap-6">
          <div className="flex items-end gap-6">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-[40px] bg-white p-2 shadow-2xl border border-gray-100 relative z-10">
              <div className="w-full h-full rounded-[32px] overflow-hidden bg-blue-600 flex items-center justify-center text-white text-4xl font-black">
                {store.logo ? <img src={store.logo} alt="" className="w-full h-full object-cover" /> : store.businessName[0]}
              </div>
            </div>
            <div className="pb-4">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight italic">{store.businessName}</h1>
                {store.isVerified && <ShieldCheck className="w-8 h-8 text-blue-600 fill-blue-50" />}
              </div>
              <div className="flex items-center gap-4 text-gray-500 font-bold text-sm">
                <span className="flex items-center gap-1"><Star className="w-4 h-4 text-orange-400 fill-orange-400" /> {store.rating} ({store.reviewCount} reviews)</span>
                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {store.location}</span>
                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                <span className="text-blue-600 uppercase tracking-widest text-[10px] bg-blue-50 px-2 py-0.5 rounded-full">{store.category}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 mb-4">
            <button className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:bg-gray-50 transition-colors text-gray-400 hover:text-blue-600"><Share2 className="w-6 h-6" /></button>
            <button className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:bg-gray-50 transition-colors text-gray-400 hover:text-red-500"><Heart className="w-6 h-6" /></button>
            <a 
              href={`https://wa.me/${store.whatsappNumber}?text=Hi, I found your store on Mercado Sabush.`}
              className="px-8 py-4 bg-green-500 text-white rounded-2xl font-black shadow-xl shadow-green-100 hover:bg-green-600 transition-all flex items-center gap-2 italic"
            >
              <MessageSquare className="w-5 h-5" /> Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 mt-12">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
            <h3 className="text-xl font-black text-gray-900 mb-6 italic">Store Info</h3>
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Description</p>
                <p className="text-gray-600 font-medium leading-relaxed">{store.description || "No description provided."}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Delivery Options</p>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest leading-none">
                    {store.deliveryOptions}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setIsReportModalOpen(true)}
                className="flex items-center gap-2 text-[10px] font-black text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors mt-8"
              >
                <Flag className="w-4 h-4" /> Report Store
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
            <h2 className="text-2xl font-black text-gray-900 italic">Store Products ({products.length})</h2>
            <div className="flex gap-4 w-full sm:w-auto">
               <div className="relative flex-1 sm:w-64">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
                 <input 
                   type="text" 
                   placeholder="Search store..."
                   className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                 />
               </div>
               <button className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:bg-gray-100"><Filter className="w-6 h-6" /></button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
            {products.map((product) => (
              <motion.div 
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group"
              >
                <Link to={`/product/${product.id}`} className="block">
                  <div className="aspect-square rounded-[32px] overflow-hidden bg-gray-100 mb-4 relative">
                    <img 
                      src={product.images[0]} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 bg-white rounded-xl shadow-lg text-gray-400 hover:text-red-500 transition-colors">
                        <Heart className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">{product.name}</h3>
                  <p className="text-xs text-gray-400 font-medium mb-2">{product.category}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-black text-gray-900">{formatCurrency(product.price)}</p>
                    <div className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <Star className="w-3 h-3 text-orange-400 fill-orange-400" /> {product.rating}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {products.length === 0 && (
            <div className="bg-gray-50 rounded-[40px] p-20 text-center border border-dashed border-gray-200">
               <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                 <ShoppingBag className="w-10 h-10 text-gray-200" />
               </div>
               <h3 className="text-xl font-black text-gray-900 mb-2">No products yet</h3>
               <p className="text-gray-500 font-medium">This store hasn't listed any products for sale.</p>
            </div>
          )}
        </div>
      </div>

      <ReportModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)}
        targetId={id}
        targetType="store"
      />
    </div>
  );
}

function ShoppingBag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
