import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 설정
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tailwind CSS 클래스 병합 유틸리티
export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

// 날짜 포맷팅 유틸리티
export const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatDateTime = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatRelativeTime = (date: Date | string): string => {
  const d = new Date(date);
  const now = new Date();
  const diffInMs = now.getTime() - d.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return '방금 전';
  if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  if (diffInDays < 7) return `${diffInDays}일 전`;
  
  return formatDate(d);
};

// 응답률 계산
export const calculateResponseRate = (completed: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

// 네트워크 분석 유틸리티
export const calculateCentrality = (nodeId: string, edges: Array<{ source: string; target: string }>): number => {
  const connections = edges.filter(edge => 
    edge.source === nodeId || edge.target === nodeId
  ).length;
  return connections;
};

export const findIsolatedNodes = (nodes: string[], edges: Array<{ source: string; target: string }>): string[] => {
  const connectedNodes = new Set<string>();
  
  edges.forEach(edge => {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  });
  
  return nodes.filter(node => !connectedNodes.has(node));
};

// 색상 유틸리티
export const getSeverityColor = (severity: 'low' | 'medium' | 'high' | 'critical'): string => {
  switch (severity) {
    case 'low': return 'text-green-600 bg-green-50';
    case 'medium': return 'text-yellow-600 bg-yellow-50';
    case 'high': return 'text-orange-600 bg-orange-50';
    case 'critical': return 'text-red-600 bg-red-50';
    default: return 'text-gray-600 bg-gray-50';
  }
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active': return 'text-green-600 bg-green-50';
    case 'completed': return 'text-blue-600 bg-blue-50';
    case 'draft': return 'text-gray-600 bg-gray-50';
    case 'archived': return 'text-purple-600 bg-purple-50';
    case 'pending': return 'text-yellow-600 bg-yellow-50';
    case 'expired': return 'text-red-600 bg-red-50';
    default: return 'text-gray-600 bg-gray-50';
  }
};

// 검증 유틸리티
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateRequired = (value: any): boolean => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
};

// 파일 업로드 유틸리티
export const parseCSV = (csvText: string): Array<Record<string, string>> => {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(header => header.trim());
  const data: Array<Record<string, string>> = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(',').map(value => value.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
  }
  
  return data;
};

// 통계 계산 유틸리티
export const calculateAverage = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const calculateStandardDeviation = (values: number[]): number => {
  if (values.length === 0) return 0;
  const mean = calculateAverage(values);
  const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
  const variance = calculateAverage(squaredDifferences);
  return Math.sqrt(variance);
};

// 네트워크 시각화 유틸리티
export const generateNodeColor = (department?: string): string => {
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
  ];
  
  if (!department) return colors[0];
  
  const hash = department.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  return colors[Math.abs(hash) % colors.length];
};

// 필터링 유틸리티
export const filterData = <T>(
  data: T[],
  filters: Record<string, any>,
  filterKeys: string[]
): T[] => {
  return data.filter(item => {
    return filterKeys.every(key => {
      const filterValue = filters[key];
      if (!filterValue || filterValue.length === 0) return true;
      
      const itemValue = (item as any)[key];
      if (Array.isArray(filterValue)) {
        return filterValue.includes(itemValue);
      }
      return itemValue === filterValue;
    });
  });
};

// 페이지네이션 유틸리티
export const paginateData = <T>(
  data: T[],
  page: number,
  limit: number
): { data: T[]; total: number; totalPages: number } => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedData = data.slice(startIndex, endIndex);
  
  return {
    data: paginatedData,
    total: data.length,
    totalPages: Math.ceil(data.length / limit),
  };
};

// 로컬 스토리지 유틸리티
export const setLocalStorage = (key: string, value: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('로컬 스토리지 저장 실패:', error);
  }
};

export const getLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('로컬 스토리지 읽기 실패:', error);
    return defaultValue;
  }
};

// 디바운스 유틸리티
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}; 