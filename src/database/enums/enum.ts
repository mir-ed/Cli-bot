export enum credentialType {
 ACCOUNT_PASSWORD = "ACCOUNT_PASSWORD",
 API_KEY = "AI_API_KEY"
}

export enum credentialStatus {
    ACTIVE = "ACTIVE",
    EXPIRED = "EXPIRED",
    REVOKED = "REVOKED"
}

export enum OSname {
    ANDROID = "ANDROID",
    WINDOWS = "WINDOWS",
    UBUNTU = "UBUNTU",
    DEBAIN = "DEBIAN",
    ARCH_LINUX = "ARCH_LINUX",
    MACOS = "MACOS"
}

export enum SynchronizationState {
    SYNCED = "SYNCED",
    PENDING = "PENDING", 
    SYNCING = "SYNCHING",
    FAILED = "FAILED"
}

export enum SessionStatus {
  ACTIVE = "ACTIVE",
  ENDED = "ENDED",
}

export enum RequestType {
    AI = "AI",
    PROCESS = "PROCESS"
}


export enum ResquestStatus {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED"
}

export enum ProcessState {
    RUNNING = "RUNNING",
    FAILED = "FAILED",
    TERMINATED = " TERMINATED",
    COMPLETED = "COMPLETED"
}

export enum StreamType {
    STDOUT = "STDOUT",
    STDERR = 'STDERR'
}

export enum AIResponseType {
    CHAT = "CHAT",
    ERROR_ANALYSIS = "ERROR_ANALYSIS",
    ACTION = "ACTION"
}

export enum ActionStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED"
}