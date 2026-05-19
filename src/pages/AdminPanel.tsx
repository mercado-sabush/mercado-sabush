import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, doc, updateDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { UserProfile, Store, Order } from '../types';
import { 
  Users, Shield, ShieldOff, Search, Filter, Ban, CheckCircle, 
  Store as StoreIcon, ShoppingBag, BarChart3, AlertTriangle,
  MoreVertical, Check, X, Eye, Flag, LogOut, Package, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType, parseFirestoreError } from '../lib/firebaseErrors';
import { formatCurrency } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from '../components/common/RouteLink';
import { useTranslation } from 'react-i18next';
import { COUNTRIES } from '../constants';

type AdminTab = 'overview' | 'users' | 'stores' | 'listings' | 'orders' | 'reports';

export function AdminPanel() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValue, setFilterValue] = useState<string>('all');

  const [reportsError, setReportsError] = useState(false);

  useEffect(() => {
    // Listen to Users
    const usersQ = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribeUsers = onSnapshot(usersQ, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data() })) as UserProfile[]);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    // Listen to Stores
    const storesQ = query(collection(db, 'stores'), orderBy('createdAt', 'desc'));
    const unsubscribeStores = onSnapshot(storesQ, (snapshot) => {
      setStores(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Store[]);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'stores'));

    // Listen to Orders
    const ordersQ = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(ordersQ, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Order[]);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders'));

    // Listen to Products
    const productsQ = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribeProducts = onSnapshot(productsQ, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    // Listen to Reports
    const reportsQ = query(collection(db, 'reports'));
    const unsubscribeReports = onSnapshot(reportsQ, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      setLoading(false);
      setReportsError(false);
    }, (error) => {
      console.error("Reports listener failed:", error);
      setLoading(false);
      setReportsError(true);
      // We don't throw here to avoid crashing the whole panel if one collection fails
    });

    return () => {
      unsubscribeUsers();
      unsubscribeStores();
      unsubscribeProducts();
      unsubscribeOrders();
      unsubscribeReports();
    };
  }, []);

  const handleToggleBan = async (userId: string, currentBanStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isBanned: !currentBanStatus });
    } catch (error) {
      alert(parseFirestoreError(error));
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to remove this listing?')) return;
    try {
      await updateDoc(doc(db, 'products', productId), { status: 'removed' });
    } catch (error) {
      alert(parseFirestoreError(error));
    }
  };

  const handleUpdateStoreStatus = async (storeId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'stores', storeId), { status });
    } catch (error) {
      alert(parseFirestoreError(error));
    }
  };

  const handleVerifyStore = async (storeId: string, isVerified: boolean) => {
    try {
      await updateDoc(doc(db, 'stores', storeId), { isVerified: !isVerified });
    } catch (error) {
      alert(parseFirestoreError(error));
    }
  };

  const handleUpdateReportStatus = async (reportId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status });
    } catch (error) {
      alert(parseFirestoreError(error));
    }
  };

  const filteredData = () => {
    switch (activeTab) {
      case 'users':
        return users.filter(u => 
          (u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
           u.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
          (filterValue === 'all' || u.role === filterValue)
        );
      case 'stores':
        return stores.filter(s => 
          (s.businessName.toLowerCase().includes(searchTerm.toLowerCase())) &&
          (filterValue === 'all' || s.status === filterValue)
        );
      case 'listings':
        return products.filter(p => 
          (p.name.toLowerCase().includes(searchTerm.toLowerCase())) &&
          (filterValue === 'all' || p.status === filterValue)
        );
      case 'orders':
        return orders.filter(o => 
          (o.id.toLowerCase().includes(searchTerm.toLowerCase()) || o.customerId.toLowerCase().includes(searchTerm.toLowerCase())) &&
          (filterValue === 'all' || o.status === filterValue)
        );
      case 'reports':
        return reports.filter(r => 
          (r.targetId.toLowerCase().includes(searchTerm.toLowerCase()) || r.reason.toLowerCase().includes(searchTerm.toLowerCase())) &&
          (filterValue === 'all' || r.status === filterValue)
        );
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3 italic">
            <Shield className="w-10 h-10 text-blue-600" /> Admin Command
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Platform governance and oversight dashboard.</p>
        </div>
        
        <div className="flex flex-col items-end gap-4">
          <button 
            onClick={async () => { await signOut(); navigate('/login'); }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-red-600 hover:border-red-100 transition-all shadow-sm group"
          >
            <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            {t('nav.logout')}
          </button>

          <div className="flex bg-gray-100 p-1 rounded-2xl overflow-x-auto whitespace-nowrap scrollbar-hide">
            {(['overview', 'users', 'stores', 'listings', 'orders', 'reports'] as AdminTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setFilterValue('all'); setSearchTerm(''); }}
              className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                activeTab === tab 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
    </div>

      {activeTab === 'overview' && (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8 lg:grid-cols-6">
          <StatCard icon={<Users />} label="Users" value={users.length} color="blue" />
          <StatCard icon={<StoreIcon />} label="Stores" value={stores.length} color="purple" />
          <StatCard icon={<Package />} label="Listings" value={products.length} color="green" />
          <StatCard icon={<ShoppingBag />} label="Orders" value={orders.length} color="orange" />
          <StatCard icon={<Flag />} label="Reports" value={reports.filter(r => r.status === 'pending').length} color="red" />
          <StatCard icon={<Ban />} label="Banned" value={users.filter(u => u.isBanned).length} color="gray" />
        </div>

          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm mb-8">
            <h3 className="text-xl font-black text-gray-900 mb-6 italic">Global Revenue Analytics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {COUNTRIES.map(country => {
                const countryRevenue = orders
                  .filter(o => o.status === 'delivered' && o.currency === country.currency)
                  .reduce((sum, o) => sum + o.totalAmount, 0);
                
                if (countryRevenue === 0 && orders.filter(o => o.country === country.code).length === 0) return null;

                return (
                  <div key={country.code} className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{country.flag}</span>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{country.name}</p>
                    </div>
                    <p className="text-xl font-black text-gray-900">{formatCurrency(countryRevenue, country.currency)}</p>
                    <p className="text-[10px] font-bold text-blue-600 mt-1 uppercase">Delivered Sales</p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {activeTab !== 'overview' && (
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text"
                placeholder={`Search ${activeTab}...`}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <select 
                className="bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-gray-700 outline-none"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
              >
                <option value="all">All {activeTab}</option>
                {activeTab === 'users' && (
                  <>
                    <option value="customer">Customers</option>
                    <option value="seller">Sellers</option>
                    <option value="admin">Admins</option>
                  </>
                )}
                {activeTab === 'stores' && (
                  <>
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </>
                )}
                {activeTab === 'listings' && (
                  <>
                    <option value="active">Active</option>
                    <option value="removed">Removed</option>
                  </>
                )}
                {activeTab === 'orders' && (
                  <>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </>
                )}
                {activeTab === 'reports' && (
                  <>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                    <option value="ignored">Ignored</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            {activeTab === 'reports' && reportsError ? (
              <div className="p-12 text-center text-red-500 bg-red-50 m-6 rounded-2xl border border-red-100 flex flex-col items-center gap-3">
                <AlertTriangle className="w-10 h-10" />
                <div>
                  <p className="font-black italic">Collection Access Failed</p>
                  <p className="text-sm font-medium opacity-80">You might not have enough permissions to view user reports. Our team will verify your admin status.</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-gray-50/50">
                  <tr>
                    {activeTab === 'users' && <UserTableHeaders />}
                    {activeTab === 'stores' && <StoreTableHeaders />}
                    {activeTab === 'listings' && <ListingTableHeaders />}
                    {activeTab === 'orders' && <OrderTableHeaders />}
                    {activeTab === 'reports' && <ReportTableHeaders />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <AnimatePresence mode="popLayout">
                    {filteredData().map((item: any) => (
                      <motion.tr 
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        key={item.uid || item.id} 
                        className="hover:bg-gray-50/30 transition-colors"
                      >
                        {activeTab === 'users' && <UserRow user={item} onToggleBan={handleToggleBan} />}
                        {activeTab === 'stores' && <StoreRow store={item} onUpdateStatus={handleUpdateStoreStatus} onToggleVerify={handleVerifyStore} />}
                        {activeTab === 'listings' && <ListingRow product={item} onDelete={handleDeleteProduct} />}
                        {activeTab === 'orders' && <OrderRow order={item} />}
                        {activeTab === 'reports' && <ReportRow report={item} onUpdateStatus={handleUpdateReportStatus} />}
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            )}
          </div>
          
          {filteredData().length === 0 && (
            <div className="p-20 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-[30px] flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-bold">No results found.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <RecentActivity title="Pending Verifications" 
            items={stores.filter(s => s.status === 'pending').slice(0, 5)} 
            renderItem={(s) => (
              <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                    <StoreIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{s.businessName}</p>
                    <p className="text-xs text-gray-500">{s.category}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('stores')}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50"
                >
                  Review
                </button>
              </div>
            )}
          />
          
          <RecentActivity title="Pending Reports" 
            items={reports.filter(r => r.status === 'pending').slice(0, 5)} 
            renderItem={(r) => (
              <div key={r.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl mb-3 border-l-4 border-red-500">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
                    <Flag className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{r.reason}</p>
                    <p className="text-xs text-gray-500">Target: {r.targetType} • {r.targetId.slice(10)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('reports')}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50"
                >
                  Investigate
                </button>
              </div>
            )}
          />
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: number, color: string }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
    gray: 'bg-gray-50 text-gray-600',
  };
  return (
    <div className="bg-white p-6 rounded-[30px] border border-gray-100 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colors[color as keyof typeof colors]}`}>
          {React.cloneElement(icon as any, { className: 'w-7 h-7' })}
        </div>
        <div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">{label}</p>
          <p className="text-3xl font-black text-gray-900 tracking-tighter">{value}</p>
        </div>
      </div>
    </div>
  );
}

function RecentActivity({ title, items, renderItem }: { title: string, items: any[], renderItem: (item: any) => React.ReactNode }) {
  return (
    <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
      <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2 italic">
        <BarChart3 className="w-6 h-6 text-blue-600" /> {title}
      </h2>
      <div className="min-h-[200px]">
        {items.length > 0 ? items.map(renderItem) : (
          <div className="flex flex-col items-center justify-center p-12 text-gray-300">
            <CheckCircle className="w-12 h-12 mb-2" />
            <p className="font-bold">All clear!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-700',
    active: 'bg-green-100 text-green-700',
    confirmed: 'bg-blue-100 text-blue-700',
    processing: 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    suspended: 'bg-red-100 text-red-700',
    resolved: 'bg-green-100 text-green-700',
    ignored: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

// Table Components
function UserTableHeaders() {
  return (
    <>
      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">User</th>
      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Role</th>
      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
      <th className="px-6 py-4 text-right text-xs font-black text-gray-400 uppercase tracking-widest">Actions</th>
    </>
  );
}

function UserRow({ user, onToggleBan }: { user: UserProfile, onToggleBan: (id: string, status: boolean) => void }) {
  return (
    <>
      <td className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden border border-gray-100">
            {user.photoURL ? <img src={user.photoURL} alt="" /> : <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 font-bold">{user.displayName[0]}</div>}
          </div>
          <div>
            <p className="font-bold text-gray-900">{user.displayName}</p>
            <p className="text-xs text-gray-500 font-medium">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
          user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
          user.role === 'seller' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {user.role}
        </span>
      </td>
      <td className="px-6 py-5">
        {user.isBanned ? (
          <span className="flex items-center gap-1.5 text-red-600 text-[10px] font-black uppercase tracking-widest">
            <ShieldOff className="w-4 h-4" /> Banned
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-green-600 text-[10px] font-black uppercase tracking-widest">
            <CheckCircle className="w-4 h-4" /> Active
          </span>
        )}
      </td>
      <td className="px-6 py-5 text-right">
        {user.role !== 'admin' && (
          <button 
            onClick={() => onToggleBan(user.uid, !!user.isBanned)}
            className={`p-2 rounded-xl transition-all ${user.isBanned ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}
          >
            {user.isBanned ? <CheckCircle className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
          </button>
        )}
      </td>
    </>
  );
}

function StoreTableHeaders() {
  return (
    <>
      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Store</th>
      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Verification</th>
      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
      <th className="px-6 py-4 text-right text-xs font-black text-gray-400 uppercase tracking-widest">Actions</th>
    </>
  );
}

function ListingTableHeaders() {
  return (
    <>
      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Product</th>
      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Store</th>
      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Price</th>
      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
      <th className="px-6 py-4 text-right text-xs font-black text-gray-400 uppercase tracking-widest">Actions</th>
    </>
  );
}

function ListingRow({ product, onDelete }: { product: any, onDelete: (id: string) => void }) {
  return (
    <>
      <td className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
            {product.images?.[0] ? <img src={product.images[0]} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 m-2.5 text-gray-300" />}
          </div>
          <div>
            <p className="font-bold text-gray-900 line-clamp-1">{product.name}</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{product.category}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <p className="text-xs font-bold text-gray-600 truncate max-w-[120px]">{product.storeId}</p>
      </td>
      <td className="px-6 py-5">
        <p className="font-black text-gray-900">{formatCurrency(product.price, product.currency)}</p>
      </td>
      <td className="px-6 py-5"><StatusBadge status={product.status} /></td>
      <td className="px-6 py-5 text-right">
        {product.status !== 'removed' && (
          <button 
            onClick={() => onDelete(product.id)}
            className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all"
            title="Remove Listing"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </td>
    </>
  );
}

function StoreRow({ store, onUpdateStatus, onToggleVerify }: { store: Store, onUpdateStatus: (id: string, s: string) => void, onToggleVerify: (id: string, v: boolean) => void }) {
  return (
    <>
      <td className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-xl overflow-hidden shadow-sm">
            {store.logo ? <img src={store.logo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-purple-100 text-purple-600 font-bold">{store.businessName[0]}</div>}
          </div>
          <div>
            <p className="font-bold text-gray-900">{store.businessName}</p>
            <p className="text-xs text-gray-500 font-medium">{store.category}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <button 
          onClick={() => onToggleVerify(store.id, store.isVerified)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
            store.isVerified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400 hover:bg-blue-50 hover:text-blue-600'
          }`}
        >
          {store.isVerified ? <Check className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
          {store.isVerified ? 'Verified' : 'Verify'}
        </button>
      </td>
      <td className="px-6 py-5"><StatusBadge status={store.status} /></td>
      <td className="px-6 py-5 text-right flex items-center justify-end gap-2">
        <button 
          onClick={() => onUpdateStatus(store.id, store.status === 'suspended' ? 'active' : 'suspended')}
          className={`p-2 rounded-xl transition-all ${store.status === 'suspended' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}
          title={store.status === 'suspended' ? "Reactivate" : "Suspend"}
        >
          {store.status === 'suspended' ? <CheckCircle className="w-5 h-5" /> : <PauseIcon className="w-5 h-5" />}
        </button>
      </td>
    </>
  );
}

function OrderTableHeaders() {
  return (
    <>
      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Order ID</th>
      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Customer</th>
      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Total</th>
      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
      <th className="px-6 py-4 text-right text-xs font-black text-gray-400 uppercase tracking-widest">Date</th>
    </>
  );
}

function OrderRow({ order }: { order: Order }) {
  return (
    <>
      <td className="px-6 py-5">
        <p className="font-mono text-xs font-bold text-gray-600 uppercase">#{order.id.slice(0, 8)}</p>
      </td>
      <td className="px-6 py-5">
        <p className="text-xs font-bold text-gray-900 truncate max-w-[120px] font-mono">{order.customerId.slice(-6)}...</p>
      </td>
      <td className="px-6 py-5">
        <p className="font-black text-gray-900">{formatCurrency(order.totalAmount, order.currency)}</p>
      </td>
      <td className="px-6 py-5"><StatusBadge status={order.status} /></td>
      <td className="px-6 py-5 text-right">
        <p className="text-xs font-bold text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
      </td>
    </>
  );
}

function ReportTableHeaders() {
  return (
    <>
      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Report</th>
      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Target</th>
      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Reason</th>
      <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
      <th className="px-6 py-4 text-right text-xs font-black text-gray-400 uppercase tracking-widest">Actions</th>
    </>
  );
}

function ReportRow({ report, onUpdateStatus }: { report: any, onUpdateStatus: (id: string, s: string) => void }) {
  return (
    <>
      <td className="px-6 py-5">
        <p className="text-xs font-bold text-gray-500">From: {report.reporterId.slice(-6)}...</p>
        <p className="text-[10px] text-gray-400">{new Date(report.createdAt).toLocaleDateString()}</p>
      </td>
      <td className="px-6 py-5">
        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px] font-bold uppercase tracking-widest mr-2">{report.targetType}</span>
        <span className="font-mono text-[10px] text-gray-500">{report.targetId.slice(-8)}</span>
      </td>
      <td className="px-6 py-5">
        <p className="font-bold text-gray-900">{report.reason}</p>
        {report.details && <p className="text-[10px] text-gray-500 line-clamp-1">{report.details}</p>}
      </td>
      <td className="px-6 py-5"><StatusBadge status={report.status} /></td>
      <td className="px-6 py-5 text-right flex items-center justify-end gap-2">
        <button 
          onClick={() => onUpdateStatus(report.id, 'resolved')}
          className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-all"
          title="Resolve"
        >
          <Check className="w-5 h-5" />
        </button>
        <button 
          onClick={() => onUpdateStatus(report.id, 'ignored')}
          className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 transition-all"
          title="Ignore"
        >
          <X className="w-5 h-5" />
        </button>
      </td>
    </>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

