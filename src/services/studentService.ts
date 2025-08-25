import { supabase, Tables } from '../lib/supabase';

export type StudentWithAnalysis = Tables<'students'> & {
  network_analysis_results?: Tables<'network_analysis_results'>[];
  teacher_memos?: Tables<'teacher_memos'>[];
  intervention_logs?: Tables<'intervention_logs'>[];
};

export class StudentService {
  // 모든 학생 조회
  static async getAllStudents(schoolId: string): Promise<StudentWithAnalysis[]> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          network_analysis_results!student_id(*),
          teacher_memos!student_id(*),
          intervention_logs!student_id(*)
        `)
        .eq('current_school_id', schoolId)
        .eq('is_active', true)
        .order('grade', { ascending: true })
        .order('class', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching students:', error);
        throw error;
      }

      return data as StudentWithAnalysis[];
    } catch (error) {
      console.error('StudentService.getAllStudents error:', error);
      throw error;
    }
  }

  // 학생 상세 정보 조회
  static async getStudentById(studentId: string): Promise<StudentWithAnalysis | null> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          network_analysis_results!student_id(*),
          teacher_memos!student_id(*),
          intervention_logs!student_id(*)
        `)
        .eq('id', studentId)
        .single();

      if (error) {
        console.error('Error fetching student:', error);
        throw error;
      }

      return data as StudentWithAnalysis;
    } catch (error) {
      console.error('StudentService.getStudentById error:', error);
      throw error;
    }
  }

  // 학년/반별 학생 조회
  static async getStudentsByGradeAndClass(
    schoolId: string,
    grade?: string,
    className?: string
  ): Promise<StudentWithAnalysis[]> {
    try {
      let query = supabase
        .from('students')
        .select(`
          *,
          network_analysis_results!student_id(*),
          teacher_memos!student_id(*),
          intervention_logs!student_id(*)
        `)
        .eq('current_school_id', schoolId)
        .eq('is_active', true);

      if (grade) {
        query = query.eq('grade', grade);
      }

      if (className) {
        query = query.eq('class', className);
      }

      const { data, error } = await query
        .order('grade', { ascending: true })
        .order('class', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching students by grade/class:', error);
        throw error;
      }

      return data as StudentWithAnalysis[];
    } catch (error) {
      console.error('StudentService.getStudentsByGradeAndClass error:', error);
      throw error;
    }
  }

  // 위험군 학생 조회
  static async getHighRiskStudents(schoolId: string): Promise<StudentWithAnalysis[]> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          network_analysis_results!student_id(*)
        `)
        .eq('current_school_id', schoolId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching high risk students:', error);
        throw error;
      }

      // 클라이언트 사이드에서 위험군 필터링
      const highRiskStudents = data?.filter(student => {
        const analysis = (student as any).network_analysis_results?.[0];
        if (!analysis) return false;
        
        const riskIndicators = analysis.risk_indicators as any;
        return riskIndicators?.isolation_risk === 'high' || riskIndicators?.isolation_risk === 'medium';
      });

      return highRiskStudents as StudentWithAnalysis[] || [];
    } catch (error) {
      console.error('StudentService.getHighRiskStudents error:', error);
      throw error;
    }
  }

  // 학생 검색
  static async searchStudents(
    schoolId: string,
    searchTerm: string
  ): Promise<StudentWithAnalysis[]> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          network_analysis_results!student_id(*),
          teacher_memos!student_id(*),
          intervention_logs!student_id(*)
        `)
        .eq('current_school_id', schoolId)
        .eq('is_active', true)
        .or(`name.ilike.%${searchTerm}%,student_number.ilike.%${searchTerm}%`)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error searching students:', error);
        throw error;
      }

      return data as StudentWithAnalysis[];
    } catch (error) {
      console.error('StudentService.searchStudents error:', error);
      throw error;
    }
  }

  // 교사 메모 추가
  static async addTeacherMemo(
    studentId: string,
    teacherId: string,
    content: string,
    memoType: 'observation' | 'intervention' | 'follow_up' | 'general',
    visibility: 'private' | 'shared' | 'confidential' = 'private'
  ): Promise<Tables<'teacher_memos'> | null> {
    try {
      const { data, error } = await supabase
        .from('teacher_memos')
        .insert({
          student_id: studentId,
          teacher_id: teacherId,
          content: content,
          memo_type: memoType,
          visibility: visibility
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding teacher memo:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('StudentService.addTeacherMemo error:', error);
      throw error;
    }
  }

  // 개입 로그 추가
  static async addInterventionLog(
    studentId: string,
    teacherId: string,
    interventionType: string,
    description: string,
    outcome?: string,
    effectivenessScore?: number,
    followUpRequired?: boolean,
    followUpDate?: string
  ): Promise<Tables<'intervention_logs'> | null> {
    try {
      const { data, error } = await supabase
        .from('intervention_logs')
        .insert({
          student_id: studentId,
          teacher_id: teacherId,
          intervention_type: interventionType,
          description: description,
          outcome: outcome,
          effectiveness_score: effectivenessScore,
          follow_up_required: followUpRequired,
          follow_up_date: followUpDate
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding intervention log:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('StudentService.addInterventionLog error:', error);
      throw error;
    }
  }
}