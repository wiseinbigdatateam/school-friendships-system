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
      // TODO: 실제 API 엔드포인트로 전송
      
      // 임시로 성공 응답 반환
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return true;
    } catch (error) {
      console.error('Contact form submission error:', error);
      return false;
    }
  }
};