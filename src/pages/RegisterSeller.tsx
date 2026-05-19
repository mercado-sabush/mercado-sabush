import React, { useState } from 'react';
import { Store, MapPin, Phone, MessageSquare, Truck, CheckCircle, ArrowRight, Briefcase, Loader2, ShieldCheck } from 'lucide-react';
import { useNavigate } from '../components/common/RouteLink';
import { useAuth } from '../context/AuthContext';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CATEGORIES, COUNTRIES, PROVINCES, PHONE_PREFIX } from '../constants';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useLocation as useAppLocation } from '../context/LocationContext';

export function RegisterSeller() {
  const { user, profile } = useAuth();
  const { location: appLocation, requestLocation, selectedCountry } = useAppLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    businessName: '',
    category: '',
    description: '',
    location: '',
    province: '',
    district: '',
    neighborhood: '',
    nuit: '',
    latitude: null as number | null,
    longitude: null as number | null,
    phone: '',
    whatsapp: '',
    deliveryOptions: 'both' as const,
    country: selectedCountry.code,
    currency: selectedCountry.currency
  });

  const handleUseCurrentLocation = async () => {
    setLocating(true);
    try {
      await requestLocation();
      if (appLocation) {
        setFormData(prev => ({
          ...prev,
          latitude: appLocation.latitude,
          longitude: appLocation.longitude,
          location: prev.location || `Lat: ${appLocation.latitude.toFixed(4)}, Lng: ${appLocation.longitude.toFixed(4)}`
        }));
      }
    } catch (err) {
      console.error("Location error:", err);
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login?redirect=register-seller');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const storeId = `store_${user.uid}`;
      await setDoc(doc(db, 'stores', storeId), {
        ownerId: user.uid,
        businessName: formData.businessName,
        category: formData.category,
        description: formData.description,
        location: formData.location,
        province: formData.province,
        district: formData.district,
        neighborhood: formData.neighborhood,
        nuit: formData.nuit,
        latitude: formData.latitude,
        longitude: formData.longitude,
        country: formData.country,
        currency: formData.currency,
        whatsappNumber: formData.whatsapp || formData.phone,
        deliveryOptions: formData.deliveryOptions,
        rating: 0,
        reviewCount: 0,
        isVerified: false,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // Update user role to seller and set country/currency
      await updateDoc(doc(db, 'users', user.uid), {
        role: 'seller',
        country: formData.country,
        currency: formData.currency
      });

      window.location.href = '/dashboard';
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to register store. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-3xl mx-auto flex items-center justify-center mb-6">
           <Store className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Become a Marketplace Seller</h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">Join thousands of businesses in Mozambique and start selling your products online today.</p>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-8 sm:p-12 rounded-[40px] border border-gray-100 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h3 className="font-black text-gray-900 text-xl flex items-center gap-2 mb-4">
            <Briefcase className="w-5 h-5 text-blue-600" /> Business Details
          </h3>
          
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">Business Name</label>
            <div className="relative">
              <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                required
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: Tech Hub Maputo"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">Business Category</label>
            <select 
              required
              className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="">Select a Category</option>
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">NUIT (Mozambican Tax Number)</label>
            <div className="relative">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                required
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: 123456789"
                value={formData.nuit}
                onChange={(e) => setFormData({ ...formData, nuit: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">Description</label>
            <textarea 
              className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none min-h-[120px]"
              placeholder="Tell us about your business..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            ></textarea>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="font-black text-gray-900 text-xl flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-blue-600" /> Contact & Logistics
          </h3>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between ml-4">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Business Location</label>
              <button 
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locating}
                className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:underline disabled:opacity-50"
              >
                {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                {formData.latitude ? 'Location Active' : 'Use Current Location'}
              </button>
            </div>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                required
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: Maputo, Bairro Central"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            {formData.latitude && (
               <p className="text-[10px] font-bold text-green-600 ml-4 flex items-center gap-1">
                 <CheckCircle className="w-3 h-3" /> GPS coordinates captured for smart-routing
               </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">Province</label>
            <select 
              required
              className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
              value={formData.province}
              onChange={(e) => setFormData({ ...formData, province: e.target.value })}
            >
              <option value="">Select Province</option>
              {PROVINCES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">District</label>
              <input 
                type="text" 
                required
                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: KaMpfumo"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">Neighborhood</label>
              <input 
                type="text" 
                required
                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: Polana"
                value={formData.neighborhood}
                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="tel" 
                required
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: +258 84 000 0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">Delivery Options</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'pickup', label: 'Pickup', icon: Store },
                { id: 'delivery', label: 'Delivery', icon: Truck },
                { id: 'both', label: 'Both', icon: CheckCircle }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, deliveryOptions: opt.id as any })}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-2",
                    formData.deliveryOptions === opt.id ? "border-blue-600 bg-blue-50 text-blue-600" : "border-gray-100 text-gray-400 hover:border-gray-200"
                  )}
                >
                  <opt.icon className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="md:col-span-2 pt-6">
           <button 
             type="submit" 
             disabled={loading}
             className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black text-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3"
           >
              {loading ? 'Creating Store...' : 'Launch My Store'}
              <ArrowRight className="w-6 h-6" />
           </button>
           <p className="text-center mt-6 text-xs text-gray-400 font-bold uppercase tracking-widest">
             By joining, you agree to Mercado Sabush Seller Terms & Conditions
           </p>
        </div>
      </form>
    </div>
  );
}
