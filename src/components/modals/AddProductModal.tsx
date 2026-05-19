import React, { useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { X, Package, Camera, Plus, Trash2, ArrowRight, Wand2, Sparkles, Loader2, Search, Crop, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORIES } from '../../constants';
import { handleFirestoreError, OperationType } from '../../lib/firebaseErrors';
import { useTranslation } from 'react-i18next';
import { ImageCropper } from '../common/ImageCropper';
import { Product, Store } from '../../types';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import confetti from 'canvas-confetti';
import { cn } from '../../lib/utils';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: Store;
}

export function AddProductModal({ isOpen, onClose, store }: AddProductModalProps) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searchingImages, setSearchingImages] = useState(false);
  const [imageSuggestions, setImageSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [croppingIndex, setCroppingIndex] = useState<number | null>(null);
  const [moderating, setModerating] = useState<number | null>(null);
  const [moderationErrors, setModerationErrors] = useState<Record<number, string>>({});
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '',
    minOrderQuantity: '1',
    images: [''],
    deliveryAvailable: true,
    colors: '',
    sizes: ''
  });

  const [wholesaleTiers, setWholesaleTiers] = useState<{minQuantity: string, price: string}[]>([]);

  const addTier = () => {
    setWholesaleTiers([...wholesaleTiers, { minQuantity: '', price: '' }]);
  };

  const removeTier = (index: number) => {
    setWholesaleTiers(wholesaleTiers.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, field: 'minQuantity' | 'price', value: string) => {
    const newTiers = [...wholesaleTiers];
    newTiers[index][field] = value;
    setWholesaleTiers(newTiers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !store?.id) return;

    // Check if any images have moderation errors
    if (Object.keys(moderationErrors).length > 0) {
       alert(t('seller.resolve_moderation'));
       return;
    }

    setLoading(true);
    try {
      const storeId = store.id;
      // Auto-translate name and description
      const targetLangs = ['en', 'pt', 'fr'].filter(l => l !== i18n.language);
      
      let translations: any = {};
      
      try {
        const nameRes = await fetch('/api/ai/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: formData.name, targetLanguages: targetLangs })
        });
        const nameTrans = await nameRes.json();
        
        const descRes = await fetch('/api/ai/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: formData.description, targetLanguages: targetLangs })
        });
        const descTrans = await descRes.json();

        translations[i18n.language] = {
           name: formData.name,
           description: formData.description
        };

        targetLangs.forEach(lang => {
          translations[lang] = {
            name: nameTrans[lang] || formData.name,
            description: descTrans[lang] || formData.description
          };
        });
      } catch (err) {
        console.error("Auto-translation failed:", err);
      }

      const tiers = wholesaleTiers
        .filter(t => t.minQuantity && t.price)
        .map(t => ({
          minQuantity: parseInt(t.minQuantity),
          price: parseFloat(t.price)
        }));

      await addDoc(collection(db, 'products'), {
        storeId,
        sellerId: user.uid,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        country: store.country || 'MZ',
        currency: store.currency || 'MZN',
        category: formData.category,
        stock: parseInt(formData.stock),
        minOrderQuantity: parseInt(formData.minOrderQuantity),
        wholesalePrices: tiers.length > 0 ? tiers : null,
        colors: formData.colors.split(',').map(c => c.trim()).filter(c => c !== ''),
        sizes: formData.sizes.split(',').map(s => s.trim()).filter(s => s !== ''),
        images: formData.images.filter(img => img.trim() !== ''),
        deliveryAvailable: formData.deliveryAvailable,
        status: 'active',
        rating: 0,
        reviewCount: 0,
        createdAt: new Date().toISOString(),
        translations
      });

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2563eb', '#3b82f6', '#60a5fa']
      });

      onClose();
      setFormData({
        name: '',
        description: '',
        price: '',
        category: '',
        stock: '',
        minOrderQuantity: '1',
        images: [''],
        deliveryAvailable: true,
        colors: '',
        sizes: ''
      });
      setWholesaleTiers([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
    } finally {
      setLoading(false);
    }
  };

  const addImageField = () => {
    setFormData({ ...formData, images: [...formData.images, ''] });
  };

  const removeImageField = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: newImages.length ? newImages : [''] });
  };

  const updateImageField = (index: number, value: string) => {
    const newImages = [...formData.images];
    newImages[index] = value;
    setFormData({ ...formData, images: newImages });
    if (value.startsWith('http')) {
      moderateImage(index, value);
    }
  };

  const moderateImage = async (index: number, url: string) => {
    setModerating(index);
    setModerationErrors(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });

    try {
      const res = await fetch('/api/ai/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url, productName: formData.name })
      });
      const data = await res.json();
      if (!data.safe) {
        setModerationErrors(prev => ({ ...prev, [index]: data.reason }));
      }
    } catch (err) {
      console.error("Moderation check failed:", err);
    } finally {
      setModerating(null);
    }
  };

  const searchImages = async () => {
    if (!formData.name) return;
    setSearchingImages(true);
    setShowSuggestions(true);
    try {
      const res = await fetch('/api/ai/search-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: formData.name, category: formData.category })
      });
      const data = await res.json();
      setImageSuggestions(data.images || []);
    } catch (err) {
      console.error("Image search failed:", err);
    } finally {
      setSearchingImages(false);
    }
  };

  const selectSuggestion = async (url: string) => {
    const emptyIndex = formData.images.findIndex(img => img === '');
    const newImages = [...formData.images];
    const index = emptyIndex !== -1 ? emptyIndex : newImages.length;
    
    if (emptyIndex !== -1) {
      newImages[emptyIndex] = url;
    } else {
      newImages.push(url);
    }
    
    setFormData({ ...formData, images: newImages });
    moderateImage(index, url);
  };

  const handleCropComplete = async (croppedDataUrl: string) => {
    if (croppingIndex === null) return;
    
    setLoading(true);
    try {
      const storage = getStorage();
      const filename = `products/${user?.uid}/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      
      await uploadString(storageRef, croppedDataUrl, 'data_url');
      const downloadUrl = await getDownloadURL(storageRef);
      
      const newImages = [...formData.images];
      newImages[croppingIndex] = downloadUrl;
      setFormData({ ...formData, images: newImages });
      moderateImage(croppingIndex, downloadUrl);
    } catch (err) {
      console.error("Upload failed:", err);
      // Fallback to data URL if upload fails (though not ideal for storage)
      const newImages = [...formData.images];
      newImages[croppingIndex] = croppedDataUrl;
      setFormData({ ...formData, images: newImages });
    } finally {
      setLoading(false);
      setCroppingIndex(null);
    }
  };

  const suggestDescription = async () => {
    if (!formData.name) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/suggest-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productName: formData.name, 
          category: formData.category,
        })
      });
      const data = await res.json();
      if (data.description) {
        setFormData({ ...formData, description: data.description });
      }
    } catch (err) {
      console.error("AI Suggestion failed:", err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto scrollbar-hide"
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                    <Package className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 italic">{t('seller.new_product')}</h2>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <div className="flex items-center justify-between ml-4 mr-2">
                         <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Product Name</label>
                         <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                           <Wand2 className="w-2.5 h-2.5" /> Auto-translating enabled
                         </span>
                       </div>
                      <input 
                        type="text" 
                        required
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                        placeholder="Ex: iPhone 15 Pro"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">Category</label>
                      <select 
                        required
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        <option value="">Select Category</option>
                        {CATEGORIES.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">Colors (Comma separated)</label>
                        <input 
                          type="text" 
                          className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                          placeholder="Red, Blue, Green"
                          value={formData.colors}
                          onChange={(e) => setFormData({ ...formData, colors: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">Sizes (Comma separated)</label>
                        <input 
                          type="text" 
                          className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                          placeholder="S, M, L, XL"
                          value={formData.sizes}
                          onChange={(e) => setFormData({ ...formData, sizes: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">Price ({store.currency || 'MZN'})</label>
                        <input 
                          type="number" 
                          required
                          className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                          placeholder="0.00"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">In Stock</label>
                        <input 
                          type="number" 
                          required
                          className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                          placeholder="0"
                          value={formData.stock}
                          onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between ml-4">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Wholesale & MOQ</label>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-4">Min Order Quantity (MOQ)</label>
                        <input 
                          type="number" 
                          required
                          min="1"
                          className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                          value={formData.minOrderQuantity}
                          onChange={(e) => setFormData({ ...formData, minOrderQuantity: e.target.value })}
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between ml-4">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Bulk Pricing Tiers</label>
                          <button 
                            type="button"
                            onClick={addTier}
                            className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add Tier
                          </button>
                        </div>
                        
                        {wholesaleTiers.map((tier, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <div className="flex-1">
                              <input 
                                type="number" 
                                placeholder="Min Qty"
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-xs font-bold"
                                value={tier.minQuantity}
                                onChange={(e) => updateTier(i, 'minQuantity', e.target.value)}
                              />
                            </div>
                            <div className="flex-1">
                              <input 
                                type="number" 
                                placeholder={`Price (${store.currency || 'MZN'})`}
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-xs font-bold"
                                value={tier.price}
                                onChange={(e) => updateTier(i, 'price', e.target.value)}
                              />
                            </div>
                            <button 
                              type="button" 
                              onClick={() => removeTier(i)}
                              className="p-2 text-red-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                       <div className="flex items-center justify-between ml-4 mr-2">
                          <label className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('seller.product_images')}</label>
                          <button 
                            type="button"
                            onClick={searchImages}
                            disabled={!formData.name || searchingImages}
                            className="text-[10px] text-blue-600 font-black flex items-center gap-1 hover:underline disabled:opacity-50"
                          >
                            {searchingImages ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                            {t('seller.auto_search_images')}
                          </button>
                       </div>

                      <div className="space-y-3">
                        {formData.images.map((img, i) => (
                          <div key={i} className="space-y-2">
                            <div className={cn(
                              "relative group p-4 bg-gray-50 rounded-2xl border-2 transition-all",
                              moderationErrors[i] ? "border-red-200 bg-red-50" : "border-transparent group-hover:border-gray-200"
                            )}>
                              <div className="flex gap-3">
                                <div className="w-16 h-16 bg-white rounded-xl border border-gray-100 overflow-hidden flex-shrink-0 relative">
                                  {img ? (
                                    <img src={img} className="w-full h-full object-cover" alt="" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                      <Camera className="w-6 h-6" />
                                    </div>
                                  )}
                                  {moderating === i && (
                                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <input 
                                    type="url" 
                                    className="w-full bg-transparent border-none p-0 focus:ring-0 text-xs font-bold text-gray-900 placeholder-gray-400"
                                    placeholder="Paste image URL..."
                                    value={img}
                                    onChange={(e) => updateImageField(i, e.target.value)}
                                  />
                                  <div className="flex items-center gap-3 mt-2">
                                     {img && (
                                       <button 
                                         type="button"
                                         onClick={() => setCroppingIndex(i)}
                                         className="text-[10px] font-black text-blue-600 flex items-center gap-1 uppercase tracking-widest hover:underline"
                                       >
                                         <Crop className="w-3 h-3" /> {t('seller.edit_crop')}
                                       </button>
                                     )}
                                     {formData.images.length > 1 && (
                                       <button 
                                         type="button"
                                         onClick={() => removeImageField(i)}
                                         className="text-[10px] font-black text-red-500 flex items-center gap-1 uppercase tracking-widest hover:underline"
                                       >
                                         <Trash2 className="w-3 h-3" /> Remove
                                       </button>
                                     )}
                                  </div>
                                </div>
                              </div>
                              {moderationErrors[i] && (
                                <div className="mt-2 flex items-start gap-2 text-[10px] text-red-600 font-bold bg-white p-2 rounded-lg border border-red-100">
                                  <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                  {moderationErrors[i]}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        <button 
                          type="button"
                          onClick={addImageField}
                          className="w-full py-4 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 hover:border-blue-100 hover:text-blue-500 transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" /> {t('seller.add_manual')}
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {showSuggestions && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-blue-50/50 rounded-[32px] p-6 border border-blue-50"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest flex items-center gap-2">
                              {searchingImages ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                              {t('seller.ai_image_suggestions')}
                            </p>
                            <button onClick={() => setShowSuggestions(false)} className="text-blue-400 hover:text-blue-600"><X className="w-4 h-4" /></button>
                          </div>
                          
                          {searchingImages ? (
                             <div className="grid grid-cols-3 gap-2">
                                {[1, 2, 3].map(i => <div key={i} className="aspect-square bg-blue-100/50 animate-pulse rounded-xl" />)}
                             </div>
                          ) : (
                            <div className="grid grid-cols-3 gap-2">
                              {imageSuggestions.map((s: any) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => selectSuggestion(s.url)}
                                  className="aspect-square rounded-xl overflow-hidden group relative"
                                >
                                  <img src={s.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="" />
                                  <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                     <Plus className="w-6 h-6 text-white" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-4 mr-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Description</label>
                    <button 
                      type="button"
                      onClick={suggestDescription}
                      disabled={generating || !formData.name}
                      className="text-[10px] text-blue-600 font-bold flex items-center gap-1 hover:underline disabled:opacity-50"
                    >
                      {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {generating ? 'Generating...' : 'Suggest with AI'}
                    </button>
                  </div>
                  <textarea 
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium resize-none h-32"
                    placeholder="Tell customers about your product..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="bg-blue-50/50 p-6 rounded-[32px] border border-blue-50 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900">Immediate Delivery</p>
                    <p className="text-xs text-gray-500">Enable if this item is ready for same-day delivery.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, deliveryAvailable: !formData.deliveryAvailable })}
                    className={`w-14 h-8 rounded-full relative transition-colors ${formData.deliveryAvailable ? 'bg-blue-600' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${formData.deliveryAvailable ? 'left-7' : 'left-1'}`}></div>
                  </button>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 italic"
                >
                  {loading ? 'Adding Product...' : 'Publish Product Listing'}
                  <ArrowRight className="w-6 h-6" />
                </button>
              </form>
            </div>
          </motion.div>
          {croppingIndex !== null && (
            <ImageCropper 
              image={formData.images[croppingIndex]}
              onCancel={() => setCroppingIndex(null)}
              onCropComplete={handleCropComplete}
            />
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
