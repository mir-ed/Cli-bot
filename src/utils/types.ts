
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
    softSignalScore: number,
    matchedKeyword: string[],
    confidence: number
}

export type parsedError = {
    content: string,
    eventType: "ERROR" | "WARNING" | "IGNORE"
}

export type errorContext = {
    commands: string,
    eventType: string,
    errorOutput: string,
    workspaceName: string | undefined,
    projectPath: string | undefined,
    projectDescriptionn: string | undefined,
    timestamp: Date

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