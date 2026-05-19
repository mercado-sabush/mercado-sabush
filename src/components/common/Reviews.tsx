import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, setDoc, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { Star, User, Send, StarHalf, MessageCircle, Clock, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from './Skeleton';
import { cn } from '../../lib/utils';
import { handleFirestoreError, OperationType } from '../../lib/firebaseErrors';
import { useTranslation } from 'react-i18next';

interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  rating: number;
  comment: string;
  createdAt: any;
}

interface ProductReviewsProps {
  productId: string;
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'reviews'),
      where('productId', '==', productId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Review[]);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'reviews'));

    return () => unsubscribe();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newReview.comment.trim()) return;

    setSubmitting(true);
    try {
      const reviewId = `${productId}_${user.uid}`;
      await setDoc(doc(db, 'reviews', reviewId), {
        productId,
        userId: user.uid,
        userName: profile?.displayName || user.displayName || 'Anonymous',
        userPhoto: user.photoURL,
        rating: newReview.rating,
        comment: newReview.comment,
        createdAt: new Date().toISOString()
      });
      setNewReview({ rating: 5, comment: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `reviews/${productId}_${user.uid}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        {[1, 2].map(i => (
          <div key={i} className="flex gap-4">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const averageRating = reviews.length > 0 
    ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length 
    : 0;

  return (
    <div className="space-y-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
           <h3 className="text-2xl font-black text-gray-900 italic tracking-tight mb-2">{t('reviews.title', 'Customer Reviews')}</h3>
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-orange-400">
                 {[1, 2, 3, 4, 5].map((s) => (
                   <Star key={s} className={cn("w-5 h-5", averageRating >= s ? "fill-orange-400" : "text-gray-200")} />
                 ))}
              </div>
              <p className="font-bold text-gray-900">{averageRating.toFixed(1)} <span className="text-gray-400 font-medium">({reviews.length} reviews)</span></p>
           </div>
        </div>

        {user && !reviews.find(r => r.userId === user.uid) && (
           <div className="flex items-center gap-2 text-xs font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-full uppercase tracking-widest">
              <CheckCircle className="w-4 h-4" /> {t('reviews.you_can_review', 'You can add a review')}
           </div>
        )}
      </div>

      {user && !reviews.find(r => r.userId === user.uid) && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-8 rounded-[40px] border border-gray-100 shadow-inner">
           <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 ml-4">{t('reviews.share_exp', 'Share your experience')}</p>
           <div className="flex gap-2 mb-6 ml-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <button 
                  key={s}
                  type="button"
                  onClick={() => setNewReview({ ...newReview, rating: s })}
                  className="hover:scale-110 transition-transform"
                >
                  <Star className={cn("w-8 h-8", newReview.rating >= s ? "text-orange-400 fill-orange-400" : "text-gray-300")} />
                </button>
              ))}
           </div>
           
           <div className="relative">
              <textarea 
                className="w-full px-8 py-6 bg-white border-none rounded-[32px] focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium resize-none min-h-[120px] shadow-sm"
                placeholder={t('reviews.placeholder', 'What did you think of this product?')}
                value={newReview.comment}
                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
              />
              <button 
                type="submit"
                disabled={submitting || !newReview.comment.trim()}
                className="absolute bottom-4 right-4 p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50"
              >
                {submitting ? <Clock className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
           </div>
        </form>
      )}

      <div className="space-y-8">
        {reviews.map((review) => (
          <div key={review.id} className="flex gap-6 group">
            <div className="shrink-0">
               <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 border border-gray-50 group-hover:shadow-md transition-all">
                  {review.userPhoto ? (
                    <img src={review.userPhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-600 font-black">
                       {review.userName?.[0]}
                    </div>
                  )}
               </div>
            </div>
            <div className="flex-1 space-y-2">
               <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 leading-none">{review.userName}</h4>
                    <div className="flex items-center gap-1 mt-1 text-orange-400">
                       {[1, 2, 3, 4, 5].map((s) => (
                         <Star key={s} className={cn("w-3 h-3", review.rating >= s ? "fill-orange-400" : "text-gray-200")} />
                       ))}
                    </div>
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {review.createdAt ? formatDistanceToNow(new Date(review.createdAt)) + ` ${t('reviews.ago', 'ago')}` : t('reviews.just_now', 'Just now')}
                  </p>
               </div>
               <p className="text-gray-600 text-sm leading-relaxed font-medium">{review.comment}</p>
            </div>
          </div>
        ))}

        {reviews.length === 0 && (
          <div className="text-center py-20 bg-gray-50 rounded-[40px] border border-dashed border-gray-200">
             <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
             <p className="font-bold text-gray-400 italic">{t('reviews.be_first', 'Be the first to review this product!')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
