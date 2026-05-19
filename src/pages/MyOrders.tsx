import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Order } from '../types';
import { handleFirestoreError, OperationType, parseFirestoreError } from '../lib/firebaseErrors';
import { ShoppingBag, Package, Truck, CheckCircle, Clock, XCircle, ChevronRight, MessageSquare } from 'lucide-react';
import { Link } from '../components/common/RouteLink';
import { formatCurrency, cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '../components/common/Skeleton';

export function MyOrders() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const q = query(
      collection(db, 'orders'),
      where('customerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Order[]);
      setLoading(false);
      setError(null);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'orders');
      setError(parseFirestoreError(err));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'confirmed': return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'processing': return <Package className="w-5 h-5 text-purple-500" />;
      case 'shipped': return <Truck className="w-5 h-5 text-blue-600" />;
      case 'delivered': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'cancelled': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-50 text-yellow-700';
      case 'confirmed': return 'bg-blue-50 text-blue-700';
      case 'processing': return 'bg-purple-50 text-purple-700';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-50 text-green-700';
      case 'cancelled': return 'bg-red-50 text-red-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48 w-full rounded-[40px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-black text-gray-900 italic tracking-tight">{t('orders.my_orders')}</h1>
          <p className="text-gray-500 mt-2 font-medium">{t('orders.track_purchases')}</p>
        </div>
        <div className="w-16 h-16 bg-blue-100 rounded-[24px] flex items-center justify-center text-blue-600">
           <ShoppingBag className="w-8 h-8" />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 p-6 rounded-[32px] mb-8 font-bold italic text-center">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden hover:shadow-xl transition-all group">
            <div className="p-8 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                 <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", getStatusColor(order.status).split(' ')[0])}>
                    {getStatusIcon(order.status)}
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('orders.order_id')}</p>
                    <p className="text-sm font-mono font-bold text-gray-900 group-hover:text-blue-600 transition-colors">#{order.id.slice(0, 12).toUpperCase()}</p>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                 <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('orders.status')}</p>
                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", getStatusColor(order.status))}>
                      {order.status}
                    </span>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('orders.total')}</p>
                    <p className="font-black text-gray-900 italic">{formatCurrency(order.totalAmount, order.currency)}</p>
                 </div>
              </div>
            </div>

            <div className="p-8">
               <div className="space-y-4 mb-8">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <img src={item.image} alt="" className="w-12 h-12 rounded-xl object-cover" />
                          <div>
                             <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                             <div className="flex items-center gap-2 mt-0.5">
                               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Qty: {item.quantity} • {formatCurrency(item.price, order.currency)}</p>
                               {item.selectedColor && (
                                 <span className="flex items-center gap-1.5 px-1.5 py-0.5 bg-gray-50 rounded text-[9px] font-bold text-gray-500 border border-gray-100">
                                   <div className="w-2 h-2 rounded-full border border-black/5" style={{ backgroundColor: item.selectedColor.toLowerCase() }} />
                                   {item.selectedColor}
                                 </span>
                               )}
                               {item.selectedSize && (
                                 <span className="px-1.5 py-0.5 bg-gray-50 rounded text-[9px] font-bold text-gray-500 border border-gray-100 uppercase">
                                   {item.selectedSize}
                                 </span>
                               )}
                             </div>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>

               <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-gray-400 font-medium italic">
                    Placed on {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                     <button className="flex-1 sm:flex-none px-6 py-3 bg-gray-50 text-gray-700 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center justify-center gap-2">
                        {t('orders.help_center')}
                     </button>
                  </div>
               </div>
            </div>
          </div>
        ))}

        {orders.length === 0 && (
          <div className="py-20 text-center bg-gray-50 rounded-[40px] border border-dashed border-gray-200">
             <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Package className="w-10 h-10 text-gray-200" />
             </div>
             <h3 className="text-2xl font-black text-gray-900 mb-2 italic">{t('orders.no_orders')}</h3>
             <p className="text-gray-500 font-medium mb-8 max-w-sm mx-auto">{t('orders.start_shopping_desc')}</p>
             <Link to="/marketplace" className="inline-flex items-center gap-2 px-10 py-4 bg-gray-900 text-white rounded-3xl font-black text-xs uppercase tracking-widest italic hover:bg-blue-600 transition-all">
                {t('orders.browse_marketplace')} <ChevronRight className="w-4 h-4" />
             </Link>
          </div>
        )}
      </div>
    </div>
  );
}
