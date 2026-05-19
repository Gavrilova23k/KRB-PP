'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/components/providers/AuthProvider';
import { useNavigationHistory } from '@/hooks/useNavigationHistory';
import { trpc } from '@/lib/trpc';
import '@/styles/quiz.css';

interface Question {
  id: number;
  cityName: string;
  image: string;
  options: string[];
  climate?: string;
  population?: number;
}

const questions: Question[] = [
  {
    id: 1,
    cityName: 'Москва',
    image: '/Москва.webp',
    options: ['Москва', 'Санкт-Петербург', 'Казань', 'Новосибирск'],
    climate: 'Умеренный',
    population: 12655050,
  },
  {
    id: 2,
    cityName: 'Санкт-Петербург',
    image: '/Питер.jpg',
    options: ['Москва', 'Санкт-Петербург', 'Екатеринбург', 'Нижний Новгород'],
    climate: 'Умеренный',
    population: 5392992,
  },
  {
    id: 3,
    cityName: 'Казань',
    image: '/Казань.jpg',
    options: ['Казань', 'Самара', 'Уфа', 'Пермь'],
    climate: 'Умеренный',
    population: 1257391,
  },
  {
    id: 4,
    cityName: 'Новосибирск',
    image: '/Новосиб.webp',
    options: ['Омск', 'Красноярск', 'Новосибирск', 'Барнаул'],
    climate: 'Резко континентальный',
    population: 1625631,
  },
  {
    id: 5,
    cityName: 'Екатеринбург',
    image: '/Екатеринбург.jpg',
    options: ['Челябинск', 'Пермь', 'Тюмень', 'Екатеринбург'],
    climate: 'Континентальный',
    population: 1493749,
  },
  {
    id: 6,
    cityName: 'Нижний Новгород',
    image: '/Нижний.webp',
    options: ['Казань', 'Самара', 'Нижний Новгород', 'Волгоград'],
    climate: 'Умеренный',
    population: 1244251,
  },
  {
    id: 7,
    cityName: 'Ростов-на-Дону',
    image: '/Ростов.jpg',
    options: ['Краснодар', 'Ростов-на-Дону', 'Воронеж', 'Ставрополь'],
    climate: 'Субтропический',
    population: 1137704,
  },
  {
    id: 8,
    cityName: 'Челябинск',
    image: '/Челябинск.jpg',
    options: ['Челябинск', 'Магнитогорск', 'Курган', 'Тюмень'],
    climate: 'Континентальный',
    population: 1202371,
  },
  {
    id: 9,
    cityName: 'Омск',
    image: '/Омск.jpg',
    options: ['Томск', 'Омск', 'Кемерово', 'Иркутск'],
    climate: 'Резко континентальный',
    population: 1125695,
  },
];

// Достижения квиза
const QUIZ_ACHIEVEMENTS = {
  rookie: { id: 'quiz_rookie', name: '🎯 Начинающий географ', description: 'Правильно ответить на 3 вопроса', requirement: 3, icon: '🎯' },
  expert: { id: 'quiz_expert', name: '🏆 Знаток городов', description: 'Правильно ответить на 5 вопросов', requirement: 5, icon: '🏆' },
  master: { id: 'quiz_master', name: '👑 Мастер географии', description: 'Правильно ответить на 7 вопросов', requirement: 7, icon: '👑' },
  perfect: { id: 'quiz_perfect', name: '⭐ Идеальный знаток', description: 'Правильно ответить на все 9 вопросов', icon: '⭐', requirement: 9 },
};

