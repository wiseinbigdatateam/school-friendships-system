import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Notification, NotificationService } from '../services/notificationService';

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // 알림 데이터 로드
  const loadNotifications = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // 사용자별 알림 목록 조회
      const data = await NotificationService.getUserNotifications(user.id);
      setNotifications(data);
      
      // 읽지 않은 알림 개수 조회
      const count = await NotificationService.getUnreadCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('🔔 알림 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 실시간 구독 설정
  useEffect(() => {
    if (!user?.id) return;

    // 초기 데이터 로드
    loadNotifications();

    // 실시간 구독 설정
    const channel = supabase
      .channel(`notifications-${user.id}`) // 사용자별 고유 채널명
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // 새 알림 추가
            const newNotification = payload.new as Notification;
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
          } else if (payload.eventType === 'UPDATE') {
            // 알림 업데이트 (읽음 처리 등)
            const updatedNotification = payload.new as Notification;
            const oldNotification = payload.old as Notification;
            
            setNotifications(prev => 
              prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
            );
            
            // 읽지 않음 → 읽음으로 변경된 경우에만 개수 감소
            if (!oldNotification.is_read && updatedNotification.is_read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          } else if (payload.eventType === 'DELETE') {
            // 알림 삭제
            const deletedNotification = payload.old as Notification;
            
            setNotifications(prev => 
              prev.filter(n => n.id !== deletedNotification.id)
            );
            
            // 읽지 않은 알림이었다면 개수 감소
            if (!deletedNotification.is_read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]); // loadNotifications 의존성 제거

  // 알림 읽음 처리
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id) return false;

    try {
      const success = await NotificationService.markAsRead(notificationId, user.id);
      if (success) {
        // 로컬 상태 업데이트 - prev를 사용하여 최신 상태 접근
        setNotifications(prev => {
          const notification = prev.find(n => n.id === notificationId);
          const wasUnread = notification && !notification.is_read;
          
          // 읽지 않은 알림이었다면 개수 감소
          if (wasUnread) {
            setUnreadCount(count => Math.max(0, count - 1));
          }
          
          return prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n);
        });
      }
      return success;
    } catch (error) {
      console.error('🔔 읽음 처리 오류:', error);
      return false;
    }
  }, [user?.id]);

  // 모든 알림 읽음 처리
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return false;

    try {
      const success = await NotificationService.markAllAsRead(user.id);
      if (success) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, is_read: true }))
        );
        setUnreadCount(0);
      }
      return success;
    } catch (error) {
      console.error('🔔 전체 읽음 처리 오류:', error);
      return false;
    }
  }, [user?.id]);

  // 알림 삭제
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user?.id) return false;

    try {
      const success = await NotificationService.deleteNotification(notificationId, user.id);
      if (success) {
        // 로컬 상태 업데이트 - prev를 사용하여 최신 상태 접근
        setNotifications(prev => {
          const notification = prev.find(n => n.id === notificationId);
          
          // 읽지 않은 알림이었다면 개수 감소
          if (notification && !notification.is_read) {
            setUnreadCount(count => Math.max(0, count - 1));
          }
          
          return prev.filter(n => n.id !== notificationId);
        });
      }
      return success;
    } catch (error) {
      console.error('🔔 알림 삭제 오류:', error);
      return false;
    }
  }, [user?.id]);

  // 여러 알림 일괄 읽음 처리
  const markMultipleAsRead = useCallback(async (notificationIds: string[]) => {
    if (!user?.id) return false;

    try {
      await NotificationService.markMultipleAsRead(notificationIds);
      
      // 로컬 상태 업데이트 - prev를 사용하여 최신 상태 접근
      setNotifications(prev => {
        // 읽지 않은 알림만 필터링하여 개수 계산
        const unreadNotificationsToUpdate = prev.filter(n => 
          notificationIds.includes(n.id) && !n.is_read
        );
        
        // 읽지 않은 알림 개수 정확히 감소
        if (unreadNotificationsToUpdate.length > 0) {
          setUnreadCount(count => Math.max(0, count - unreadNotificationsToUpdate.length));
        }
        
        return prev.map(n => 
          notificationIds.includes(n.id) 
            ? { ...n, is_read: true }
            : n
        );
      });
      
      return true;
    } catch (error) {
      console.error('🔔 일괄 읽음 처리 오류:', error);
      return false;
    }
  }, [user?.id]);

  // 여러 알림 일괄 삭제
  const deleteMultipleNotifications = useCallback(async (notificationIds: string[]) => {
    if (!user?.id) return false;

    try {
      await NotificationService.deleteMultipleNotifications(notificationIds);
      
      // 로컬 상태 업데이트 - prev를 사용하여 최신 상태 접근
      setNotifications(prev => {
        // 삭제될 알림 중 읽지 않은 알림만 필터링하여 개수 계산
        const deletedUnreadNotifications = prev.filter(n => 
          notificationIds.includes(n.id) && !n.is_read
        );
        
        // 삭제된 읽지 않은 알림 개수만큼 unreadCount 감소
        if (deletedUnreadNotifications.length > 0) {
          setUnreadCount(count => Math.max(0, count - deletedUnreadNotifications.length));
        }
        
        return prev.filter(n => !notificationIds.includes(n.id));
      });
      
      return true;
    } catch (error) {
      console.error('🔔 일괄 삭제 오류:', error);
      return false;
    }
  }, [user?.id]);

  // 최근 알림 조회 (헤더용)
  const getRecentNotifications = useCallback(async (limit: number = 5) => {
    if (!user?.id) return [];

    try {
      const recentNotifications = await NotificationService.getRecentNotifications(user.id, limit);
      return recentNotifications;
    } catch (error) {
      console.error('🔔 최근 알림 조회 오류:', error);
      return [];
    }
  }, [user?.id]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    markMultipleAsRead,
    deleteMultipleNotifications,
    getRecentNotifications,
    refresh: loadNotifications
  };
};
