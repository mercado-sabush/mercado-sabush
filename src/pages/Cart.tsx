import React, { useState } from 'react';
import { Trash2, Plus, Minus, ArrowLeft, ShoppingBag, MessageSquare, Truck, MapPin, Loader2, CreditCard, Smartphone } from 'lucide-react';
import { Link, useNavigate } from '../components/common/RouteLink';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { useNotifications } from '../context/NotificationContext';
import { formatCurrency, cn, getDistance } from '../lib/utils';
import { collection, query, where, getDocs, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType, parseFirestoreError } from '../lib/firebaseErrors';

export function Cart() {
  const { items, addToCart, removeFromCart, totalPrice, totalItems, clearCart } = useCart();
  const { user } = useAuth();
  const { location: userLocation, selectedCountry } = useLocation();
  const { profile } = useAuth();
  const { sendNotification } = useNotifications();
  const navigate = useNavigate();
  const [checkingOut, setCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'mpesa' | 'emola' | 'bank'>('cod');
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('delivery');
  const [deliveryAddress, setDeliveryAddress] = useState(profile?.location || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || '');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestName, setGuestName] = useState('');

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 bg-blue-50 text-blue-300 rounded-full flex items-center justify-center mb-8">
           <ShoppingBag className="w-12 h-12" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-4">Your cart is empty</h1>
        <p className="text-gray-500 mb-8 max-w-sm">Looks like you haven't added anything to your cart yet. Browse our products and find something great!</p>
        <Link to="/marketplace" className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
           Go to Marketplace
        </Link>
      </div>
    );
  }

  const handleCheckout = async () => {
    if (!user && (!guestEmail || !guestName)) {
      alert("Please sign in or provide your name and email for the order confirmation.");
      return;
    }

    setCheckingOut(true);

    try {
      // For each item, find all sellers who have it and route to the nearest one
      // In this MVP, we match by product name
      const routedItems = await Promise.all(items.map(async (item) => {
        const q = query(collection(db, 'products'), where('name', '==', item.name));
        const querySnapshot = await getDocs(q);
        
        let nearestStoreId = item.storeId; // Fallback to current
        let minDistance = Infinity;

        if (!querySnapshot.empty && userLocation) {
          // Fetch store locations for all matches
          const matches = querySnapshot.docs.map(doc => doc.data());
          for (const match of matches) {
            const storeSnap = await getDoc(doc(db, 'stores', match.storeId));
            if (storeSnap.exists()) {
              const storeData = storeSnap.data();
              if (storeData.latitude && storeData.longitude) {
                const dist = getDistance(
                  userLocation.latitude, 
                  userLocation.longitude, 
                  storeData.latitude, 
                  storeData.longitude
                );
                if (dist < minDistance) {
                  minDistance = dist;
                  nearestStoreId = match.storeId;
                }
              }
            }
          }
        }
        
        return {
          ...item,
          routedStoreId: nearestStoreId,
          distance: minDistance === Infinity ? null : minDistance
        };
      }));

      // Create orders for each group of routedStoreId
      const storesToNotify = [...new Set(routedItems.map(i => i.routedStoreId))];
      
      const orders = [];
      const orderPath = 'orders';
      for (const storeId of storesToNotify) {
        const storeItems = routedItems.filter(i => i.routedStoreId === storeId);
        try {
          const orderRef = await addDoc(collection(db, orderPath), {
            customerId: user?.uid || null,
            guestEmail: user ? null : guestEmail,
            guestName: user ? null : guestName,
            isGuest: !user,
            storeId,
            items: storeItems.map(item => ({
              productId: item.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              image: item.images[0],
              selectedColor: item.selectedColor,
              selectedSize: item.selectedSize
            })),
            totalAmount: storeItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0),
            status: 'pending',
            paymentMethod,
            paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending', // Will update after API call
            deliveryMethod,
            deliveryAddress: deliveryMethod === 'delivery' ? deliveryAddress : null,
            whatsappContacted: false,
            country: selectedCountry.code,
            currency: selectedCountry.currency,
            createdAt: new Date().toISOString(),
            customerLocation: userLocation || null
          });
          orders.push({ id: orderRef.id, storeId });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, orderPath);
        }
      }

      // If electronic payment selected, call simulated server side payment
      if (paymentMethod !== 'cod') {
        const methodMap = {
          mpesa: 'M-Pesa',
          emola: 'e-Mola',
          bank: 'Bank Transfer'
        };

        const response = await fetch('/api/payments/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: methodMap[paymentMethod as keyof typeof methodMap],
            phoneNumber: phoneNumber,
            amount: totalPrice * 1.17, // Include IVA in processing
            orderIds: orders.map(o => o.id),
            customerName: user?.displayName || guestName
          })
        });
        
        const result = await response.json();
        if (!response.ok || result.status === 'failed' || result.status === 'error') {
          throw new Error(result.message || `${paymentMethod} payment failed`);
        }

        // Update payment status in Firestore for all orders
        for (const order of orders) {
          await updateDoc(doc(db, 'orders', order.id), {
            paymentStatus: paymentMethod === 'bank' ? 'pending_confirmation' : 'paid',
            gatewayReference: result.gatewayReference,
            transactionId: result.transactionId
          });
        }

        // Notify user of successful initiation/payment
        await sendNotification(
          user?.uid || 'guest', 
          'Payment Initiated', 
          result.message || `Your payment via ${methodMap[paymentMethod as keyof typeof methodMap]} is being processed.`, 
          paymentMethod
        );
      }

      // Notify sellers (simulated by adding to notifications collection)
      for (const order of orders) {
        // Find seller UID
        const storeSnap = await getDoc(doc(db, 'stores', order.storeId));
        if (storeSnap.exists()) {
          const sellerId = storeSnap.data().ownerId;
          await sendNotification(
            sellerId,
            'New Order Received!',
            `A new order of ${formatCurrency(totalPrice)} is waiting for your confirmation.`,
            'order'
          );
        }
      }

      clearCart();
      navigate('/order-success');
    } catch (error: any) {
      console.error("Checkout error:", error);
      alert(parseFirestoreError(error));
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-black text-gray-900">Shopping Cart ({totalItems})</h1>
        {userLocation && (
          <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-full font-bold border border-blue-100 italic">
            <MapPin className="w-4 h-4" /> Routing optimized for your location
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white p-4 sm:p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-6 relative group">
              <div className="w-full sm:w-32 h-32 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
              </div>
              
              <div className="flex-1 flex flex-col justify-between py-1">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <Link to={`/product/${item.id}`}>
                      <h3 className="font-bold text-gray-900 text-lg hover:text-blue-600 transition-colors">{item.name}</h3>
                    </Link>
                    <button 
                      onClick={() => removeFromCart(item.id, item.selectedColor, item.selectedSize)}
                      className="text-gray-300 hover:text-red-500 transition-colors p-2"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-widest mb-1">{item.category}</p>
                  
                  {(item.selectedColor || item.selectedSize) && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {item.selectedColor && (
                        <span className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-md text-[10px] font-bold text-gray-600">
                          <div className="w-2.5 h-2.5 rounded-full border border-black/5" style={{ backgroundColor: item.selectedColor.toLowerCase() }} />
                          {item.selectedColor}
                        </span>
                      )}
                      {item.selectedSize && (
                        <span className="px-2 py-1 bg-gray-100 rounded-md text-[10px] font-bold text-gray-600">
                          {item.selectedSize}
                        </span>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-gray-400">Selected Store: <span className="text-gray-700 font-bold">Tech Hub Store</span></p>
                  {userLocation && (
                    <p className="text-[10px] text-green-600 font-bold uppercase mt-2 bg-green-50 inline-block px-2 py-1 rounded-md">
                      Smart-routing enabled: Closest seller will be notified
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4">
                   <p className="text-xl font-black text-gray-900 leading-none">
                     {formatCurrency(item.price, selectedCountry.currency).split(',')[0]} <span className="text-xs">{selectedCountry.currency}</span>
                   </p>
                    <div className="flex items-center bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                       <button 
                         onClick={() => removeFromCart(item.id, item.selectedColor, item.selectedSize)} 
                         className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600"
                       >
                         <Minus className="w-4 h-4" />
                       </button>
                       <span className="w-8 text-center font-bold text-gray-900">{item.quantity}</span>
                       <button 
                         onClick={() => addToCart(item, 1, item.selectedColor, item.selectedSize)}
                         className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600"
                       >
                         <Plus className="w-4 h-4" />
                       </button>
                    </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:w-full space-y-6">
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm sticky top-24">
            <h3 className="text-xl font-black text-gray-900 mb-8 tracking-tight uppercase">Order Summary</h3>
            
            {!user && (
              <div className="mb-8 p-6 bg-blue-50 rounded-3xl border border-blue-100">
                <p className="text-xs font-black text-blue-700 uppercase tracking-widest mb-4 italic">Sign in for better tracking</p>
                <Link to="/login?redirect=cart" className="block w-full py-3 bg-blue-600 text-white text-center rounded-xl font-bold text-xs mb-4 shadow-md">
                   Sign in / Register
                </Link>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-blue-100"></div></div>
                  <div className="relative flex justify-center text-[10px] font-black uppercase text-blue-400 bg-blue-50 px-2 tracking-widest">Or Guest Checkout</div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1">Your Name</label>
                    <input 
                      type="text" 
                      placeholder="Enter Full Name"
                      className="w-full px-4 py-3 bg-white border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1">Email for Confirmation</label>
                    <input 
                      type="email" 
                      placeholder="email@example.com"
                      className="w-full px-4 py-3 bg-white border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between text-gray-500">
                   <span className="font-medium text-sm">Subtotal (Excl. VAT)</span>
                   <span className="font-black text-gray-900">{formatCurrency(totalPrice)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-500">
                   <span className="font-medium text-sm">IVA (17%)</span>
                   <span className="font-black text-gray-900">{formatCurrency(totalPrice * 0.17)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-500">
                   <span className="font-medium text-sm">Delivery Fee</span>
                   <span className="font-bold text-green-600">{deliveryMethod === 'pickup' ? 'FREE' : 'Calculated at confirm'}</span>
                </div>
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                   <span className="text-lg font-bold text-gray-900">Total</span>
                   <span className="text-2xl font-black text-blue-600">{formatCurrency(totalPrice * 1.17)}</span>
                </div>
             </div>

            <div className="mb-8 p-6 bg-gray-50 rounded-3xl space-y-4">
              <h4 className="text-xs font-black text-gray-400 gap-2 flex items-center uppercase tracking-widest">
                <Truck className="w-3 h-3" /> Delivery Method
              </h4>
              <div className="flex p-1 bg-white rounded-2xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setDeliveryMethod('delivery')}
                  className={cn(
                    "flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all",
                    deliveryMethod === 'delivery' ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "text-gray-400"
                  )}
                >
                  Delivery
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMethod('pickup')}
                  className={cn(
                    "flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all",
                    deliveryMethod === 'pickup' ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "text-gray-400"
                  )}
                >
                  Pick-up
                </button>
              </div>

              {deliveryMethod === 'delivery' ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Delivery Address</label>
                  <textarea
                    placeholder="Enter your full street address, house number, and city..."
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium resize-none h-24 shadow-sm"
                  />
                </div>
              ) : (
                <div className="p-3 bg-blue-100/30 rounded-xl border border-blue-200/50">
                  <p className="text-[10px] text-blue-800 font-bold leading-tight">
                    You will need to go to the seller's physical shop location to pick up your items. Address will be shared after confirmation.
                  </p>
                </div>
              )}
            </div>

            <div className="mb-8">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Payment Method</h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                    paymentMethod === 'cod' ? "border-blue-600 bg-blue-50" : "border-gray-100 hover:border-gray-200"
                  )}
                >
                  <Truck className={cn("w-6 h-6", paymentMethod === 'cod' ? "text-blue-600" : "text-gray-400")} />
                  <span className={cn("text-[10px] font-black uppercase text-center", paymentMethod === 'cod' ? "text-blue-600" : "text-gray-400")}>Dinheiro (Cash on Delivery)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('bank')}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                    paymentMethod === 'bank' ? "border-indigo-600 bg-indigo-50" : "border-gray-100 hover:border-gray-200"
                  )}
                >
                  <CreditCard className={cn("w-6 h-6", paymentMethod === 'bank' ? "text-indigo-600" : "text-gray-400")} />
                  <span className={cn("text-[10px] font-black uppercase text-center", paymentMethod === 'bank' ? "text-indigo-600" : "text-gray-400")}>Banco / Transferência</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('mpesa')}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                    paymentMethod === 'mpesa' ? "border-red-600 bg-red-50" : "border-gray-100 hover:border-gray-200"
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-[10px] font-black italic">M</div>
                  <span className={cn("text-[10px] font-black uppercase", paymentMethod === 'mpesa' ? "text-red-600" : "text-gray-400")}>M-Pesa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('emola')}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                    paymentMethod === 'emola' ? "border-orange-600 bg-orange-50" : "border-gray-100 hover:border-gray-200"
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-[10px] font-black italic">e</div>
                  <span className={cn("text-[10px] font-black uppercase", paymentMethod === 'emola' ? "text-orange-600" : "text-gray-400")}>e-Mola</span>
                </button>
              </div>

              {(paymentMethod === 'mpesa' || paymentMethod === 'emola') && (
                <div className="mt-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Phone Number</label>
                  <input
                    type="tel"
                    placeholder={paymentMethod === 'emola' ? "86/87xxxxxxx" : "84xxxxxxx"}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className={cn(
                      "w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:bg-white transition-all text-sm font-bold",
                      paymentMethod === 'emola' ? "focus:ring-orange-500" : "focus:ring-red-500"
                    )}
                  />
                </div>
              )}

               {paymentMethod === 'bank' && (
                <div className="mt-4 bg-green-50 p-4 rounded-xl border border-green-100 space-y-2">
                  <p className="text-[10px] text-green-800 font-black uppercase tracking-tight">Dados Bancários - Pagamento Antecipado</p>
                  <div className="text-[10px] text-green-700 font-bold">
                    <p>Banco: Millennium bim / BCI / Standard Bank</p>
                    <p>NUIT da Empresa: (Enviado após pedido)</p>
                    <p>Anexe o comprovativo no Chat WhatsApp.</p>
                  </div>
                </div>
              )}

              {paymentMethod === 'mpesa' && (
                <div className="mt-4 bg-red-50 p-4 rounded-xl border border-red-100 space-y-2">
                  <p className="text-[10px] text-red-800 font-black uppercase tracking-tight">Instruções M-Pesa</p>
                  <p className="text-[10px] text-red-700 font-bold italic">
                    Irá receber o pedido de confirmação (PIN) no seu telemóvel.
                  </p>
                </div>
              )}
              
              {paymentMethod === 'emola' && (
                <div className="mt-4 bg-orange-50 p-4 rounded-xl border border-orange-100 space-y-2">
                  <p className="text-[10px] text-orange-800 font-black uppercase tracking-tight">Instruções e-Mola</p>
                  <p className="text-[10px] text-orange-700 font-bold italic">
                    Pagamento via rede Movitel. O processo de confirmação será enviado.
                  </p>
                </div>
              )}
            </div>

            <button 
              onClick={handleCheckout}
              disabled={checkingOut}
              className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 mb-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {checkingOut ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Placing Order...
                </>
              ) : (
                'Checkout Order'
              )}
            </button>
            <p className="text-[10px] text-gray-400 text-center font-bold uppercase tracking-widest">
              Secured Checkout by Mercado Sabush
            </p>

            <div className="mt-8 pt-8 border-t border-gray-100 space-y-4">
               <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Truck className="w-5 h-5 text-blue-500" />
                  <span>Free delivery on orders above {formatCurrency(50000, selectedCountry.currency)}</span>
               </div>
               <div className="flex items-center gap-3 text-sm text-gray-600">
                  <MessageSquare className="w-5 h-5 text-green-500" />
                  <span>Sellers will contact you via WhatsApp</span>
               </div>
               <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <p className="text-[11px] text-blue-800 font-bold leading-relaxed">
                    🚀 <strong>Smart-Routing:</strong> We automatically notify the seller physically closest to you to ensure lightning-fast delivery!
                  </p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
