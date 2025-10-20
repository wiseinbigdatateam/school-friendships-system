import { supabase } from '../lib/supabase';
import { emailService } from './emailService';

export interface ContactFormData {
  name: string;
  email: string;
  institution: string;
  role: string;
  message: string;
  phone: string;
}

export const contactService = {
  async submitContactForm(data: ContactFormData): Promise<boolean> {
    try {
      // 1. Supabase contact_inquiries 테이블에 저장
      const { data: insertedData, error: dbError } = await supabase
        .from('contact_inquiries')
        .insert([{
          name: data.name,
          email: data.email,
          institution: data.institution,
          role: data.role || null,
          phone: data.phone || null,
          message: data.message,
          status: 'pending',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      // 2. 관리자에게 이메일 알림 전송
      try {
        await emailService.sendEmail({
          to: 'jinseong-kim@wiseinc.co.kr',
          subject: `[와이즈온스쿨 체험 신청] ${data.name} - ${data.institution}`,
          content: `
<div style="font-family: 'Noto Sans KR', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <h2 style="color: #3F80EA; margin-bottom: 20px; font-size: 24px; border-bottom: 3px solid #3F80EA; padding-bottom: 10px;">
      🎓 새로운 체험 신청
    </h2>
    
    <div style="margin-bottom: 30px;">
      <p style="color: #6b7280; margin-bottom: 20px;">새로운 체험 신청이 접수되었습니다.</p>
    </div>

    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <h3 style="color: #374151; margin-bottom: 15px; font-size: 18px;">📋 신청자 정보</h3>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; color: #6b7280; font-weight: 600; width: 100px;">이름</td>
          <td style="padding: 10px 0; color: #111827;">${data.name}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">이메일</td>
          <td style="padding: 10px 0; color: #111827;">${data.email}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">소속</td>
          <td style="padding: 10px 0; color: #111827;">${data.institution}</td>
        </tr>
        ${data.role ? `
        <tr>
          <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">직책</td>
          <td style="padding: 10px 0; color: #111827;">${data.role}</td>
        </tr>
        ` : ''}
        ${data.phone ? `
        <tr>
          <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">연락처</td>
          <td style="padding: 10px 0; color: #111827;">${data.phone}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div style="background-color: #eff6ff; border-left: 4px solid #3F80EA; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <h3 style="color: #374151; margin-bottom: 10px; font-size: 18px;">💬 문의 내용</h3>
      <p style="color: #111827; line-height: 1.6; white-space: pre-wrap;">${data.message}</p>
    </div>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; line-height: 1.5;">
        이 알림은 와이즈온스쿨 체험 신청 시스템에서 자동으로 발송되었습니다.<br>
        신청 일시: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}<br>
        신청 ID: ${insertedData?.id || 'N/A'}
      </p>
    </div>
  </div>
</div>
          `
        });
      } catch (emailError) {
        // 이메일 전송 실패해도 데이터베이스 저장은 성공이므로 경고만 출력
        console.warn('이메일 알림 전송 실패:', emailError);
      }

      return true;
    } catch (error) {
      console.error('Contact form submission error:', error);
      throw error;
    }
  }
};