export default function QuizPage() {
  const router = useRouter();
  const { goBack } = useNavigationHistory();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'play' | 'achievements'>('play');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<{ cityName: string; isCorrect: boolean; selectedAnswer: string }[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [newAchievements, setNewAchievements] = useState<any[]>([]);
  const [showAchievementsPopup, setShowAchievementsPopup] = useState(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState<any[]>([]);
  
  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  
  // Локальное хранилище для статистики квиза
  const [quizStats, setQuizStats] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('quiz_stats');
      return saved ? JSON.parse(saved) : { highScore: 0, gamesPlayed: 0, totalPoints: 0 };
    }
    return { highScore: 0, gamesPlayed: 0, totalPoints: 0 };
  });
  
  // Загрузка полученных достижений
  useEffect(() => {
    const achieved = [];
    for (const ach of Object.values(QUIZ_ACHIEVEMENTS)) {
      if (localStorage.getItem(`achievement_${ach.id}`)) {
        achieved.push(ach);
      }
    }
    setUnlockedAchievements(achieved);
  }, [score, showResult]);
  
  // Проверка достижений
  useEffect(() => {
    if (!showResult) return;
    
    const earned = [];
    if (score >= QUIZ_ACHIEVEMENTS.rookie.requirement && !localStorage.getItem(`achievement_${QUIZ_ACHIEVEMENTS.rookie.id}`)) {
      earned.push(QUIZ_ACHIEVEMENTS.rookie);
      localStorage.setItem(`achievement_${QUIZ_ACHIEVEMENTS.rookie.id}`, 'true');
    }
    if (score >= QUIZ_ACHIEVEMENTS.expert.requirement && !localStorage.getItem(`achievement_${QUIZ_ACHIEVEMENTS.expert.id}`)) {
      earned.push(QUIZ_ACHIEVEMENTS.expert);
      localStorage.setItem(`achievement_${QUIZ_ACHIEVEMENTS.expert.id}`, 'true');
    }
    if (score >= QUIZ_ACHIEVEMENTS.master.requirement && !localStorage.getItem(`achievement_${QUIZ_ACHIEVEMENTS.master.id}`)) {
      earned.push(QUIZ_ACHIEVEMENTS.master);
      localStorage.setItem(`achievement_${QUIZ_ACHIEVEMENTS.master.id}`, 'true');
    }
    if (score === questions.length && !localStorage.getItem(`achievement_${QUIZ_ACHIEVEMENTS.perfect.id}`)) {
      earned.push(QUIZ_ACHIEVEMENTS.perfect);
      localStorage.setItem(`achievement_${QUIZ_ACHIEVEMENTS.perfect.id}`, 'true');
    }
    
    if (earned.length > 0) {
      setNewAchievements(earned);
      setShowAchievementsPopup(true);
      setTimeout(() => setShowAchievementsPopup(false), 4000);
      setUnlockedAchievements(prev => [...prev, ...earned]);
    }
  }, [score, showResult]);
  
  const handleAnswer = (selected: string) => {
    if (isAnswered) return;
    
    setSelectedOption(selected);
    setIsAnswered(true);
    
    const isCorrect = selected === currentQuestion.cityName;
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
    
    setAnswers(prev => [...prev, {
      cityName: currentQuestion.cityName,
      isCorrect,
      selectedAnswer: selected,
    }]);
    
    if (isLastQuestion) {
      setTimeout(() => {
        setShowResult(true);
        const newStats = {
          highScore: Math.max(quizStats.highScore, score + (isCorrect ? 1 : 0)),
          gamesPlayed: quizStats.gamesPlayed + 1,
          totalPoints: quizStats.totalPoints + (isCorrect ? 10 : 0),
        };
        setQuizStats(newStats);
        localStorage.setItem('quiz_stats', JSON.stringify(newStats));
      }, 1000);
    } else {
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedOption(null);
        setIsAnswered(false);
      }, 1000);
    }
  };
  
  const restartQuiz = () => {
    setCurrentQuestionIndex(0);
    setScore(0);
    setAnswers([]);
    setShowResult(false);
    setSelectedOption(null);
    setIsAnswered(false);
  };
  
  const formatPopulation = (pop: number) => {
    if (pop >= 1000000) return `${(pop / 1000000).toFixed(1)} млн`;
    return pop.toLocaleString();
  };
  
  // Вкладка достижений
  const AchievementsTab = () => (
    <div className="quiz-achievements-tab">
      <div className="achievements-header">
        <h2>🏆 Мои достижения</h2>
        <div className="achievements-stats">
          <span>Получено: {unlockedAchievements.length} / {Object.values(QUIZ_ACHIEVEMENTS).length}</span>
        </div>
      </div>
      
      <div className="achievements-grid-quiz">
        {Object.values(QUIZ_ACHIEVEMENTS).map((achievement) => {
          const isUnlocked = unlockedAchievements.some(a => a.id === achievement.id);
          return (
            <div key={achievement.id} className={`achievement-card-quiz ${isUnlocked ? 'unlocked' : 'locked'}`}>
              <div className="achievement-icon-quiz">{achievement.icon}</div>
              <div className="achievement-info-quiz">
                <div className="achievement-name-quiz">{achievement.name}</div>
                <div className="achievement-desc-quiz">{achievement.description}</div>
                {!isUnlocked && (
                  <div className="achievement-progress">
                    <div className="progress-bar-quiz">
                      <div 
                        className="progress-fill-quiz" 
                        style={{ width: `${Math.min(100, (score / achievement.requirement) * 100)}%` }}
                      ></div>
                    </div>
                    <span className="progress-text-quiz">{score}/{achievement.requirement}</span>
                  </div>
                )}
                {isUnlocked && <div className="unlocked-badge">✓ Получено!</div>}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="quiz-stats-quiz">
        <h3>📊 Статистика игр</h3>
        <div className="stats-grid">
          <div className="stat-card-quiz">
            <span className="stat-value-quiz">{quizStats.highScore}</span>
            <span className="stat-label-quiz">🏆 Рекорд</span>
          </div>
          <div className="stat-card-quiz">
            <span className="stat-value-quiz">{quizStats.gamesPlayed}</span>
            <span className="stat-label-quiz">🎮 Игр сыграно</span>
          </div>
          <div className="stat-card-quiz">
            <span className="stat-value-quiz">{quizStats.totalPoints}</span>
            <span className="stat-label-quiz">⭐ Всего очков</span>
          </div>
        </div>
      </div>
    </div>
  );
  
  // Результаты игры
  if (showResult) {
    const percentage = Math.round((score / questions.length) * 100);
    let message = '';
    let emoji = '';
    
    if (percentage === 100) {
      message = 'Идеально! Вы настоящий географ!';
      emoji = '🏆👑⭐';
    } else if (percentage >= 80) {
      message = 'Отлично! Вы хорошо знаете города России!';
      emoji = '🎉🌟';
    } else if (percentage >= 60) {
      message = 'Неплохо! Но есть куда расти!';
      emoji = '👍';
    } else if (percentage >= 40) {
      message = 'Попробуйте еще раз, чтобы лучше запомнить города!';
      emoji = '💪';
    } else {
      message = 'Не расстраивайтесь! Путешествуйте больше или пересмотрите города!';
      emoji = '🗺️';
    }
    
    return (
      <div className="quiz-page">
        <div className="quiz-container">
          <button className="quiz-back-btn" onClick={goBack}>← Назад</button>
          
          <div className="quiz-tabs">
            <button 
              className={`quiz-tab ${activeTab === 'play' ? 'active' : ''}`}
              onClick={() => setActiveTab('play')}
            >
              🎮 Играть
            </button>
            <button 
              className={`quiz-tab ${activeTab === 'achievements' ? 'active' : ''}`}
              onClick={() => setActiveTab('achievements')}
            >
              🏆 Достижения
            </button>
          </div>
          
          {activeTab === 'play' ? (
            <div className="quiz-result">
              <div className="result-emoji">{emoji}</div>
              <h1>Результаты квиза</h1>
              <div className="result-score">
                <span className="score-number">{score}</span>
                <span className="score-total">/{questions.length}</span>
              </div>
              <p className="result-message">{message}</p>
              <div className="result-percentage">
                <div className="percentage-bar">
                  <div className="percentage-fill" style={{ width: `${percentage}%` }}></div>
                </div>
                <span>{percentage}% правильных ответов</span>
              </div>
              
              <button className="restart-btn" onClick={restartQuiz}>
                🔄 Сыграть снова
              </button>
              
              <div className="answers-review">
                <h3>📋 Разбор ответов</h3>
                {answers.map((answer, idx) => (
                  <div key={idx} className={`review-item ${answer.isCorrect ? 'correct' : 'incorrect'}`}>
                    <div className="review-question">
                      <span className="review-number">{idx + 1}.</span>
                      <span className="review-city">{answer.cityName}</span>
                    </div>
                    <div className="review-answer">
                      {answer.isCorrect ? (
                        <span className="correct-mark">✓ {answer.selectedAnswer}</span>
                      ) : (
                        <span className="incorrect-mark">
                          ✗ {answer.selectedAnswer} → Правильно: {answer.cityName}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <AchievementsTab />
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="quiz-page">
      <div className="quiz-container">
        <button className="quiz-back-btn" onClick={goBack}>← Назад</button>
        
        <div className="quiz-tabs">
          <button 
            className={`quiz-tab ${activeTab === 'play' ? 'active' : ''}`}
            onClick={() => setActiveTab('play')}
          >
            🎮 Играть
          </button>
          <button 
            className={`quiz-tab ${activeTab === 'achievements' ? 'active' : ''}`}
            onClick={() => setActiveTab('achievements')}
          >
            🏆 Достижения
          </button>
        </div>
        
        {activeTab === 'play' ? (
          <>
            <div className="quiz-header">
              <div className="quiz-progress">
                Вопрос {currentQuestionIndex + 1} из {questions.length}
              </div>
              <div className="quiz-score">⭐ Счет: {score}</div>
            </div>
            
            <div className="quiz-question">
              <div className="question-image">
                <Image
                  src={currentQuestion.image}
                  alt="Город"
                  width={500}
                  height={300}
                  className="city-quiz-image"
                  unoptimized
                />
              </div>
              <h2>Какой это город?</h2>
            </div>
            
            <div className="quiz-options">
              {currentQuestion.options.map((option, idx) => {
                let className = 'quiz-option';
                if (isAnswered && selectedOption === option) {
                  className += option === currentQuestion.cityName ? ' correct' : ' wrong';
                } else if (isAnswered && option === currentQuestion.cityName) {
                  className += ' correct';
                }
                
                return (
                  <button
                    key={idx}
                    className={className}
                    onClick={() => handleAnswer(option)}
                    disabled={isAnswered}
                  >
                    <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                    {option}
                  </button>
                );
              })}
            </div>
            
            <div className="quiz-fact">
              <div className="fact-icon">💡</div>
              <div className="fact-text">
                {currentQuestion.climate && (
                  <span>Климат: {currentQuestion.climate} | </span>
                )}
                {currentQuestion.population && (
                  <span>Население: {formatPopulation(currentQuestion.population)}</span>
                )}
              </div>
            </div>
          </>
        ) : (
          <AchievementsTab />
        )}
      </div>
      
      {/* Попап с новыми достижениями */}
      {showAchievementsPopup && newAchievements.length > 0 && (
        <div className="quiz-achievements-popup">
          <div className="popup-content">
            <div className="popup-icon">🏆</div>
            <h3>Новые достижения!</h3>
            {newAchievements.map((ach, idx) => (
              <div key={idx} className="popup-achievement">
                <span>{ach.icon}</span>
                <div>
                  <div className="popup-title">{ach.name}</div>
                  <div className="popup-desc">{ach.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}