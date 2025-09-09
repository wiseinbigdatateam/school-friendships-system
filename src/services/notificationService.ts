import { supabase } from '../lib/supabase';

export interface Notification {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: string | null;
  is_read: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateNotificationData {
  user_id: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  category?: string;
}

export class NotificationService {
  /**
   * 특정 사용자의 알림 목록 조회
   */
  static async getUserNotifications(userId: string): Promise<Notification[]> {
    try {

      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {

        return [];
      }

      // Supabase에서 반환되는 데이터의 type을 올바른 타입으로 변환
      const typedNotifications: Notification[] = (data || []).map(item => ({
        ...item,
        type: item.type as 'info' | 'success' | 'warning' | 'error'
      }));


      return typedNotifications;
    } catch (error) {

      return [];
    }
  }

  /**
   * 특정 사용자의 읽지 않은 알림 개수 조회
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {

      
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {

        return 0;
      }


      return count || 0;
    } catch (error) {

      return 0;
    }
  }

  /**
   * 특정 사용자의 최근 알림 조회 (헤더용)
   */
  static async getRecentNotifications(userId: string, limit: number = 5): Promise<Notification[]> {
    try {

      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {

        return [];
      }

      const typedNotifications: Notification[] = (data || []).map(item => ({
        ...item,
        type: item.type as 'info' | 'success' | 'warning' | 'error'
      }));



      return typedNotifications;
    } catch (error) {

      return [];
    }
  }

  /**
   * 알림 생성
   */
  static async createNotification(data: CreateNotificationData): Promise<Notification | null> {
    try {

      
      const { data: notification, error } = await supabase
        .from('notifications')
        .insert({
          user_id: data.user_id,
          title: data.title,
          message: data.message,
          type: data.type || 'info',
          category: data.category || '일반',
          is_read: false
        })
        .select()
        .single();

      if (error) {

        return null;
      }

      // Supabase에서 반환되는 데이터의 type을 올바른 타입으로 변환
      const typedNotification: Notification = {
        ...notification,
        type: notification.type as 'info' | 'success' | 'warning' | 'error'
      };


      return typedNotification;
    } catch (error) {

      return null;
    }
  }

  /**
   * 여러 사용자에게 동시에 알림 생성
   */
  static async createNotificationsForUsers(
    userIds: string[],
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    category: string = '일반'
  ): Promise<Notification[]> {
    try {

      
      const notifications = userIds.map(userId => ({
        user_id: userId,
        title,
        message,
        type,
        category,
        is_read: false
      }));

      const { data, error } = await supabase
        .from('notifications')
        .insert(notifications)
        .select();

      if (error) {

        return [];
      }

      // Supabase에서 반환되는 데이터의 type을 올바른 타입으로 변환
      const typedNotifications: Notification[] = (data || []).map(item => ({
        ...item,
        type: item.type as 'info' | 'success' | 'warning' | 'error'
      }));


      return typedNotifications;
    } catch (error) {

      return [];
    }
  }

  /**
   * 알림을 읽음으로 표시
   */
  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {

      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {

        return false;
      }


      return true;
    } catch (error) {

      return false;
    }
  }

  /**
   * 모든 알림을 읽음으로 표시
   */
  static async markAllAsRead(userId: string): Promise<boolean> {
    try {

      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {

        return false;
      }


      return true;
    } catch (error) {

      return false;
    }
  }

