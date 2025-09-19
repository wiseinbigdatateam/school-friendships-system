import { supabase } from '../lib/supabase';

export interface ContactFormData {
  name: string;
  email: string;
  institution: string;
  role: string;
  message: string;
  phone?: string;
}

export interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  institution: string | null;
  role: string | null;
  phone: string | null;
  message: string;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

class ContactService {
  /**
   * 문의 제출
   */
  async submitInquiry(formData: ContactFormData): Promise<ContactInquiry> {
    try {
      const { data, error } = await supabase
        .from('contact_inquiries')
        .insert([
          {
            name: formData.name,
            email: formData.email,
            institution: formData.institution,
            role: formData.role || null,
            phone: formData.phone || null,
            message: formData.message,
            status: 'pending'
          }
        ])
        .select('id, name, email, institution, role, phone, message, status, created_at, updated_at')
        .single();

      if (error) {
        console.error('문의 제출 오류:', error);
        throw new Error(`문의 제출에 실패했습니다: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('문의 서비스 오류:', error);
      throw error;
    }
  }

  /**
   * 모든 문의 조회 (관리자용)
   */
  async getAllInquiries(): Promise<ContactInquiry[]> {
    try {
      const { data, error } = await supabase
        .from('contact_inquiries')
        .select('id, name, email, institution, role, phone, message, status, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('문의 조회 오류:', error);
        throw new Error(`문의 조회에 실패했습니다: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('문의 서비스 오류:', error);
      throw error;
    }
  }

  /**
   * 문의 상태 업데이트 (관리자용)
   */
  async updateInquiryStatus(id: string, status: ContactInquiry['status']): Promise<ContactInquiry> {
    try {
      const { data, error } = await supabase
        .from('contact_inquiries')
        .update({ status })
        .eq('id', id)
        .select('id, name, email, institution, role, phone, message, status, created_at, updated_at')
        .single();

      if (error) {
        console.error('문의 상태 업데이트 오류:', error);
        throw new Error(`문의 상태 업데이트에 실패했습니다: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('문의 서비스 오류:', error);
      throw error;
    }
  }

  /**
   * 특정 문의 조회
   */
  async getInquiryById(id: string): Promise<ContactInquiry | null> {
    try {
      const { data, error } = await supabase
        .from('contact_inquiries')
        .select('id, name, email, institution, role, phone, message, status, created_at, updated_at')
        .eq('id', id)
        .single();

      if (error) {
        console.error('문의 조회 오류:', error);
        throw new Error(`문의 조회에 실패했습니다: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('문의 서비스 오류:', error);
      throw error;
    }
  }

  /**
   * 이메일로 문의 조회
   */
  async getInquiriesByEmail(email: string): Promise<ContactInquiry[]> {
    try {
      const { data, error } = await supabase
        .from('contact_inquiries')
        .select('id, name, email, institution, role, phone, message, status, created_at, updated_at')
        .eq('email', email)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('문의 조회 오류:', error);
        throw new Error(`문의 조회에 실패했습니다: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('문의 서비스 오류:', error);
      throw error;
    }
  }
}

export const contactService = new ContactService();
