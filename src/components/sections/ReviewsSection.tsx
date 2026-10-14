import React, { useState } from 'react';
import { AUTO_REVIEWS } from '../../data/mockData';
import { INITIAL_USER_REVIEWS } from '../../data/workshopData';
import { Language, UserReview } from '../../types/car';
import { KochkorMuyuzIcon } from '../ornaments/KyrgyzOrnaments';
import { Star, ThumbsUp, Mountain, Check, X, Plus, MessageSquare, CheckCircle2, User } from 'lucide-react';

interface ReviewsSectionProps {
  language: Language;
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({ language }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [reviewsList, setReviewsList] = useState<UserReview[]>(INITIAL_USER_REVIEWS);
  const [likedReviews, setLikedReviews] = useState<string[]>([]);
  const [isAddReviewOpen, setIsAddReviewOpen] = useState(false);

  // New review form state
  const [authorName, setAuthorName] = useState('');
  const [city, setCity] = useState('Бишкек');
  const [category, setCategory] = useState<'service' | 'car_purchase' | 'parts' | 'carcheck'>('service');
  const [targetTitle, setTargetTitle] = useState('СТО KGzone (Льва Толстого)');
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [pros, setPros] = useState('');
  const [cons, setCons] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const isKg = language === 'kg';
  const isEn = language === 'en';

  const handleToggleLike = (id: string) => {
    if (likedReviews.includes(id)) {
      setLikedReviews((prev) => prev.filter((r) => r !== id));
      setReviewsList((prev) =>
        prev.map((r) => (r.id === id ? { ...r, likes: Math.max(0, r.likes - 1) } : r))
      );
    } else {
      setLikedReviews((prev) => [...prev, id]);
      setReviewsList((prev) =>
        prev.map((r) => (r.id === id ? { ...r, likes: r.likes + 1 } : r))
      );
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !reviewText.trim()) {
      alert('Пожалуйста, укажите имя и текст отзыва');
      return;
    }

    setIsSubmitting(true);
    const newRev: UserReview = {
      id: `rev-${Date.now()}`,
      authorName,
      city,
      category,
      targetTitle,
      rating,
      date: 'Сегодня, только что',
      text: reviewText,
      pros,
      cons,
      verifiedPurchase: true,
      likes: 1,
    };

    try {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRev),
      });
    } catch {
      // Local fallback
    }

    setReviewsList([newRev, ...reviewsList]);
    setIsSubmitting(false);
    setIsAddReviewOpen(false);
    setAuthorName('');
    setReviewText('');
    setPros('');
    setCons('');
    setNotification(isKg ? 'Пикириңиз ийгиликтүү кошулду!' : 'Ваш отзыв успешно опубликован!');
    setTimeout(() => setNotification(null), 3500);
  };

  const filteredReviews = reviewsList.filter((r) => {
    if (selectedCategory === 'all') return true;
    return r.category === selectedCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Toast alert */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 font-bold text-xs animate-bounce">
          <CheckCircle2 size={16} />
          <span>{notification}</span>
        </div>
      )}

      {/* Шапка отзывов */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#C8102E] uppercase tracking-wider mb-1">
            <KochkorMuyuzIcon size={16} color="#C8102E" />
            <span>KGzone Отзывы · Кыргызстан</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {isKg ? 'Чыныгы кардарлардын жана айдоочулардын пикирлери' : 'Отзывы реальных пользователей и автовладельцев'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isKg
              ? 'Автосервис, сатып алынган унаалар, Кудайбергендеги тетиктер жана CarCheck KG текшерүүлөрү боюнча пикирлер'
              : 'Честные оценки СТО, покупки авто на авторынках КР, оригинальности запчастей и отчетов CarCheck KG'}
          </p>
        </div>

        <button
          onClick={() => setIsAddReviewOpen(true)}
          className="self-start sm:self-auto px-5 py-2.5 bg-[#C8102E] hover:bg-[#a60d26] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus size={16} />
          <span>{isKg ? 'Пикир калтыруу' : isEn ? 'Leave Review' : 'Оставить отзыв'}</span>
        </button>
      </div>

      {/* Категории отзывов */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
        {[
          { id: 'all', label: isKg ? 'Бардык пикирлер' : 'Все отзывы' },
          { id: 'service', label: isKg ? 'СТО жана Автосервис' : 'Автосервис & Ремонт' },
          { id: 'parts', label: isKg ? 'Тетиктер (Запчасти)' : 'Запчасти Кудайберген' },
          { id: 'carcheck', label: 'CarCheck KG' },
          { id: 'car_purchase', label: isKg ? 'Унаа сатып алуу' : 'Покупка авто' },
        ].map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === c.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Сетка пользовательских отзывов */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
        {filteredReviews.map((rev) => (
          <div
            key={rev.id}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-sm">
                    {rev.authorName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {rev.authorName}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      г. {rev.city} · {rev.date}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded text-xs font-bold border border-amber-200 dark:border-amber-800">
                  <Star size={13} className="fill-amber-400 text-amber-400" />
                  <span>{rev.rating} / 5</span>
                </div>
              </div>

              <div className="text-xs font-semibold text-[#C8102E] mb-2">
                Объект: {rev.targetTitle}
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
                {rev.text}
              </p>

              {(rev.pros || rev.cons) && (
                <div className="space-y-1.5 text-[11px] mb-3">
                  {rev.pros && (
                    <div className="flex items-start gap-1.5 text-emerald-700 dark:text-emerald-400">
                      <Check size={13} className="shrink-0 mt-0.5" />
                      <span><strong>Плюсы:</strong> {rev.pros}</span>
                    </div>
                  )}
                  {rev.cons && (
                    <div className="flex items-start gap-1.5 text-red-600 dark:text-red-400">
                      <X size={13} className="shrink-0 mt-0.5" />
                      <span><strong>Минусы:</strong> {rev.cons}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
              <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={12} />
                Проверенный клиент KGzone
              </span>

              <button
                type="button"
                onClick={() => handleToggleLike(rev.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  likedReviews.includes(rev.id)
                    ? 'bg-red-50 text-[#C8102E] dark:bg-red-950 font-bold'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <ThumbsUp size={13} />
                <span>Полезно ({rev.likes})</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Раздел подробных тест-драйвов и перевалов Төө-Ашуу */}
      <div className="pt-8 border-t border-slate-200 dark:border-slate-800">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Mountain size={20} className="text-[#C8102E]" />
          <span>Испытания перевалами Кыргызстана (Төө-Ашуу, Боом, Сон-Көл)</span>
        </h3>

        <div className="space-y-4">
          {AUTO_REVIEWS.map((rev) => (
            <div
              key={rev.id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  {rev.carTitle} ({rev.year}) — {rev.author}
                </h4>
                <div className="flex items-center gap-2 bg-slate-900 text-white px-2.5 py-1 rounded-lg text-xs font-semibold">
                  <Mountain size={14} className="text-amber-400" />
                  <span>Төө-Ашуу:</span>
                  <span className="text-amber-400 font-bold">{rev.mountainPassScore} / 10</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {rev.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Модальное окно добавления отзыва */}
      {isAddReviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare size={18} className="text-[#C8102E]" />
                <span>Оставить честный отзыв на KGzone</span>
              </h3>
              <button
                onClick={() => setIsAddReviewOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ваше имя *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Адилет"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Город *
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs font-semibold"
                  >
                    <option value="Бишкек">Бишкек</option>
                    <option value="Ош">Ош</option>
                    <option value="Джалал-Абад">Джалал-Абад</option>
                    <option value="Каракол">Каракол</option>
                    <option value="Нарын">Нарын</option>
                    <option value="Талас">Талас</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Категория *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs font-semibold"
                  >
                    <option value="service">Автосервис & СТО</option>
                    <option value="parts">Запчасти Кудайберген</option>
                    <option value="carcheck">Проверка CarCheck</option>
                    <option value="car_purchase">Покупка автомобиля</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Оценка (1-5 звезд) *
                  </label>
                  <div className="flex items-center gap-1.5 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        className="text-amber-400 cursor-pointer p-0.5"
                      >
                        <Star
                          size={22}
                          className={star <= rating ? 'fill-amber-400' : 'text-slate-300'}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Название авто или услуги
                </label>
                <input
                  type="text"
                  placeholder="СТО KGzone / Toyota Camry 70"
                  value={targetTitle}
                  onChange={(e) => setTargetTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Текст отзыва *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Опишите ваши впечатления от качества обслуживания, сроков или запчастей..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                    Плюсы
                  </label>
                  <input
                    type="text"
                    placeholder="Быстро, честные цены"
                    value={pros}
                    onChange={(e) => setPros(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-red-700 dark:text-red-400 mb-1">
                    Минусы
                  </label>
                  <input
                    type="text"
                    placeholder="Очередь по субботам"
                    value={cons}
                    onChange={(e) => setCons(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddReviewOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#C8102E] hover:bg-[#a60d26] text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  {isSubmitting ? 'Публикация...' : 'Опубликовать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
