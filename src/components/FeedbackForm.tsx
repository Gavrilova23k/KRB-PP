'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useState, useEffect, Suspense } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from './providers/AuthProvider';

interface FeedbackValues {
  name: string;
  email: string;
  message: string;
}

interface Feedback {
  id: number;
  message: string;
  rating: number;
  createdAt: number;
  userName: string;
}

const FeedbackContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/';
  const { user } = useAuth();
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Получаем город из URL
  const cityName = searchParams.get('city') || 'Москва';
  const { data: city } = trpc.city.getByName.useQuery(cityName);
  const cityId = city?.id || 1;
  
  // Получаем отзывы через tRPC
  const { data: feedbacks, refetch } = trpc.feedback.getByCity.useQuery(
    { cityId },
    { enabled: !!cityId }
  );

  const initialValues: FeedbackValues = {
    name: user?.name || '',
    email: user?.email || '',
    message: ''
  };

  const validationSchema = Yup.object({
    name: Yup.string()
      .required('Обязательное поле')
      .min(2, 'Минимум 2 символа')
      .max(50, 'Максимум 50 символов'),
    email: Yup.string()
      .email('Некорректный email')
      .required('Обязательное поле'),
    message: Yup.string()
      .required('Обязательное поле')
      .min(10, 'Минимум 10 символов')
      .max(500, 'Максимум 500 символов')
  });

  const onSubmit = async (values: FeedbackValues, { setSubmitting, resetForm }: any) => {
    try {
      // Отправляем через tRPC
      await trpc.feedback.add.mutate({
        cityId,
        message: values.message,
        rating: 5,
      });
      
      resetForm();
      refetch(); // Обновляем список отзывов
      
      setSuccessMessage('Отзыв успешно добавлен!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      alert(error.message || 'Ошибка при отправке отзыва');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push(returnUrl);
  };

  return (
    <div className="feedback-container">
      <h1>Форма обратной связи 💬</h1>
      
      {user ? (
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={onSubmit}
        >
          {({ isSubmitting }) => (
            <Form id="feedback-form" className="feedback-form">
              <div className="form-group">
                <label htmlFor="message">Ваш отзыв о городе:</label>
                <Field 
                  as="textarea" 
                  name="message" 
                  className="form-textarea"
                  placeholder="Напишите ваш отзыв здесь..."
                  rows={5}
                />
                <ErrorMessage name="message" component="div" className="error-message" />
              </div>

              <div className="button-group">
                <button 
                  type="button"
                  onClick={handleBack} 
                  className="action-button secondary"
                >
                  Назад
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="action-button"
                >
                  {isSubmitting ? 'Отправка...' : 'Добавить отзыв'}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      ) : (
        <div className="auth-required">
          <p>Для отправки отзыва необходимо <a href="/auth">войти в аккаунт</a>.</p>
        </div>
      )}

      <div className="feedback-history">
        <h2>Отзывы о городе:</h2>
        {feedbacks === undefined ? (
          <p>Загрузка...</p>
        ) : feedbacks.length === 0 ? (
          <p>Пока нет отзывов. Будьте первым!</p>
        ) : (
          <ul>
            {feedbacks.map((feedback) => (
              <li key={feedback.id} className="review-card">
                <strong>{feedback.userName}:</strong> {feedback.message}
                <span className="rating">⭐ {feedback.rating}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}
    </div>
  );
};

const FeedbackForm: React.FC = () => {
  return (
    <Suspense fallback={<div className="feedback-container">Загрузка...</div>}>
      <FeedbackContent />
    </Suspense>
  );
};

export default FeedbackForm;