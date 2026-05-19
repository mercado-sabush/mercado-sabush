import React, { useState, useEffect } from 'react';
import { db, storage } from '../lib/firebase';
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  LayoutDashboard, Package, ShoppingCart, Settings, Plus, Star, 
  TrendingUp, Users, ArrowRight, Trash2, Edit, Store as StoreIcon,
  CheckCircle, Clock, AlertTriangle, ChevronRight, Upload, Loader2,
  LogOut, MapPin
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { AddProductModal } from '../components/modals/AddProductModal';
import { Product, Store, Order } from '../types';
import { handleFirestoreError, OperationType, parseFirestoreError } from '../lib/firebaseErrors';
import { useTranslation } from 'react-i18next';
import { getTranslatedField } from '../lib/i18nUtils';
import { CATEGORIES } from '../constants';
import { Skeleton, StoreSkeleton } from '../components/common/Skeleton';
import { useNavigate } from '../components/common/RouteLink';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';

export function SellerDashboard() {
  const { t } = useTranslation();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { location: appLocation, requestLocation } = useLocation();
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'rfqs' | 'settings'>('overview');
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [locating, setLocating] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    whatsappNumber: '',
    description: '',
    location: '',
    latitude: null as number | null,
    longitude: null as number | null
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (store) {
      setSettingsForm({
        whatsappNumber: store.whatsappNumber || '',
        description: store.description || '',
        location: store.location || '',
        latitude: store.latitude || null,
        longitude: store.longitude || null
      });
    }
  }, [store]);

  const handleUseCurrentLocation = async () => {
    setLocating(true);
    try {
      await requestLocation();
      if (appLocation) {
        setSettingsForm(prev => ({
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

  const handleSaveSettings = async () => {
    if (!store) return;
    setSavingSettings(true);
    try {
      await updateDoc(doc(db, 'stores', store.id), {
        whatsappNumber: settingsForm.whatsappNumber,
        description: settingsForm.description,
        location: settingsForm.location,
        latitude: settingsForm.latitude,
        longitude: settingsForm.longitude
      });
      alert('Settings saved successfully!');
    } catch (error) {
      alert(parseFirestoreError(error));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !store) return;

    setUploadingLogo(true);
    try {
      const storageRef = ref(storage, `stores/${user.uid}/logo_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      await updateDoc(doc(db, 'stores', store.id), {
        logo: downloadURL
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo. Please try again.');
    } finally {
      setUploadingLogo(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Listen to Store
    const storeQuery = query(collection(db, 'stores'), where('ownerId', '==', user.uid));
    const unsubscribeStore = onSnapshot(storeQuery, (snapshot) => {
      if (!snapshot.empty) {
        setStore({ ...snapshot.docs[0].data(), id: snapshot.docs[0].id } as Store);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'stores'));

    // Listen to Products
    const productsQuery = query(collection(db, 'products'), where('sellerId', '==', user.uid));
    const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Product[]);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    // Listen to Orders
    const ordersQuery = query(collection(db, 'orders'), where('storeId', '==', `store_${user.uid}`));
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Order[]);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders'));

    // Listen to RFQs
    const rfqsQuery = query(collection(db, 'rfqs'), where('storeId', '==', `store_${user.uid}`));
    const unsubscribeRfqs = onSnapshot(rfqsQuery, (snapshot) => {
      setRfqs(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'rfqs'));

    return () => {
      unsubscribeStore();
      unsubscribeProducts();
      unsubscribeOrders();
      unsubscribeRfqs();
    };
  }, [user]);

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
  const totalEarnings = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const stats = [
    { label: t('seller.total_earnings', 'Total Earnings'), value: `${formatCurrency(totalEarnings, store?.currency).split(',')[0]} ${store?.currency || 'MZN'}`, icon: TrendingUp, color: 'blue' },
    { label: t('seller.orders', 'Active Orders'), value: activeOrders.length.toString(), icon: ShoppingCart, color: 'orange' },
    { label: t('seller.products', 'Total Products'), value: products.length.toString(), icon: Package, color: 'green' },
    { label: t('seller.rating', 'Store Rating'), value: store?.rating.toString() || '0', icon: Star, color: 'purple' }
  ];

  const salesData = orders.reduce((acc: any[], order) => {
    const date = new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing.sales += order.totalAmount;
      existing.orders += 1;
    } else {
      acc.push({ date, sales: order.totalAmount, orders: 1 });
    }
    return acc;
  }, []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-14);

  const productPerformanceData = orders.reduce((acc: any[], order) => {
    order.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      const productName = product ? getTranslatedField(product, 'name', product.name) : item.name || 'Unknown Product';
      const existing = acc.find(p => p.name === productName);
      if (existing) {
        existing.sales += item.price * item.quantity;
        existing.quantity += item.quantity;
      } else {
        acc.push({ 
          name: productName, 
          sales: item.price * item.quantity, 
          quantity: item.quantity 
        });
      }
    });
    return acc;
  }, []).sort((a, b) => b.sales - a.sales).slice(0, 5);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-12">
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-14 w-48 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[1, 2, 3, 4].map(i => <StoreSkeleton key={i} />)}
        </div>
        <div className="bg-white rounded-[40px] h-96 border border-gray-100 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
      {/* Sidebar */}
      <aside className="md:w-64 space-y-2">
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 mb-6 shadow-sm">
           <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl mb-4 mx-auto overflow-hidden">
             {store?.logo ? <img src={store.logo} alt="" className="w-full h-full object-cover" /> : store?.businessName[0]}
           </div>
           <h3 className="font-bold text-gray-900 text-center line-clamp-1">{store?.businessName || 'My Store'}</h3>
           <div className="flex items-center justify-center gap-1.5 mt-1">
             {store?.isVerified ? (
               <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest flex items-center gap-1">
                 <CheckCircle className="w-3 h-3" /> Verified
               </p>
             ) : (
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">Pending Verification</p>
             )}
           </div>
        </div>

        {[
          { id: 'overview', label: t('seller.overview'), icon: LayoutDashboard },
          { id: 'products', label: t('seller.products'), icon: Package },
          { id: 'orders', label: t('seller.orders'), icon: ShoppingCart },
          { id: 'rfqs', label: 'RFQs', icon: CheckCircle },
          { id: 'settings', label: t('seller.settings'), icon: Settings }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={cn(
              "w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
              activeTab === item.id ? "bg-blue-600 text-white shadow-xl shadow-blue-100" : "text-gray-400 hover:bg-white hover:text-blue-600"
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        ))}

        <button
          onClick={async () => { await signOut(); navigate('/login'); }}
          className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all text-gray-400 hover:bg-red-50 hover:text-red-600 mt-8"
        >
          <LogOut className="w-4 h-4" />
          {t('nav.logout')}
        </button>
      </aside>

      {/* Content */}
      <main className="flex-1 space-y-8">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-black text-gray-900 italic tracking-tight">{t('seller.overview', 'Store Overview')}</h1>
                  <p className="text-gray-400 font-medium text-sm mt-1">{t('seller.overview_desc', 'Performance and quick actions.')}</p>
                </div>
                <div className="hidden sm:block text-right">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Last updated</p>
                   <p className="text-xs font-bold text-gray-900">{new Date().toLocaleTimeString()}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm transition-all hover:shadow-md group">
                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${
                       stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                       stat.color === 'orange' ? 'bg-orange-50 text-orange-600' :
                       stat.color === 'green' ? 'bg-green-50 text-green-600' :
                       'bg-purple-50 text-purple-600'
                     }`}>
                        <stat.icon className="w-6 h-6" />
                     </div>
                     <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                     <p className="text-xl font-black text-gray-900 tracking-tight">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sales Performance Chart */}
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-black text-gray-900 italic">Sales Performance</h3>
                      <p className="text-xs text-gray-500 font-medium tracking-tight">Revenue trends for the last 14 days.</p>
                    </div>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesData}>
                        <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                          tickFormatter={(val) => `${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                          itemStyle={{ fontWeight: 800, color: '#1e293b' }}
                          labelStyle={{ color: '#94a3b8', fontWeight: 600, fontSize: '10px', marginBottom: '4px' }}
                        />
                        <Area type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Product Performance Chart */}
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-black text-gray-900 italic">Top Products</h3>
                      <p className="text-xs text-gray-500 font-medium tracking-tight">Best performing products by revenue.</p>
                    </div>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={productPerformanceData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis 
                          type="number"
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                        />
                        <YAxis 
                          dataKey="name" 
                          type="category"
                          axisLine={false} 
                          tickLine={false} 
                          width={100}
                          tick={{ fontSize: 10, fontWeight: 700, fill: '#1e293b' }}
                        />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                          itemStyle={{ fontWeight: 800, color: '#1e293b' }}
                        />
                        <Bar 
                          dataKey="sales" 
                          fill="#2563eb" 
                          radius={[0, 8, 8, 0]}
                          barSize={20}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="font-black text-gray-900 text-xl italic">Recent Orders</h3>
                      <button onClick={() => setActiveTab('orders')} className="text-blue-600 font-black text-[10px] uppercase tracking-widest hover:translate-x-1 transition-all flex items-center gap-1">
                        View All <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      {orders.length > 0 ? orders.slice(0, 3).map((order) => (
                         <div key={order.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-3xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/10 transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-blue-600 border border-gray-100">
                                {order.customerId.slice(-2).toUpperCase()}
                              </div>
                              <div>
                                 <p className="font-black text-gray-900">#ORD-{order.id.slice(-6).toUpperCase()}</p>
                                 <p className="text-[10px] text-gray-400 font-bold">{new Date(order.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="text-right">
                               <p className="font-black text-gray-900">{formatCurrency(order.totalAmount, store?.currency)}</p>
                               <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                 order.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                                 order.status === 'delivered' ? 'bg-green-100 text-green-600' :
                                 'bg-blue-100 text-blue-600'
                               }`}>
                                 {order.status}
                               </span>
                            </div>
                         </div>
                      )) : (
                        <div className="py-12 text-center text-gray-300">
                          <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-20" />
                          <p className="font-bold text-sm">No orders yet</p>
                        </div>
                      )}
                    </div>
                 </div>

                 <div className="bg-gray-900 p-8 rounded-[40px] text-white overflow-hidden relative shadow-2xl">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><TrendingUp className="w-24 h-24 stroke-[4]" /></div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Live Insights</p>
                      </div>
                      <h3 className="text-3xl font-black mb-4 italic tracking-tight italic">Global Reach</h3>
                      <p className="text-gray-400 mb-8 font-medium">Your store is now visible to customers across Mozambique. Keep your stock updated to stay relevant.</p>
                      
                      <div className="flex items-end gap-2 h-24 mb-6">
                         {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                           <div key={i} className="flex-1 bg-blue-600 rounded-t-lg transition-all hover:bg-blue-400 cursor-pointer shadow-lg shadow-blue-900/50" style={{ height: `${h}%` }}></div>
                         ))}
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em]">
                         <span>MON</span>
                         <span className="text-blue-500">TODAY</span>
                         <span>SUN</span>
                      </div>
                    </div>
                 </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'products' && (
            <motion.div 
              key="products"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-black text-gray-900 italic tracking-tight">Product Catalog</h1>
                    <p className="text-gray-400 font-medium text-sm mt-1">Manage your storefront listings.</p>
                  </div>
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-8 py-4 bg-blue-600 text-white rounded-[24px] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all italic"
                  >
                     <Plus className="w-5 h-5" /> New Product
                  </button>
               </div>

               <div className="bg-white rounded-[40px] border border-gray-100 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead className="bg-gray-50/50">
                          <tr>
                             <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product</th>
                             <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Price</th>
                             <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock</th>
                             <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50">
                          {products.length > 0 ? products.map(prod => (
                             <tr key={prod.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-8 py-6">
                                   <div className="flex items-center gap-4">
                                      <div className="w-14 h-14 bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 flex-shrink-0">
                                        <img src={prod.images[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
                                      </div>
                                      <div>
                                        <span className="font-black text-gray-900 block">{getTranslatedField(prod, 'name', prod.name)}</span>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                          {CATEGORIES.find(c => c.id === prod.category)?.translationKey ? t(CATEGORIES.find(c => c.id === prod.category)!.translationKey!) : prod.category}
                                        </span>
                                      </div>
                                   </div>
                                </td>
                                <td className="px-8 py-6">
                                  <p className="font-black text-gray-900">{formatCurrency(prod.price, store?.currency)}</p>
                                </td>
                                <td className="px-8 py-6">
                                   <span className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest", prod.stock < 5 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600")}>
                                      {prod.stock} <span className="opacity-60 ml-1">in stock</span>
                                   </span>
                                </td>
                                <td className="px-8 py-6 text-right space-x-2 whitespace-nowrap">
                                   <button className="p-3 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm"><Edit className="w-5 h-5" /></button>
                                   <button onClick={() => handleDeleteProduct(prod.id)} className="p-3 bg-gray-50 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm"><Trash2 className="w-5 h-5" /></button>
                                </td>
                             </tr>
                          )) : (
                            <tr>
                              <td colSpan={4} className="py-20 text-center">
                                <Package className="w-16 h-16 text-gray-100 mx-auto mb-4" />
                                <p className="font-black text-gray-300 italic uppercase tracking-widest">Your catalog is empty</p>
                              </td>
                            </tr>
                          )}
                       </tbody>
                    </table>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'orders' && (
            <motion.div 
              key="orders"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <h1 className="text-3xl font-black text-gray-900 italic tracking-tight">Order Management</h1>
              <div className="bg-white rounded-[40px] border border-gray-100 overflow-hidden shadow-sm">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead className="bg-gray-50/50">
                          <tr>
                             <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Order ID</th>
                             <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                             <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Items</th>
                             <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                             <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50">
                          {orders.length > 0 ? orders.map(order => (
                             <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-8 py-6">
                                   <p className="font-mono text-[10px] font-bold text-gray-400 uppercase tracking-widest">#{order.id.slice(-8).toUpperCase()}</p>
                                </td>
                                <td className="px-8 py-6">
                                   <p className="font-bold text-gray-900">{order.customerId.slice(-6).toUpperCase()}</p>
                                </td>
                                <td className="px-8 py-6">
                                   <p className="text-xs font-bold text-gray-500">{order.items.length} unique items</p>
                                </td>
                                <td className="px-8 py-6">
                                   <p className="font-black text-gray-900">{formatCurrency(order.totalAmount, store?.currency)}</p>
                                </td>
                                <td className="px-8 py-5">
                                   <select 
                                     value={order.status}
                                     onChange={async (e) => {
                                        try {
                                          await updateDoc(doc(db, 'orders', order.id), { status: e.target.value });
                                        } catch (err) {
                                          alert(parseFirestoreError(err));
                                        }
                                     }}
                                     className={cn(
                                       "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border-none outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all",
                                       order.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                                       order.status === 'delivered' ? 'bg-green-100 text-green-600' :
                                       'bg-blue-100 text-blue-600'
                                     )}
                                   >
                                      <option value="pending">Pending</option>
                                      <option value="confirmed">Confirmed</option>
                                      <option value="processing">Processing</option>
                                      <option value="shipped">Shipped</option>
                                      <option value="delivered">Delivered</option>
                                      <option value="cancelled">Cancelled</option>
                                   </select>
                                </td>
                             </tr>
                          )) : (
                            <tr>
                              <td colSpan={5} className="py-20 text-center">
                                <ShoppingCart className="w-16 h-16 text-gray-100 mx-auto mb-4" />
                                <p className="font-black text-gray-300 italic uppercase tracking-widest">No orders recorded</p>
                              </td>
                            </tr>
                          )}
                       </tbody>
                    </table>
                  </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'rfqs' && (
            <motion.div 
              key="rfqs"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
               <h1 className="text-3xl font-black text-gray-900 italic tracking-tight">{t('b2b.quotation_requests')}</h1>
               <div className="bg-white rounded-[40px] border border-gray-100 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead className="bg-gray-50/50">
                          <tr>
                             <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Inquiry Date</th>
                             <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product</th>
                             <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Quantity</th>
                             <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                             <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50">
                          {rfqs.length > 0 ? rfqs.map(rfq => (
                             <tr key={rfq.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-8 py-6">
                                   <p className="text-xs font-bold text-gray-500">{new Date(rfq.createdAt).toLocaleDateString()}</p>
                                </td>
                                <td className="px-8 py-6">
                                   <p className="font-bold text-gray-900 uppercase tracking-tighter italic">{rfq.productName}</p>
                                </td>
                                <td className="px-8 py-6">
                                   <p className="font-black text-gray-900">{rfq.quantity} units</p>
                                </td>
                                <td className="px-8 py-6">
                                   <span className={cn(
                                     "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest leading-none",
                                     rfq.status === 'pending' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                                   )}>
                                      {rfq.status}
                                   </span>
                                </td>
                                <td className="px-8 py-6 text-right space-x-2">
                                   <button 
                                     onClick={async () => {
                                        try {
                                          await updateDoc(doc(db, 'rfqs', rfq.id), { status: 'responded' });
                                        } catch (err) {
                                          console.error(err);
                                        }
                                     }}
                                     className="p-3 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2 ml-auto"
                                   >
                                      {t('b2b.respond')}
                                   </button>
                                </td>
                             </tr>
                          )) : (
                            <tr>
                              <td colSpan={5} className="py-20 text-center">
                                <Clock className="w-16 h-16 text-gray-100 mx-auto mb-4" />
                                <p className="font-black text-gray-300 italic uppercase tracking-widest">No quote requests yet</p>
                              </td>
                            </tr>
                          )}
                       </tbody>
                    </table>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
               <h1 className="text-3xl font-black text-gray-900 italic tracking-tight">Store Settings</h1>
               <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm max-w-2xl">
                  <div className="space-y-8">
                     <div className="flex flex-col sm:flex-row items-center gap-8 pb-8 border-b border-gray-50">
                        <div className="w-32 h-32 bg-gray-100 rounded-[32px] flex-shrink-0 relative overflow-hidden group">
                           {store?.logo ? <img src={store.logo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-4xl text-gray-300 bg-gray-50">{store?.businessName[0]}</div>}
                           <button 
                             onClick={() => fileInputRef.current?.click()}
                             disabled={uploadingLogo}
                             className={cn(
                               "absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center text-white font-bold text-xs",
                               uploadingLogo ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                             )}
                           >
                              {uploadingLogo ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                              ) : (
                                <Upload className="w-6 h-6" />
                              )}
                           </button>
                           <input 
                             type="file" 
                             ref={fileInputRef} 
                             className="hidden" 
                             accept="image/*"
                             onChange={handleLogoUpload}
                           />
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                           <h4 className="text-xl font-black text-gray-900 italic mb-2">{store?.businessName}</h4>
                           <p className="text-gray-400 font-medium text-sm mb-4">{t('seller.settings_desc', 'You can update your store identity and preferences here.')}</p>
                           <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                             {CATEGORIES.find(c => c.id === store?.category)?.translationKey ? t(CATEGORIES.find(c => c.id === store?.category)!.translationKey!) : store?.category}
                           </span>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="space-y-2">
                           <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">{t('seller.whatsapp_support')}</label>
                           <input 
                              type="text" 
                              className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                              value={settingsForm.whatsappNumber}
                              onChange={(e) => setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })}
                           />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between ml-4">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('seller.business_location', 'Business Location')}</label>
                            <button 
                              type="button"
                              onClick={handleUseCurrentLocation}
                              disabled={locating}
                              className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:underline disabled:opacity-50"
                            >
                              {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                              {settingsForm.latitude ? 'GPS Active' : 'Update GPS'}
                            </button>
                          </div>
                          <input 
                             type="text" 
                             className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                             value={settingsForm.location}
                             placeholder="Ex: Maputo, Bairro Central"
                             onChange={(e) => setSettingsForm({ ...settingsForm, location: e.target.value })}
                          />
                          {settingsForm.latitude && (
                            <p className="text-[9px] font-bold text-green-600 ml-4 flex items-center gap-1">
                              <CheckCircle className="w-2.5 h-2.5" /> GPS mapped for smart-routing support
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                           <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">{t('seller.business_description')}</label>
                           <textarea 
                              className="w-full px-6 py-4 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-blue-500 outline-none min-h-[120px] font-medium text-sm resize-none"
                              value={settingsForm.description}
                              onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                           />
                        </div>
                        <button 
                          onClick={handleSaveSettings}
                          disabled={savingSettings}
                          className="w-full py-5 bg-gray-900 text-white rounded-[24px] font-black hover:bg-black transition-all italic flex items-center justify-center gap-2 shadow-xl shadow-gray-200"
                        >
                          {savingSettings && <Loader2 className="w-5 h-5 animate-spin" />}
                          {savingSettings ? t('seller.saving') : t('seller.save_changes')}
                        </button>
                     </div>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {store && (
        <AddProductModal 
          isOpen={isAddModalOpen} 
          onClose={() => setIsAddModalOpen(false)}
          store={store}
        />
      )}
    </div>
  );
}
