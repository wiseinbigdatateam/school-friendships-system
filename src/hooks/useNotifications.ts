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
    console.log('🔔 loadNotifications 호출됨:', { 
      hasUser: !!user, 
      userId: user?.id, 
      userObject: user 
    });
    
    if (!user?.id) {
      console.log('🔔 사용자 ID가 없어 알림을 로드할 수 없음');
      setLoading(false);
      return;
    }

    try {
      console.log('🔔 알림 데이터 로드 시작:', { userId: user.id });
      setLoading(true);
      
      // 사용자별 알림 목록 조회
      console.log('🔔 NotificationService.getUserNotifications 호출...');
      const data = await NotificationService.getUserNotifications(user.id);
      console.log('🔔 getUserNotifications 결과:', { data, count: data?.length });
      
      setNotifications(data);
      
      // 읽지 않은 알림 개수 조회
      console.log('🔔 NotificationService.getUnreadCount 호출...');
      const count = await NotificationService.getUnreadCount(user.id);
      console.log('🔔 getUnreadCount 결과:', { count });
      
      setUnreadCount(count);
      
      console.log('🔔 알림 데이터 로드 완료:', { 
        userId: user.id, 
        totalCount: data.length, 
        unreadCount: count,
        notifications: data.map(n => ({ id: n.id, title: n.title, is_read: n.is_read }))
      });
    } catch (error) {
      console.error('🔔 알림 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 실시간 구독 설정
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔔 실시간 구독 설정 시작:', { userId: user.id });

    // 초기 데이터 로드
    loadNotifications();

    // 실시간 구독 설정
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔔 실시간 알림 변경:', payload);
          
          if (payload.eventType === 'INSERT') {
            // 새 알림 추가
            const newNotification = payload.new as Notification;
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
            console.log('🔔 새 알림 추가됨:', newNotification);
          } else if (payload.eventType === 'UPDATE') {
            // 알림 업데이트 (읽음 처리 등)
            const updatedNotification = payload.new as Notification;
            setNotifications(prev => 
              prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
            );
            
            // 읽지 않은 알림 개수 재계산
            if (updatedNotification.is_read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
              console.log('🔔 알림 읽음 처리됨:', updatedNotification.id);
            }
          } else if (payload.eventType === 'DELETE') {
            // 알림 삭제
            const deletedNotification = payload.old as Notification;
            setNotifications(prev => 
              prev.filter(n => n.id !== deletedNotification.id)
            );
            
            // 읽지 않은 알림 개수 재계산
            if (!deletedNotification.is_read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
              console.log('🔔 알림 삭제됨:', deletedNotification.id);
            }
          }
        }
      )
      .subscribe();

    console.log('🔔 실시간 구독 설정 완료');

    return () => {
      console.log('🔔 실시간 구독 해제');
      supabase.removeChannel(channel);
    };
  }, [user, loadNotifications]);

  // 알림 읽음 처리
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id) return false;

    try {
      console.log('🔔 알림 읽음 처리 시도:', { notificationId, userId: user.id });
      
      const success = await NotificationService.markAsRead(notificationId, user.id);
      if (success) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        console.log('🔔 알림 읽음 처리 완료:', notificationId);
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
      console.log('🔔 모든 알림 읽음 처리 시도:', { userId: user.id });
      
      const success = await NotificationService.markAllAsRead(user.id);
      if (success) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, is_read: true }))
        );
        setUnreadCount(0);
        console.log('🔔 모든 알림 읽음 처리 완료');
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
      console.log('🔔 알림 삭제 시도:', { notificationId, userId: user.id });
      
      const success = await NotificationService.deleteNotification(notificationId, user.id);
      if (success) {
        const notification = notifications.find(n => n.id === notificationId);
        setNotifications(prev => 
          prev.filter(n => n.id !== notificationId)
        );
        
        // 읽지 않은 알림 개수 재계산
        if (notification && !notification.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        
        console.log('🔔 알림 삭제 완료:', notificationId);
      }
      return success;
    } catch (error) {
      console.error('🔔 알림 삭제 오류:', error);
      return false;
    }
  }, [user?.id, notifications]);



  // 최근 알림 조회 (헤더용)
  const getRecentNotifications = useCallback(async (limit: number = 5) => {
    if (!user?.id) return [];

    try {
      console.log('🔔 최근 알림 조회:', { userId: user.id, limit });
      
      const recentNotifications = await NotificationService.getRecentNotifications(user.id, limit);
      console.log('🔔 최근 알림 조회 완료:', { count: recentNotifications.length });
      
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
    getRecentNotifications,
    refresh: loadNotifications
  };
};
