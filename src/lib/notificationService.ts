import { supabase } from './supabase';

export interface Notification {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean | null;
  category: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// 알림 생성
export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  category: string = '일반'
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        category,
        is_read: false
      });

    if (error) {
      console.error('알림 생성 오류:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('알림 생성 오류:', error);
    return false;
  }
};

// 사용자별 알림 조회
export const fetchUserNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('알림 조회 오류:', error);
      return [];
    }

    return (data || []).map(item => ({
      ...item,
      type: item.type as 'info' | 'success' | 'warning' | 'error'
    }));
  } catch (error) {
    console.error('알림 조회 오류:', error);
    return [];
  }
};

// 알림 읽음 처리
export const markNotificationAsRead = async (notificationId: string, userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      console.error('읽음 처리 오류:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('읽음 처리 오류:', error);
    return false;
  }
};

// 모든 알림 읽음 처리
export const markAllNotificationsAsRead = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('모든 읽음 처리 오류:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('모든 읽음 처리 오류:', error);
    return false;
  }
};

// 알림 삭제
export const deleteNotification = async (notificationId: string, userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      console.error('알림 삭제 오류:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('알림 삭제 오류:', error);
    return false;
  }
};

// 설문 관련 알림 생성
export const createSurveyNotification = async (
  userId: string,
  surveyTitle: string,
  action: 'created' | 'updated' | 'deleted' | 'completed'
): Promise<boolean> => {
  const messages = {
    created: '새로운 설문이 생성되었습니다.',
    updated: '설문이 업데이트되었습니다.',
    deleted: '설문이 삭제되었습니다.',
    completed: '설문 응답이 완료되었습니다.'
  };

  const types = {
    created: 'success' as const,
    updated: 'info' as const,
    deleted: 'warning' as const,
    completed: 'success' as const
  };

  return createNotification(
    userId,
    `설문 ${action === 'created' ? '생성' : action === 'updated' ? '업데이트' : action === 'deleted' ? '삭제' : '완료'}`,
    `${surveyTitle}: ${messages[action]}`,
    types[action],
    '설문'
  );
};

// 네트워크 분석 관련 알림 생성
export const createNetworkAnalysisNotification = async (
  userId: string,
  analysisType: string
): Promise<boolean> => {
  return createNotification(
    userId,
    '네트워크 분석 완료',
    `${analysisType} 분석이 완료되었습니다.`,
    'success',
    '분석'
  );
};

// 시스템 알림 생성
export const createSystemNotification = async (
  userId: string,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info'
): Promise<boolean> => {
  return createNotification(userId, title, message, type, '시스템');
};
