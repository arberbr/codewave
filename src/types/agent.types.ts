export type AgentRole =
    | 'Business Analyst'
    | 'QA Engineer'
    | 'Developer Author'
    | 'Senior Architect'
    | 'Developer Reviewer';

// Conversation tracking types
export interface ConversationMessage {
    round: number;
    agentRole: AgentRole;
    agentName: string;
    message: string;
    timestamp: Date;
    concernsRaised?: string[];
    referencesTo?: string[]; // Other agent names referenced
}

// 7-Pillar metrics structure
export interface PillarScores {
    codeQuality: number; // 1-10 (Developer Reviewer)
    codeComplexity: number; // 10-1 inverted (Senior Architect)
    idealTimeHours: number; // Business Analyst
    actualTimeHours: number; // Developer Author
    technicalDebtHours: number; // +/- (Senior Architect)
    functionalImpact: number; // 1-10 (Business Analyst)
    testCoverage: number; // 1-10 (QA Engineer)
}
