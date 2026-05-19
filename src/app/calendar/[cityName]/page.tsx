'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useNavigationHistory } from '@/hooks/useNavigationHistory';
import { trpc } from '@/lib/trpc';
import '@/styles/calendar.css';

type Period = '3days' | 'week' | '10days';

interface HourlyWeather {
  time: string;
  hour: number;
  temp: number;
  feelsLike: number;
  windSpeed: number;
  description: string;
  icon: string;
  partOfDay: 'night' | 'morning' | 'day' | 'evening';
}

export default function CityCalendarPage() {
  const params = useParams();
  const router = useRouter();
  const { goBack } = useNavigationHistory();
  const cityName = decodeURIComponent(params.cityName as string);
  
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('10days');
  const [weatherData, setWeatherData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentWeather, setCurrentWeather] = useState<any>(null);
  const [todayWeather, setTodayWeather] = useState<any>(null);
  const [tomorrowWeather, setTomorrowWeather] = useState<any>(null);
  
  // Для тултипа с почасовым прогнозом
  const [hoveredDay, setHoveredDay] = useState<any>(null);
  const [hourlyForecast, setHourlyForecast] = useState<HourlyWeather[]>([]);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isTooltipLoading, setIsTooltipLoading] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  const { data: city } = trpc.city.getByName.useQuery(cityName);
  
  const { data: currentWeatherData, refetch: refetchCurrent } = trpc.weather.getCurrent.useQuery(
    { lat: city?.latitude || '0', lon: city?.longitude || '0' },
    { enabled: !!city }
  );
  
  const getDaysCount = () => {
    if (selectedPeriod === '3days') return 3;
    if (selectedPeriod === 'week') return 7;
    return 10;
  };
  
  const { data: forecastData, refetch: refetchForecast, isLoading } = trpc.weather.getForecast.useQuery(
    { lat: city?.latitude || '0', lon: city?.longitude || '0', days: getDaysCount() },
    { enabled: !!city }
  );
  
  const fetchHourlyForecast = async (date: string, dayData: any) => {
    if (!city) return;
    
    setIsTooltipLoading(true);
    setHoveredDay(dayData);
    setTooltipVisible(true);
    
    try {
      const response = await fetch('/api/trpc/weather.getHourlyForecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          json: {
            lat: city.latitude,
            lon: city.longitude,
            date: date,
          }
        })
      });
      
      const data = await response.json();
      
      if (data?.result?.data?.json && data.result.data.json.length > 0) {
        setHourlyForecast(data.result.data.json);
      } else {
        setHourlyForecast(generateSmartHourlyForDay(date, dayData));
      }
    } catch (err) {
      console.error('Hourly forecast error:', err);
      setHourlyForecast(generateSmartHourlyForDay(date, dayData));
    } finally {
      setIsTooltipLoading(false);
    }
  };
  
  const generateSmartHourlyForDay = (date: string, dayData: any): HourlyWeather[] => {
    const dayTemp = dayData.tempMax || dayData.temp || 18;
    const nightTemp = dayData.tempMin || (dayTemp - 8);
    const morningTemp = Math.round((nightTemp + dayTemp) / 2);
    const eveningTemp = Math.round((dayTemp + nightTemp) / 2);
    
    const dateSeed = new Date(date).getDate();
    const icons = ['☀️', '🌤️', '⛅', '☁️', '🌧️', '🌦️'];
    const iconIndex = dateSeed % icons.length;
    const descriptions = ['Ясно', 'Преимущественно ясно', 'Переменная облачность', 'Пасмурно', 'Дождь', 'Небольшой дождь'];
    
    const mainIcon = dayData.icon || icons[iconIndex];
    const mainDesc = dayData.description || descriptions[iconIndex];
    const nightIcon = mainIcon === '☀️' ? '🌙' : mainIcon;
    
    return [
      { time: date, hour: 2, temp: nightTemp, feelsLike: nightTemp - 2, windSpeed: Math.floor(Math.random() * 8 + 2), description: nightTemp < 0 ? 'Морозная ночь' : mainDesc, icon: nightIcon, partOfDay: 'night' },
      { time: date, hour: 9, temp: morningTemp, feelsLike: morningTemp - 1, windSpeed: Math.floor(Math.random() * 10 + 3), description: mainDesc, icon: mainIcon, partOfDay: 'morning' },
      { time: date, hour: 15, temp: dayTemp, feelsLike: dayTemp, windSpeed: Math.floor(Math.random() * 12 + 4), description: mainDesc, icon: mainIcon, partOfDay: 'day' },
      { time: date, hour: 20, temp: eveningTemp, feelsLike: eveningTemp - 1, windSpeed: Math.floor(Math.random() * 9 + 3), description: mainDesc, icon: mainIcon, partOfDay: 'evening' },
    ];
  };
  
  // Обработчик наведения на день
  const handleDayHover = (day: any, event: React.MouseEvent<HTMLDivElement>) => {
    const targetRect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top - 10;
    
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    hoverTimeoutRef.current = setTimeout(() => {
      setTooltipPosition({ x: targetX, y: targetY });
      fetchHourlyForecast(day.date, day);
    }, 200);
  };
  
  // Продолжение входа в тултип
  const handleTooltipMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setTooltipVisible(true);
  };
  
  // Выход из тултипа
  const handleTooltipMouseLeave = () => {
    setTooltipVisible(false);
    setHoveredDay(null);
    setHourlyForecast([]);
  };
  
  // Уход мыши с ячейки
  const handleDayLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // Не скрываем сразу, даем время зайти на тултип
    setTimeout(() => {
      if (!tooltipVisible) {
        setTooltipVisible(false);
        setHoveredDay(null);
        setHourlyForecast([]);
      }
    }, 100);
  };
  
  useEffect(() => {
    if (currentWeatherData) setCurrentWeather(currentWeatherData);
  }, [currentWeatherData]);
  
  useEffect(() => {
    if (forecastData && forecastData.length > 0) {
      setWeatherData(forecastData);
      if (forecastData[0]) setTodayWeather(forecastData[0]);
      if (forecastData[1]) setTomorrowWeather(forecastData[1]);
      setLoading(false);
      setError(null);
    } else if (!isLoading && city) {
      setError('Не удалось загрузить прогноз погоды');
      setLoading(false);
    }
  }, [forecastData, isLoading, city]);
  
  useEffect(() => {
    if (city) {
      setLoading(true);
      refetchForecast();
    }
  }, [selectedPeriod, city, refetchForecast]);
  
  const handleRefresh = () => {
    setLoading(true);
    refetchCurrent();
    refetchForecast();
  };
  
  const getWeatherEmoji = (icon: string) => icon || '🌈';
  const formatDay = (dateStr: string) => new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  const getWeekday = (dateStr: string, index: number) => {
    if (index === 0) return 'Сегодня';
    if (index === 1) return 'Завтра';
    return new Date(dateStr).toLocaleDateString('ru-RU', { weekday: 'short' });
  };
  
  const getPartOfDayLabel = (part: string) => {
    const labels: Record<string, string> = {
      night: '🌙 Ночь (00:00-05:00)',
      morning: '🌅 Утро (06:00-11:00)',
      day: '☀️ День (12:00-17:00)',
      evening: '🌆 Вечер (18:00-23:00)'
    };
    return labels[part] || part;
  };
  
  const getClothingAdvice = (temp: number) => {
    if (temp < -10) return '🥶 Очень холодно! Теплый пуховик, шапка и перчатки.';
    if (temp < 0) return '🧤 Холодно. Зимняя куртка, шапка и варежки.';
    if (temp < 10) return '🧥 Прохладно. Куртка или пальто.';
    if (temp < 20) return '👕 Комфортно. Легкая куртка или свитер.';
    if (temp < 25) return '🩳 Тепло. Футболка и легкие штаны.';
    if (temp < 30) return '🩳 Жарко! Головной убор обязателен.';
    return '🩳 Очень жарко! Легкая одежда, пейте воду.';
  };
  
  if (!city) return <div className="loading">Загрузка...</div>;
  
  return (
    <div className="gismeteo-page">
      <div className="gismeteo-container">
        {/* Шапка */}
        <div className="gismeteo-header">
          <div className="gismeteo-location">
            <h1>🌤️ Погода в {city.name}</h1>
            <p>Россия / {city.name}</p>
          </div>
          <button className="gismeteo-back" onClick={goBack}>← Назад</button>
        </div>
        
        {/* Текущая погода */}
        {currentWeather && (
          <div className="gismeteo-current">
            <div className="gismeteo-current-left">
              <div className="gismeteo-current-temp">{currentWeather.temp}°</div>
              <div className="gismeteo-current-feels">По ощущению {Math.round((currentWeather.temp || 0) - 2)}°</div>
            </div>
            <div className="gismeteo-current-right">
              <div className="gismeteo-current-icon">
                <span className="weather-icon">{getWeatherEmoji(currentWeather.icon)}</span>
              </div>
              <div className="gismeteo-current-desc">{currentWeather.description}</div>
            </div>
          </div>
        )}
        
        {/* Краткий прогноз */}
        <div className="gismeteo-short">
          {todayWeather && (
            <div className="gismeteo-short-item">
              <div className="short-day">Сегодня</div>
              <div className="short-temps">
                <span className="short-max">{todayWeather.tempMax || todayWeather.temp}°</span>
                <span className="short-min">{todayWeather.tempMin || Math.floor((todayWeather.tempMax || 20) - 6)}°</span>
              </div>
              <div className="short-icon weather-icon">{getWeatherEmoji(todayWeather.icon)}</div>
            </div>
          )}
          {tomorrowWeather && (
            <div className="gismeteo-short-item">
              <div className="short-day">Завтра</div>
              <div className="short-temps">
                <span className="short-max">{tomorrowWeather.tempMax || tomorrowWeather.temp}°</span>
                <span className="short-min">{tomorrowWeather.tempMin || Math.floor((tomorrowWeather.tempMax || 20) - 6)}°</span>
              </div>
              <div className="short-icon weather-icon">{getWeatherEmoji(tomorrowWeather.icon)}</div>
            </div>
          )}
        </div>
        
        {/* Выбор периода */}
        <div className="gismeteo-period">
          <button className={`period-btn ${selectedPeriod === '3days' ? 'active' : ''}`} onClick={() => setSelectedPeriod('3days')}>3 дня</button>
          <button className={`period-btn ${selectedPeriod === 'week' ? 'active' : ''}`} onClick={() => setSelectedPeriod('week')}>Неделя</button>
          <button className={`period-btn ${selectedPeriod === '10days' ? 'active' : ''}`} onClick={() => setSelectedPeriod('10days')}>10 дней</button>
        </div>
        
        {/* Таблица прогноза */}
        {isLoading || loading ? (
          <div className="gismeteo-loading"><div className="spinner"></div><p>Загрузка прогноза...</p></div>
        ) : error ? (
          <div className="gismeteo-error"><p>⚠️ {error}</p><button onClick={handleRefresh}>Повторить</button></div>
        ) : (
          <>
            <div className="gismeteo-table">
              <div className="gismeteo-row header-row">
                {weatherData.map((day, index) => (
                  <div key={index} className="gismeteo-cell day-cell">
                    <div className="day-name">{getWeekday(day.date, index)}</div>
                    <div className="day-date">{formatDay(day.date)}</div>
                  </div>
                ))}
              </div>
              
              <div className="gismeteo-row temp-row">
                {weatherData.map((day, index) => (
                  <div key={index} className="gismeteo-cell hover-cell" onMouseEnter={(e) => handleDayHover(day, e)} onMouseLeave={handleDayLeave}>
                    <div className="temp-max">{day.tempMax || day.temp}°</div>
                    <div className="temp-min">{day.tempMin || Math.floor((day.tempMax || 20) - 6)}°</div>
                  </div>
                ))}
              </div>
              
              <div className="gismeteo-row weather-row">
                {weatherData.map((day, index) => (
                  <div key={index} className="gismeteo-cell">
                    <span className="weather-icon">{getWeatherEmoji(day.icon)}</span>
                  </div>
                ))}
              </div>
              
              <div className="gismeteo-row desc-row">
                {weatherData.map((day, index) => (
                  <div key={index} className="gismeteo-cell">
                    <span className="weather-desc">{day.description}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="gismeteo-additional">
              <div className="additional-title">🌬️ Ветер, м/с</div>
              <div className="additional-values">
                {weatherData.map((day, index) => (
                  <div key={index} className="additional-value">{day.windSpeed || 5} м/с</div>
                ))}
              </div>
            </div>
          </>
        )}
        
        <div className="gismeteo-refresh">
          <button onClick={handleRefresh} className="refresh-btn" disabled={isLoading || loading}>🔄 Обновить</button>
        </div>
      </div>
      
      {/* Тултип с почасовым прогнозом - теперь можно навести мышку */}
      {tooltipVisible && hoveredDay && hourlyForecast.length > 0 && (
        <div 
          ref={tooltipRef}
          className="hourly-tooltip"
          style={{ left: tooltipPosition.x, top: tooltipPosition.y }}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        >
          <div className="hourly-tooltip-header">
            <span className="tooltip-date">
              📅 {new Date(hoveredDay.date).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <button className="tooltip-close" onClick={handleTooltipMouseLeave}>✕</button>
          </div>
          
          {isTooltipLoading ? (
            <div className="tooltip-loading">
              <div className="tooltip-spinner"></div>
              <span>Загрузка...</span>
            </div>
          ) : (
            <>
              <div className="hourly-tooltip-grid">
                {hourlyForecast.map((hour, index) => (
                  <div key={index} className="tooltip-hour-item">
                    <div className="tooltip-hour-time">{getPartOfDayLabel(hour.partOfDay)}</div>
                    <div className="tooltip-hour-temp">
                      <span className="tooltip-temp-value">{hour.temp}°C</span>
                      <span className="tooltip-feels-like">ощущается {hour.feelsLike}°</span>
                    </div>
                    <div className="tooltip-hour-info">
                      <span className="tooltip-icon weather-icon">{getWeatherEmoji(hour.icon)}</span>
                      <span className="tooltip-desc">{hour.description}</span>
                    </div>
                    <div className="tooltip-wind">💨 {hour.windSpeed} м/с</div>
                  </div>
                ))}
              </div>
              
              <div className="tooltip-advice">
                💡 {getClothingAdvice(hoveredDay.tempMax || hoveredDay.temp || 15)}
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Кнопки внизу */}
      <div className="gismeteo-footer-buttons">
        <button onClick={goBack} className="action-button secondary">← Назад</button>
        <button onClick={() => router.push(`/citydetails/${encodeURIComponent(cityName)}`)} className="action-button">🏛️ О городе</button>
      </div>
    </div>
  );
}