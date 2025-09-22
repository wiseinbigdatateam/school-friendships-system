// 데이터 일관성 보장을 위한 캐시 관리 유틸리티

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
  version: string;
}

export interface CacheConfig {
  defaultTTL: number; // Time To Live (밀리초)
  maxSize: number; // 최대 캐시 항목 수
  cleanupInterval: number; // 정리 주기 (밀리초)
}

export class DataConsistencyManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 30 * 60 * 1000, // 30분
      maxSize: 1000,
      cleanupInterval: 5 * 60 * 1000, // 5분
      ...config
    };

    this.startCleanupTimer();
  }

  /**
   * 캐시에 데이터 저장
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiry = now + (ttl || this.config.defaultTTL);

    // 캐시 크기 제한 확인
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expiry,
      version: this.generateVersion()
    });

    console.log(`📦 캐시 저장: ${key} (TTL: ${ttl || this.config.defaultTTL}ms)`);
  }

  /**
   * 캐시에서 데이터 조회
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      console.log(`❌ 캐시 미스: ${key}`);
      return null;
    }

    const now = Date.now();
    
    // 만료 확인
    if (now > entry.expiry) {
      console.log(`⏰ 캐시 만료: ${key}`);
      this.cache.delete(key);
      return null;
    }

    console.log(`✅ 캐시 히트: ${key} (age: ${now - entry.timestamp}ms)`);
    return entry.data;
  }

  /**
   * 캐시 무효화
   */
  invalidate(key: string): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      console.log(`🗑️ 캐시 무효화: ${key}`);
    }
  }

  /**
   * 패턴으로 캐시 무효화
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    let count = 0;
    
    // Array.from을 사용하여 이터레이터를 배열로 변환
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    console.log(`🗑️ 패턴 캐시 무효화: ${pattern} (${count}개 항목)`);
  }

  /**
   * 전체 캐시 클리어
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🗑️ 전체 캐시 클리어: ${size}개 항목`);
  }

  /**
   * 캐시 상태 조회
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{
      key: string;
      age: number;
      expiry: number;
      version: string;
    }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      expiry: entry.expiry,
      version: entry.version
    }));

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: 0, // TODO: 히트율 계산 구현
      entries
    };
  }

  /**
   * 오래된 항목 제거
   */
  private evictOldest(): void {
    let oldestKey = '';
    let oldestTimestamp = Date.now();

    // Array.from을 사용하여 이터레이터를 배열로 변환
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🗑️ 오래된 캐시 항목 제거: ${oldestKey}`);
    }
  }

  /**
   * 정리 타이머 시작
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * 만료된 항목 정리
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    // Array.from을 사용하여 이터레이터를 배열로 변환
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 캐시 정리 완료: ${cleanedCount}개 항목 제거`);
    }
  }

  /**
   * 버전 생성
   */
  private generateVersion(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 리소스 정리
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

// 네트워크 분석 데이터 동기화 관리자
export class NetworkAnalysisSyncManager {
  private consistencyManager: DataConsistencyManager;
  private syncQueue: Set<string> = new Set();
  private isProcessing = false;

  constructor() {
    this.consistencyManager = new DataConsistencyManager({
      defaultTTL: 30 * 60 * 1000, // 30분
      maxSize: 500,
      cleanupInterval: 10 * 60 * 1000 // 10분
    });
  }

  /**
   * 분석 데이터 캐시 저장
   */
  cacheAnalysisData(surveyId: string, analysisType: 'complete' | 'class' | 'individual', data: any): void {
    const key = this.generateCacheKey(surveyId, analysisType);
    this.consistencyManager.set(key, data);
  }

  /**
   * 분석 데이터 캐시 조회
   */
  getCachedAnalysisData(surveyId: string, analysisType: 'complete' | 'class' | 'individual'): any | null {
    const key = this.generateCacheKey(surveyId, analysisType);
    return this.consistencyManager.get(key);
  }

  /**
   * 설문 관련 모든 캐시 무효화
   */
  invalidateSurveyCache(surveyId: string): void {
    const pattern = `survey:${surveyId}:*`;
    this.consistencyManager.invalidatePattern(pattern);
    console.log(`🔄 설문 캐시 무효화: ${surveyId}`);
  }

  /**
   * 동기화 큐에 추가
   */
  enqueueSync(surveyId: string): void {
    this.syncQueue.add(surveyId);
    this.processSyncQueue();
  }

  /**
   * 동기화 큐 처리
   */
  private async processSyncQueue(): Promise<void> {
    if (this.isProcessing || this.syncQueue.size === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`🔄 동기화 큐 처리 시작: ${this.syncQueue.size}개 항목`);

    try {
      const surveyIds = Array.from(this.syncQueue);
      this.syncQueue.clear();

      for (const surveyId of surveyIds) {
        await this.syncSurveyData(surveyId);
      }

      console.log(`✅ 동기화 큐 처리 완료`);
    } catch (error) {
      console.error('❌ 동기화 큐 처리 오류:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 설문 데이터 동기화
   */
  private async syncSurveyData(surveyId: string): Promise<void> {
    try {
      console.log(`🔄 설문 데이터 동기화: ${surveyId}`);
      
      // 관련된 모든 캐시 무효화
      this.invalidateSurveyCache(surveyId);
      
      // TODO: 실제 동기화 로직 구현
      // - DB에서 최신 데이터 조회
      // - 캐시 업데이트
      // - 관련 페이지에 변경 알림
      
      console.log(`✅ 설문 데이터 동기화 완료: ${surveyId}`);
    } catch (error) {
      console.error(`❌ 설문 데이터 동기화 오류: ${surveyId}`, error);
    }
  }

  /**
   * 캐시 키 생성
   */
  private generateCacheKey(surveyId: string, analysisType: string): string {
    return `survey:${surveyId}:${analysisType}`;
  }

  /**
   * 캐시 통계 조회
   */
  getCacheStats(): any {
    return this.consistencyManager.getStats();
  }

  /**
   * 전체 캐시 클리어
   */
  clearAllCache(): void {
    this.consistencyManager.clear();
    console.log('🗑️ 전체 네트워크 분석 캐시 클리어');
  }

  /**
   * 리소스 정리
   */
  destroy(): void {
    this.consistencyManager.destroy();
    this.syncQueue.clear();
  }
}

// 싱글톤 인스턴스
export const networkAnalysisSyncManager = new NetworkAnalysisSyncManager();

// 데이터 일관성 검증 유틸리티
export class DataConsistencyValidator {
  /**
   * 네트워크 분석 결과 일관성 검증
   */
  static validateNetworkAnalysisConsistency(
    completeAnalysis: any,
    classAnalysis: any,
    individualAnalysis: any
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 기본 구조 검증
      if (!completeAnalysis || !completeAnalysis.nodes || !completeAnalysis.edges) {
        errors.push('전체 분석 결과에 필수 데이터가 없습니다.');
      }

      if (!classAnalysis || !classAnalysis.students) {
        errors.push('학급 분석 결과에 학생 데이터가 없습니다.');
      }

      if (!individualAnalysis || !individualAnalysis.student) {
        errors.push('개별 분석 결과에 학생 데이터가 없습니다.');
      }

      // 데이터 일관성 검증
      if (completeAnalysis && classAnalysis) {
        const completeNodeIds = new Set(completeAnalysis.nodes.map((n: any) => n.id));
        const classStudentIds = new Set(classAnalysis.students.map((s: any) => s.id));

        // 학급 학생들이 전체 분석에 포함되어 있는지 확인
        const studentIds = Array.from(classStudentIds);
        for (const studentId of studentIds) {
          if (!completeNodeIds.has(studentId)) {
            warnings.push(`학급 학생 ${studentId}가 전체 분석에 없습니다.`);
          }
        }
      }

      // 중심성 점수 범위 검증
      if (individualAnalysis && individualAnalysis.centralityMetrics) {
        const metrics = individualAnalysis.centralityMetrics;
        
        if (metrics.degree < 0 || metrics.degree > 1) {
          warnings.push(`연결 중심성 점수가 범위를 벗어났습니다: ${metrics.degree}`);
        }
        
        if (metrics.betweenness < 0 || metrics.betweenness > 1) {
          warnings.push(`중개 중심성 점수가 범위를 벗어났습니다: ${metrics.betweenness}`);
        }
      }

      // 커뮤니티 ID 검증
      if (individualAnalysis && individualAnalysis.communityMembership !== undefined) {
        if (typeof individualAnalysis.communityMembership !== 'number' || 
            individualAnalysis.communityMembership < 0) {
          warnings.push(`커뮤니티 ID가 유효하지 않습니다: ${individualAnalysis.communityMembership}`);
        }
      }

    } catch (error) {
      errors.push(`데이터 검증 중 오류 발생: ${error}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 분석 결과 버전 호환성 검증
   */
  static validateVersionCompatibility(
    analysisData: any,
    expectedVersion: string = '1.0.0'
  ): boolean {
    try {
      const version = analysisData?.analysisMetadata?.analysisVersion || 
                     analysisData?.analysisVersion || 
                     'unknown';
      
      return version === expectedVersion;
    } catch (error) {
      console.error('버전 호환성 검증 오류:', error);
      return false;
    }
  }
}
