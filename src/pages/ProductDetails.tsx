import React, { useState, useEffect } from 'react';
import { Star, Truck, ShieldCheck, Heart, Share2, MessageSquare, ShoppingCart, Minus, Plus, ArrowLeft, ChevronRight, Store, MessageCircle, Flag } from 'lucide-react';
import { Link, useNavigate } from '../components/common/RouteLink';
import { formatCurrency, cn } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { ReportModal } from '../components/modals/ReportModal';
import { RFQModal } from '../components/modals/RFQModal';
import { db } from '../lib/firebase';
import { doc, getDoc, onSnapshot, query, where, collection, addDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { Product, Store as StoreType } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firebaseErrors';
import { useTranslation } from 'react-i18next';
import { getTranslatedField } from '../lib/i18nUtils';
import { CATEGORIES } from '../constants';
import { Skeleton } from '../components/common/Skeleton';
import { ProductReviews } from '../components/common/Reviews';

import { useLocation as useAppLocation } from '../context/LocationContext';

export function ProductDetails({ id }: { id: string }) {
  const { t } = useTranslation();
  const { selectedCountry } = useAppLocation();
  const [product, setProduct] = useState<Product | null>(null);
  const [store, setStore] = useState<StoreType | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isRFQModalOpen, setIsRFQModalOpen] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const { addToCart } = useCart();
  const { startChatWithSeller } = useChat();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(doc(db, 'products', id), async (docSnap) => {
      if (docSnap.exists()) {
        const productData = { ...docSnap.data(), id: docSnap.id } as Product;
        setProduct(productData);
        setQuantity(productData.minOrderQuantity || 1);
        
        // Fetch store info
        const storeSnap = await getDoc(doc(db, 'stores', productData.storeId));
        if (storeSnap.exists()) {
          setStore({ ...storeSnap.data(), id: storeSnap.id } as StoreType);
        }
      }
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, `products/${id}`));

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    const q = query(collection(db, 'favorites'), where('userId', '==', user.uid), where('productId', '==', id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIsFavorited(!snapshot.empty);
    });
    return () => unsubscribe();
  }, [user, id]);

  const toggleFavorite = async () => {
    if (!user) {
      navigate('/login?redirect=product/' + id);
      return;
    }
    try {
      if (isFavorited) {
        const q = query(collection(db, 'favorites'), where('userId', '==', user.uid), where('productId', '==', id));
        const snap = await getDocs(q);
        snap.forEach(async (d) => await deleteDoc(doc(db, 'favorites', d.id)));
      } else {
        await addDoc(collection(db, 'favorites'), {
          userId: user.uid,
          productId: id,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Favorite toggle error:", error);
    }
  };

  const handleLiveChat = async () => {
    if (!user) {
      navigate('/login?redirect=product/' + id);
      return;
    }
    if (!product) return;
    try {
      const sellerId = product.sellerId; 
      await startChatWithSeller(sellerId);
    } catch (error) {
      console.error("Chat error:", error);
    }
  };

  const currentPrice = product?.wholesalePrices 
    ? (product.wholesalePrices.filter(t => quantity >= t.minQuantity).sort((a,b) => b.minQuantity - a.minQuantity)[0]?.price || product.price)
    : product?.price || 0;

  const totalPrice = currentPrice * quantity;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Skeleton className="h-6 w-24 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 bg-white p-6 sm:p-10 rounded-[40px] border border-gray-100 shadow-sm">
          <Skeleton className="aspect-square w-full rounded-[32px]" />
          <div className="space-y-6">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-3/4" />
            <div className="flex gap-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-20 w-full" />
            <div className="flex gap-4">
              <Skeleton className="h-14 flex-1 rounded-2xl" />
              <Skeleton className="h-14 flex-1 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-black text-gray-900 mb-4 italic">Product not found</h2>
        <Link to="/marketplace" className="text-blue-600 font-bold hover:underline">Return to Marketplace</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <button onClick={() => window.history.back()} className="mb-6 flex items-center gap-2 text-gray-500 font-bold hover:text-blue-600 transition-colors">
         <ArrowLeft className="w-5 h-5" /> {t('common.back')}
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 bg-white p-6 sm:p-10 rounded-[40px] border border-gray-100 shadow-sm">
        {/* Gallery */}
        <div className="space-y-6">
          <motion.div 
            layoutId={`prod-img-${product.id}`}
            className="aspect-square rounded-[32px] overflow-hidden bg-gray-50 border border-gray-100 relative"
          >
            <img 
              src={product.images[activeImage] || 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?auto=format&fit=crop&q=80&w=800'} 
              alt={getTranslatedField(product, 'name', product.name)} 
              loading="lazy"
              className="w-full h-full object-cover"
            />
            {product.minOrderQuantity > 1 && (
               <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                  <p className="text-[10px] font-black text-white uppercase tracking-widest italic">{t('b2b.min_order')}: {product.minOrderQuantity} units</p>
               </div>
            )}
          </motion.div>
          <div className="flex gap-4">
            {product.images.map((img, i) => (
              <button 
                key={i} 
                onClick={() => setActiveImage(i)}
                className={cn(
                  "w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all",
                  activeImage === i ? "border-blue-600 scale-105" : "border-transparent opacity-60 hover:opacity-100"
                )}
              >
                <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase tracking-widest leading-none">
                {CATEGORIES.find(c => c.id === product.category)?.translationKey ? t(CATEGORIES.find(c => c.id === product.category)!.translationKey!) : product.category}
              </span>
              {product.wholesalePrices && (
                <span className="px-4 py-1.5 bg-orange-50 text-orange-600 rounded-full text-xs font-black uppercase tracking-widest leading-none border border-orange-100">
                  {t('b2b.wholesale')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
               <button 
                onClick={toggleFavorite}
                className={cn("transition-colors", isFavorited ? "text-red-500 fill-red-500" : "text-gray-300 hover:text-red-500")}
               >
                 <Heart className="w-6 h-6" />
               </button>
               <button className="text-gray-300 hover:text-blue-500 transition-colors"><Share2 className="w-6 h-6" /></button>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 leading-tight mb-4">
            {getTranslatedField(product, 'name', product.name)}
          </h1>

          <div className="flex items-center gap-6 mb-4">
            <div className="flex items-center gap-1.5">
              <Star className="w-5 h-5 text-orange-400 fill-orange-400" />
              <span className="font-black text-gray-900">{product.rating}</span>
              <span className="text-sm text-gray-400 font-medium">({product.reviewCount} reviews)</span>
            </div>
            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
            <div className="flex items-center gap-1.5 text-green-600 font-bold text-sm">
               <ShieldCheck className="w-4 h-4" /> Verified Quality
            </div>
          </div>

          {product.wholesalePrices && (
            <div className="mb-6 space-y-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">{t('b2b.bulk_pricing')}</p>
              <div className="flex gap-2">
                {product.wholesalePrices.map((tier, idx) => (
                  <div key={idx} className="flex-1 p-3 bg-blue-50/50 rounded-2xl border border-blue-100 text-center">
                    <p className="text-xs font-black text-gray-900">{tier.minQuantity}+</p>
                    <p className="text-[10px] font-bold text-blue-600">{formatCurrency(tier.price).split(',')[0]} MZN</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-6 mb-8 mt-2">
            {product.colors && product.colors.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">{t('common.color')}</p>
                <div className="flex flex-wrap gap-3">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        "w-10 h-10 rounded-full border-2 transition-all p-0.5",
                        selectedColor === color ? "border-blue-600 scale-110" : "border-transparent hover:border-gray-200"
                      )}
                    >
                      <div 
                        className="w-full h-full rounded-full border border-black/5"
                        style={{ backgroundColor: color.toLowerCase() }} 
                        title={color}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.sizes && product.sizes.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">{t('common.size')}</p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={cn(
                        "min-w-12 h-10 px-4 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center",
                        selectedSize === size 
                          ? "border-blue-600 bg-blue-50 text-blue-600" 
                          : "border-gray-100 bg-white text-gray-600 hover:border-gray-200"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-50 p-6 rounded-3xl mb-8 flex items-center justify-between">
             <div>
               <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mb-1">Total Price</p>
               <p className="text-4xl font-black text-gray-900 leading-none">
                 {formatCurrency(totalPrice, product.currency || selectedCountry.currency).split(',')[0]} <span className="text-sm">{product.currency || selectedCountry.currency}</span>
               </p>
               {quantity > 1 && <p className="text-[10px] font-bold text-blue-600 mt-2 italic shadow-sm">{formatCurrency(currentPrice, product.currency || selectedCountry.currency)} per unit</p>}
             </div>
             <div className="flex items-center bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
                <button 
                  onClick={() => setQuantity(Math.max(product.minOrderQuantity || 1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-blue-600 disabled:opacity-30"
                  disabled={quantity <= (product.minOrderQuantity || 1)}
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className="w-10 text-center font-black text-gray-900">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-blue-600"
                >
                  <Plus className="w-5 h-5" />
                </button>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
             <button 
               onClick={() => {
                 if (product.colors?.length && !selectedColor) {
                   alert(t('common.select_color', 'Please select a color'));
                   return;
                 }
                 if (product.sizes?.length && !selectedSize) {
                   alert(t('common.select_size', 'Please select a size'));
                   return;
                 }
                 addToCart(product as any, quantity, selectedColor || undefined, selectedSize || undefined);
               }}
               className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-100"
             >
                <ShoppingCart className="w-6 h-6" /> Add to Cart
             </button>
             <button
               onClick={() => setIsRFQModalOpen(true)}
               className="flex-1 py-5 bg-orange-600 text-white border border-orange-500 rounded-2xl font-black hover:bg-orange-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-orange-100"
             >
                <Flag className="w-6 h-6" /> {t('b2b.get_quote')}
             </button>
          </div>

          {!user && (
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center mb-6 bg-gray-50 py-2 rounded-xl border border-gray-100">
              💡 {t('auth.signin_recommend', 'Sign in for better order tracking & history')}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 mb-8">
            <button
               onClick={handleLiveChat}
               className="py-5 bg-blue-50 text-blue-600 border border-blue-100 rounded-2xl font-black hover:bg-blue-100 transition-all flex items-center justify-center gap-3 shadow-sm"
             >
                <MessageCircle className="w-6 h-6" /> Chat with Supplier
             </button>
             <a 
               href={`https://wa.me/${store?.whatsappNumber}?text=Interested in buying ${product.name}`}
               target="_blank"
               rel="noopener noreferrer"
               className="py-5 bg-green-500 text-white rounded-2xl font-black hover:bg-green-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-green-100"
             >
                <MessageSquare className="w-6 h-6" /> Contact on WA
             </a>
          </div>

          <div className="space-y-4 mb-8">
             <div className="flex items-center gap-3 p-4 bg-green-50 text-green-700 rounded-2xl border border-green-100">
                <Truck className="w-5 h-5" />
                <p className="text-sm font-bold">Delivery inside Maputo available within 24 hours.</p>
             </div>
             <div className="flex items-center gap-3 p-4 bg-gray-50 text-gray-600 rounded-2xl border border-gray-100">
                <Store className="w-5 h-5 text-blue-500" />
                <p className="text-sm font-bold">In stock: <span className="text-gray-900 font-black">{product.stock} items</span> remaining.</p>
             </div>
          </div>

          <div className="pt-8 border-t border-gray-100 flex items-center justify-between">
             <div>
               <h3 className="font-black text-gray-900 text-lg mb-4">Store Information</h3>
               <Link to={`/store/${product.storeId}`} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl overflow-hidden">
                      {store?.logo ? <img src={store.logo} className="w-full h-full object-cover" /> : store?.businessName?.[0] || 'S'}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 leading-tight group-hover:text-blue-600 transition-colors">{store?.businessName || 'Loading Store...'}</h4>
                      <p className="text-xs text-gray-400">Verified Platinum Seller</p>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
               </Link>
             </div>
             <button 
               onClick={() => setIsReportModalOpen(true)}
               className="flex items-center gap-2 text-[10px] font-black text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors self-end pb-1"
             >
               <Flag className="w-4 h-4" /> Report
             </button>
          </div>
        </div>
      </div>

      <ReportModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)}
        targetId={id}
        targetType="product"
      />

      <RFQModal 
        isOpen={isRFQModalOpen}
        onClose={() => setIsRFQModalOpen(false)}
        product={product}
      />

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-12">
         <div className="md:col-span-2 space-y-8">
            <section>
              <h3 className="text-2xl font-black text-gray-900 mb-6">Product Description</h3>
              <p className="text-gray-600 leading-relaxed text-lg">{getTranslatedField(product, 'description', product.description)}</p>
            </section>
            
            <section className="pt-12 border-t border-gray-100">
               <ProductReviews productId={id} />
            </section>
            
            <section>
              <h3 className="text-2xl font-black text-gray-900 mb-6">Specifications</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {product.specs?.map((spec, i) => (
                   <div key={i} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100">
                      <span className="text-gray-500 font-medium">{spec.name}</span>
                      <span className="text-gray-900 font-bold">{spec.value}</span>
                   </div>
                ))}
                {!product.specs?.length && (
                  <p className="text-gray-500 italic font-medium">No technical specifications provided for this product.</p>
                )}
              </div>
            </section>
         </div>
         
         <div>
            <h3 className="text-2xl font-black text-gray-900 mb-6">Related Products</h3>
            <div className="space-y-6">
              {[1,2,3].map(i => (
                 <Link key={i} to={`/product/${i}`} className="flex items-center gap-4 group">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                       <img src={`https://images.unsplash.com/photo-${1500000000000 + i}?auto=format&fit=crop&q=80&w=200`} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                       <h4 className="font-bold text-gray-900 text-sm mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">Related Smartphone Elite</h4>
                       <p className="font-black text-blue-600 text-sm">45,000 MZN</p>
                    </div>
                 </Link>
              ))}
            </div>
         </div>
      </div>
    </div>
  );
}
