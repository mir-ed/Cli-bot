
export type User = {
    userName: string,
    description: string,
    activeWorkspace?: string
};

export type ChatMessage = {
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: Date
};

export type SessionState = {
    title: string,
    systemPrompt: string,
    message: ChatMessage[],
    createdAt: Date
}

export type parsedInput = {
    type: "message" | "command" | "error" | "empty",
    content: string
}

export type projectInfo = {
    workSpaceName: string,
    projectPath: string,
    projectDescription: string,
    createdAt: Date
}


export type softSignal = {
    type: string,
    softSignalScore: number,
    matchedKeyword: string[],
    confidence: number
}
export type analysis = {
    finalScore: number
    confidenceLevel: "low" | "medium" | "high"
    topSignals: string[],
    typeGuess: Object
}

export type parsedError = {
    content: string,
    eventType: "ERROR" | "WARNING" | "IGNORE"
}

export type errorContext = {
    commands: string,
    errorAnalysis: analysis,
    errorOutput: string,
    workspaceName: string | undefined,
    projectPath: string | undefined,
    projectDescription: string | undefined,
    timestamp: Date,
    runtime: string | null,
    language: string | null

    // for mvp lets stop here
    // exitCode: number | null,
    // techStack: null,
    // workspaceMemory: null,
    // recentContext: null
}

export type devResponse = {
    explanation: string;
    rootCause: string;
    fix: string;
    prevention: string;
    confidence: string;
    confidenceReason: string;
}

export type CommandMeta = {
    command: string;
    language: string | null;
    runtime: string | null;
};

export type confirmCmdType = {
    status: "valid" | "suggestion" | "invalid",
    command: string,
    suggestion?: string
}