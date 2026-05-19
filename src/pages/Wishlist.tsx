import React, { useState, useEffect } from 'react';
import { Heart, ShoppingCart, Trash2, ArrowRight, Store, Star } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Product, Favorite } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Link } from '../components/common/RouteLink';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '../components/common/Skeleton';
import { motion, AnimatePresence } from 'motion/react';

export function Wishlist() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [favorites, setFavorites] = useState<(Favorite & { product?: Product })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const q = query(collection(db, 'favorites'), where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const favsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Favorite));
      
      const enrichedFavs = await Promise.all(favsData.map(async (fav) => {
        const productSnap = await getDoc(doc(db, 'products', fav.productId));
        if (productSnap.exists()) {
          return { ...fav, product: { ...productSnap.data(), id: productSnap.id } as Product };
        }
        return { ...fav, product: undefined };
      }));

      setFavorites(enrichedFavs.filter((f): f is Favorite & { product: Product } => !!f.product));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const removeFavorite = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'favorites', id));
    } catch (error) {
      console.error("Error removing favorite:", error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="h-10 w-48 bg-gray-100 animate-pulse rounded-xl mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="aspect-[3/4] rounded-[32px]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
       <div className="flex items-center justify-between mb-8">
         <div className="flex items-center gap-3">
           <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
             <Heart className="w-6 h-6 fill-red-600" />
           </div>
           <h1 className="text-3xl font-black text-gray-900 italic">{t('wishlist.title')}</h1>
         </div>
         <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{favorites.length} {t('wishlist.items_saved')}</p>
       </div>

       {favorites.length === 0 ? (
         <div className="bg-white rounded-[40px] p-20 text-center border-2 border-dashed border-gray-100">
           <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
             <Heart className="w-12 h-12 text-gray-200" />
           </div>
           <h2 className="text-2xl font-black text-gray-900 mb-2 italic">{t('wishlist.empty')}</h2>
           <p className="text-gray-500 font-medium mb-8">{t('wishlist.empty_desc')}</p>
           <Link 
             to="/marketplace" 
             className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black italic hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
           >
             {t('wishlist.start_exploring')} <ArrowRight className="w-5 h-5" />
           </Link>
         </div>
       ) : (
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
           <AnimatePresence mode="popLayout">
             {favorites.map((fav) => {
               const p = fav.product!;
               return (
                 <motion.div 
                   key={fav.id}
                   layout
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.9 }}
                   className="group bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all"
                 >
                   <Link to={`/product/${p.id}`} className="block aspect-square overflow-hidden relative">
                     <img src={p.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={p.name} />
                     <div className="absolute top-4 left-4 flex flex-col gap-2">
                        {p.minOrderQuantity > 1 && (
                           <span className="px-3 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-full border border-white/20 leading-none">
                             MOQ: {p.minOrderQuantity}
                           </span>
                        )}
                     </div>
                   </Link>
                   
                   <div className="p-6">
                     <div className="flex items-center justify-between mb-2">
                       <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">{p.category}</p>
                       <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-orange-400 fill-orange-400" />
                          <span className="text-xs font-black text-gray-900">{p.rating}</span>
                       </div>
                     </div>
                     <Link to={`/product/${p.id}`} className="block font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-4 line-clamp-1">
                       {p.name}
                     </Link>
                     <div className="flex items-center justify-between">
                       <p className="font-black text-xl text-gray-900">{formatCurrency(p.price).split(',')[0]} <span className="text-[10px] opacity-40 uppercase">MZN</span></p>
                       <button 
                         onClick={() => removeFavorite(fav.id)}
                         className="p-2 text-gray-300 hover:text-red-600 transition-colors"
                         title="Remove from favorites"
                       >
                         <Trash2 className="w-5 h-5" />
                       </button>
                     </div>
                   </div>
                 </motion.div>
               );
             })}
           </AnimatePresence>
         </div>
       )}
    </div>
  );
}
