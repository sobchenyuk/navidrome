import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { FIX_ENCODING, GET_ENCODING_STATUS, INDEX_TRACKS } from './graphql/queries';

export const useEncoding = () => {
  const [isFixing, setIsFixing] = useState(false);
  const [showCompleteNotification, setShowCompleteNotification] = useState(false);
  const [showNoFilesNotification, setShowNoFilesNotification] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [currentStatus, setCurrentStatus] = useState(null); // Локальное состояние
  const [userInitiated, setUserInitiated] = useState(false); // Показывать уведомления только после действия пользователя

  // GraphQL мутация для запуска исправления
  const [fixEncodingMutation] = useMutation(FIX_ENCODING, {
    errorPolicy: 'all',
  });
  
  // GraphQL мутация для индексации
  const [indexTracksMutation] = useMutation(INDEX_TRACKS, {
    errorPolicy: 'all',
  });

  // GraphQL запрос для получения статуса (для polling)
  const { data: statusData, refetch: refetchStatus } = useQuery(GET_ENCODING_STATUS, {
    errorPolicy: 'all',
    skip: true, // Не выполняем автоматически, только через refetch
  });

  const encodingStatus = statusData?.encodingTaskStatus;

  // Функция polling'а
  const pollStatus = useCallback(async () => {
    try {
      console.log('🔄 Polling status...');
      const result = await refetchStatus();
      console.log('Polling result:', result.data);
      
      // Обновляем локальное состояние
      if (result.data?.encodingTaskStatus) {
        setCurrentStatus(result.data.encodingTaskStatus);
      } else {
        setCurrentStatus(null);
      }
    } catch (error) {
      console.error('Error polling encoding status:', error);
    }
  }, [refetchStatus]);

  // Запуск polling'а
  const startPolling = useCallback(() => {
    if (pollingInterval) return; // Уже запущен

    const interval = setInterval(pollStatus, 3000); // Каждые 3 секунды
    setPollingInterval(interval);
  }, [pollStatus, pollingInterval]);

  // Остановка polling'а
  const stopPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [pollingInterval]);

  // Cleanup при размонтировании компонента
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // Обработка изменений статуса
  useEffect(() => {
    console.log('Encoding status changed:', currentStatus, 'userInitiated:', userInitiated);
    
    if (!currentStatus) {
      setIsFixing(false);
      stopPolling();
      return;
    }

    const { status, found, processed } = currentStatus;
    console.log('Processing status:', status);

    if (status === 'running') {
      setIsFixing(true);
      setShowNoFilesNotification(false); // Сбрасываем предыдущие уведомления
      setShowCompleteNotification(false);
      startPolling();
    } else if (status === 'completed' && userInitiated) {
      setIsFixing(false);
      setShowCompleteNotification(true);
      setShowNoFilesNotification(false);
      stopPolling();
      setUserInitiated(false); // Сбрасываем флаг
      
      // Автоматически запускаем индексацию
      if (processed > 0) {
        console.log('🔄 Auto-starting reindexing after encoding fix...');
        setTimeout(async () => {
          try {
            await indexTracksMutation();
            console.log('✅ Auto-reindexing completed');
            // Обновляем страницу чтобы показать новые пути
            window.location.reload();
          } catch (error) {
            console.error('❌ Auto-reindexing failed:', error);
            // Обновляем страницу в любом случае
            window.location.reload();
          }
        }, 2000); // Обновляем через 2 секунды после уведомления
      } else {
        // Обновляем страницу если ничего не было исправлено
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
      
      // Скрываем уведомление через 3 секунды
      setTimeout(() => {
        setShowCompleteNotification(false);
      }, 3000);
    } else if (status === 'no_files' && userInitiated) {
      console.log('Setting showNoFilesNotification to true');
      setIsFixing(false);
      setShowNoFilesNotification(true);
      setShowCompleteNotification(false);
      stopPolling();
      setUserInitiated(false); // Сбрасываем флаг
      
      // Скрываем уведомление через 3 секунды
      setTimeout(() => {
        setShowNoFilesNotification(false);
      }, 3000);
    } else {
      setIsFixing(false);
      stopPolling();
    }
  }, [currentStatus, userInitiated, startPolling, stopPolling]);

  // Запуск исправления кодировки
  const startEncodingFix = useCallback(async () => {
    try {
      console.log('🔄 Starting encoding fix...');
      setIsFixing(true);
      setUserInitiated(true); // Отмечаем что пользователь инициировал действие
      
      const result = await fixEncodingMutation();
      
      if (result.data?.fixEncoding) {
        console.log('✅ Encoding fix started successfully');
        
        // Начинаем polling для отслеживания прогресса
        startPolling();
        
        // Делаем первый запрос статуса сразу и через небольшую задержку
        await pollStatus();
        setTimeout(pollStatus, 1000);
        
        return true;
      } else {
        console.error('❌ Failed to start encoding fix');
        setIsFixing(false);
        setUserInitiated(false);
        return false;
      }
    } catch (error) {
      console.error('❌ Error starting encoding fix:', error);
      setIsFixing(false);
      setUserInitiated(false);
      return false;
    }
  }, [fixEncodingMutation, startPolling, pollStatus]);

  // Проверяем статус при инициализации (для восстановления после перезагрузки)
  useEffect(() => {
    pollStatus();
  }, [pollStatus]);

  return {
    // Состояние
    isFixing,
    encodingStatus: currentStatus || { found: 0, processed: 0, status: 'none' },
    showCompleteNotification,
    showNoFilesNotification,
    
    // Действия
    startEncodingFix,
    
    // Внутренние методы (для отладки)
    pollStatus,
    startPolling,
    stopPolling,
  };
};