  /**
   * 알림 삭제
   */
  static async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {

      
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {

        return false;
      }


      return true;
    } catch (error) {

      return false;
    }
  }

  /**
   * 시스템 알림 생성 (설문 완료, 학생 관찰 등)
   */
  static async createSystemNotification(
    userId: string,
    event: string,
    details: any,
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ): Promise<Notification | null> {
    let title = '';
    let message = '';
    let category = '';

    switch (event) {
      case 'survey_completed':
        title = '설문 완료 알림';
        message = `"${details.surveyTitle}" 설문이 완료되었습니다.`;
        category = '설문';
        break;
      
      case 'student_observation':
        title = '학생 관찰 알림';
        message = `${details.studentName} 학생의 관찰 상태가 변경되었습니다.`;
        category = '학생 관리';
        break;
      
      case 'network_analysis_completed':
        title = '네트워크 분석 완료';
        message = `${details.surveyTitle} 설문의 네트워크 분석이 완료되었습니다.`;
        category = '분석';
        break;
      
      case 'high_risk_student':
        title = '고위험 학생 알림';
        message = `${details.studentName} 학생이 고위험 그룹으로 분류되었습니다.`;
        category = '위험 관리';
        type = 'warning';
        break;
      
      case 'intervention_required':
        title = '개입 필요 알림';
        message = `${details.studentName} 학생에 대한 개입이 필요합니다.`;
        category = '개입 관리';
        type = 'warning';
        break;
      
      default:
        title = '시스템 알림';
        message = details.message || '새로운 알림이 있습니다.';
        category = '시스템';
    }

    return this.createNotification({
      user_id: userId,
      title,
      message,
      type,
      category
    });
  }

  /**
   * 권한별 알림 생성 (학년부장, 학교 관리자 등)
   */
  static async createRoleBasedNotification(
    role: string,
    schoolId: string,
    event: string,
    details: any
  ): Promise<void> {
    try {

      
      // 해당 권한을 가진 사용자들 조회 (role 필드 포함)
      let { data: users, error } = await supabase
        .from('users')
        .select('id, role')
        .eq('school_id', schoolId);

      if (error || !users) {

        return;
      }

      // 권한별 필터링
      let targetUsers = users;
      if (role === 'grade_teacher') {
        targetUsers = users.filter(user => 
          ['grade_teacher', 'school_admin', 'district_admin'].includes(user.role)
        );
      } else if (role === 'school_admin') {
        targetUsers = users.filter(user => 
          ['school_admin', 'district_admin'].includes(user.role)
        );
      }

      // 알림 생성
      if (targetUsers.length > 0) {
        const userIds = targetUsers.map(user => user.id);
        await this.createNotificationsForUsers(
          userIds,
          details.title,
          details.message,
          details.type || 'info',
          details.category || '시스템'
        );

      }
    } catch (error) {

    }
  }

  /**
   * 설문 마감 임박 알림 생성
   */
  static async createSurveyDeadlineNotifications(schoolId: string): Promise<void> {
    try {

      
      // 마감일이 3일 이내인 설문 조회
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      
      const { data: surveys, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .lte('end_date', threeDaysFromNow.toISOString())
        .gte('end_date', new Date().toISOString());

      if (error) {

        return;
      }

      if (!surveys || surveys.length === 0) {

        return;
      }



      // 각 설문에 대해 담당 교사들에게 알림 생성
      for (const survey of surveys) {
        if (survey.created_by) {
          // 설문 생성자에게 알림
          await this.createNotification({
            user_id: survey.created_by,
            title: '설문 마감 임박',
            message: `"${survey.title}" 설문이 ${new Date(survey.end_date).toLocaleDateString()}에 마감됩니다.`,
            type: 'warning',
            category: '마감'
          });
        }

        // 권한별 알림 생성 (학년부장, 학교 관리자 등)
        await this.createRoleBasedNotification(
          'grade_teacher',
          schoolId,
          'survey_deadline_approaching',
          {
            title: '설문 마감 임박',
            message: `"${survey.title}" 설문이 ${new Date(survey.end_date).toLocaleDateString()}에 마감됩니다.`,
            type: 'warning',
            category: '마감'
          }
        );
      }


    } catch (error) {

    }
  }

  /**
   * 정기적인 알림 생성 (크론 작업용)
   */
  static async createScheduledNotifications(schoolId: string): Promise<void> {
    try {

      
      // 1. 설문 마감 임박 알림
      await this.createSurveyDeadlineNotifications(schoolId);
      
      // 2. 응답률 낮은 설문 알림
      await this.createLowResponseRateNotifications(schoolId);
      
      // 3. 고위험 학생 주기적 감지 및 알림 생성
      await this.createHighRiskStudentNotifications(schoolId);
      

    } catch (error) {

    }
  }

  /**
   * 참여율 낮은 설문 알림 생성
   */
  static async createLowResponseRateNotifications(schoolId: string): Promise<void> {
    try {

      
      // 진행 중인 설문 중 참여율이 50% 미만인 설문 조회
      const { data: surveys, error } = await supabase
        .from('surveys')
        .select(`
          *,
          survey_responses(count)
        `)
        .eq('school_id', schoolId)
        .eq('status', 'active');

      if (error) {

        return;
      }

      if (!surveys || surveys.length === 0) return;

      // 참여율이 낮은 설문 필터링
      const lowResponseSurveys = surveys.filter(survey => {
        const responseCount = (survey as any).survey_responses?.[0]?.count || 0;
        // 대상 학생 수는 설문의 target_grades와 target_classes로 추정
        const estimatedTargetStudents = 30; // 예시 값
        const responseRate = (responseCount / estimatedTargetStudents) * 100;
        return responseRate < 50;
      });

      if (lowResponseSurveys.length === 0) return;



      // 각 설문에 대해 알림 생성
      for (const survey of lowResponseSurveys) {
        if (survey.created_by) {
          await this.createNotification({
            user_id: survey.created_by,
            title: '설문 참여율 낮음',
            message: `"${survey.title}" 설문의 참여율이 낮습니다. 학생들에게 독려가 필요합니다.`,
            type: 'warning',
            category: '참여율'
          });
        }
      }


    } catch (error) {

    }
  }

  /**
   * 기존 고위험 학생 알림 존재 여부 확인
   */
  static async checkExistingHighRiskNotification(schoolId: string): Promise<boolean> {
    try {
      // 최근 30일 내에 생성된 고위험 학생 알림이 있는지 확인
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('category', '위험 관리')
        .ilike('title', '%고위험 학생%')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .limit(1);

      if (error) {

        return false;
      }

      return data && data.length > 0;
    } catch (error) {

      return false;
    }
  }

  /**
   * 고위험 학생 주기적 감지 및 알림 생성
   */
  static async createHighRiskStudentNotifications(schoolId: string): Promise<void> {
    try {

      
      // 네트워크 분석 결과에서 고위험 학생 조회
      const { data: analysisResults, error } = await supabase
        .from('network_analysis_results')
        .select('*')
        .eq('analysis_type', 'complete_network_analysis')
        .order('calculated_at', { ascending: false })
        .limit(1);

      if (error) {

        return;
      }

      if (!analysisResults || analysisResults.length === 0) {

        return;
      }

      const latestAnalysis = analysisResults[0];
      const recommendations = latestAnalysis.recommendations as any;
      const completeData = recommendations?.complete_analysis_data;

      if (!completeData?.nodes) {

        return;
      }

      // 고위험 학생 감지 (중심성 < 0.3)
      const highRiskStudents = completeData.nodes.filter((node: any) => {
        const centrality = node.centrality || 0;
        return centrality < 0.3;
      });

      if (highRiskStudents.length === 0) {

        return;
      }



      // 이미 고위험 학생 알림이 존재하는지 확인 (중복 알림 방지)
      const hasExistingNotification = await this.checkExistingHighRiskNotification(schoolId);
      if (hasExistingNotification) {

        return;
      }

      // 권한별 알림 생성
      await this.createRoleBasedNotification(
        'grade_teacher',
        schoolId,
        'high_risk_students_detected',
        {
          title: '고위험 학생 주기적 감지',
          message: `${highRiskStudents.length}명의 고위험 학생이 감지되었습니다. 정기 점검이 필요합니다.`,
          type: 'warning',
          category: '위험 관리'
        }
      );

      await this.createRoleBasedNotification(
        'school_admin',
        schoolId,
        'high_risk_students_detected',
        {
          title: '고위험 학생 주기적 감지',
          message: `${highRiskStudents.length}명의 고위험 학생이 감지되었습니다. 학교 차원의 개입이 필요합니다.`,
          type: 'warning',
          category: '위험 관리'
        }
      );

      // 마지막 알림 시간은 기존 알림 테이블에서 자동으로 확인됨


    } catch (error) {

    }
  }


}

export default NotificationService;
