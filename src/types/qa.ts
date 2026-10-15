export type PipelineStage = 
  | 'idle'
  | 'explore'
  | 'understand'
  | 'plan'
  | 'execute'
  | 'detect'
  | 'verify'
  | 'report'
  | 'learn'
  | 'completed';

export type BugSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type BugCategory = 'AUTH' | 'CALCULATION' | 'VALIDATION' | 'IDEMPOTENCY' | 'SESSION' | 'SEARCH' | 'UI';

export interface DiscoveredElement {
  id: string;
  tagName: string;
  type?: string;
  selector: string;
  text?: string;
  role?: string;
  placeholder?: string;
  dataTestId?: string;
  page: string;
  interactive: boolean;
}

export interface UserJourney {
  id: string;
  name: string;
  category: 'AUTHENTICATION' | 'CATALOG_BROWSE' | 'CART_OPERATIONS' | 'CHECKOUT' | 'EDGE_CASE' | 'SECURITY';
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  riskScore: number; // 0-100
  testCount: number;
}

export interface TestStep {
  id: string;
  action: 'navigate' | 'click' | 'fill' | 'assert' | 'select' | 'wait' | 'double_click';
  selector: string;
  description: string;
  value?: string | number;
  assertionType?: 'exists' | 'equals' | 'contains' | 'greater_than' | 'not_empty' | 'valid_math' | 'idempotent';
  expected?: any;
  actual?: any;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'flaky';
  durationMs?: number;
  error?: string;
  domSnapshot?: string;
}

export interface TestCase {
  id: string;
  journeyId: string;
  title: string;
  description: string;
  category: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  steps: TestStep[];
  status: 'pending' | 'running' | 'passed' | 'failed' | 'flaky';
  durationMs?: number;
  failureReason?: string;
  bugReportId?: string;
  isEdgeCase: boolean;
  isReproducible?: boolean;
}

export interface BugEvidence {
  timestamp: string;
  failingStep: string;
  selector: string;
  expectedValue: string;
  actualValue: string;
  domSnapshot?: string;
  consoleErrors: string[];
  networkPayload?: {
    endpoint: string;
    method: string;
    requestBody?: any;
    responseStatus?: number;
    responseBody?: any;
  };
  visualMarker?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface VideoAnnotation {
  timestampMs: number;
  durationMs: number;
  stepIndex: number;
  action: string;
  selector: string;
  text: string;
  isAnomalyPoint: boolean;
  coordinates: { x: number; y: number }; // Percentage position on screen e.g. 50, 40
}

export interface PlaywrightVideoClip {
  id: string;
  bugReportId: string;
  videoUrl?: string;
  filename: string;
  durationSeconds: number;
  resolution: string;
  fps: number;
  recordedWith: string;
  annotations: VideoAnnotation[];
  codec: string;
  fileSizeBytes: number;
}

export interface BugReport {
  id: string;
  testCaseId: string;
  title: string;
  severity: BugSeverity;
  category: BugCategory;
  summary: string;
  stepsToReproduce: string[];
  expectedBehavior: string;
  actualBehavior: string;
  evidence: BugEvidence;
  rootCauseAnalysis: string;
  suggestedFix: string;
  verificationRuns: number;
  isVerified: boolean;
  confidenceScore: number; // e.g. 100%
  status: 'OPEN' | 'VERIFIED' | 'CONFIRMED' | 'RESOLVED';
  timestamp: string;
  videoClip?: PlaywrightVideoClip;
}

export interface PlantedBugConfig {
  id: string;
  name: string;
  category: BugCategory;
  severity: BugSeverity;
  description: string;
  enabled: boolean;
  expectedAnomaly: string;
}

export interface HistoricalTestRun {
  id: string;
  timestamp: string;
  targetUrl: string;
  actualBrowserUrl?: string;
  targetType?: 'preset_demo' | 'custom_url';
  pageTitle?: string;
  targetScreenshot?: string | null;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  bugsFoundCount: number;
  durationMs: number;
  coveragePercentage: number;
  criticalBugsFound: number;
}

export interface ExecutionLog {
  id: string;
  timestamp: string;
  stage: PipelineStage;
  level: 'info' | 'warn' | 'error' | 'success' | 'agent';
  message: string;
  meta?: any;
}

export interface PrioritizedNextStep {
  title: string;
  category: string;
  targetArea: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  rationale: string;
}

export interface LearningPrioritizationResult {
  updatedJourneys: UserJourney[];
  prioritizedNextSteps: PrioritizedNextStep[];
  aiLearningSummary: string;
  analyzedAt: string;
  modelUsed: string;
}
