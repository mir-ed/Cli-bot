/**
 * src/utils/parser.ts
 * Input parsing and normalization
 */



import { log } from "console";
import type { parsedInput, parsedError, devResponse, softSignal } from "../utils/types.js"
import { exitCode } from "process";
import { subscribe } from "diagnostics_channel";


export const parseInput = (input: string) => {
    const trimmed = input.trim();

    if (!trimmed) {
        return {
            type: "empty",
            content: "empty"
        } as parsedInput
    }


    if (trimmed.startsWith("/")) {
        return {
            type: "command",
            content: `${trimmed}`
        } as parsedInput
    }

    return {
        type: "message",
        content: `${trimmed}`
    } as parsedInput
}




// Dev Mode
const ANSI_REGEX = /\x1B\[[0-9;]*[A-Za-z]/g;

const CONTROL_CHAR_REGEX = /[\r\t\b\f\v]/g;

const SPINNER_REGEX = /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/g;

const heuristicWords = {
    // High severity - explicit errors
    error: 1.0, exception: 1.0, failed: 0.9, failure: 0.9,
    fatal: 0.9, crash: 0.8, panic: 0.9, abort: 0.8, died: 0.8,

    // Error types (can appear as substrings)
    referenceerror: 1.0, typeerror: 1.0, syntaxerror: 1.0, rangeerror: 1.0,
    urierror: 0.9, parseerror: 0.9, assertionerror: 0.9, ioerror: 0.9, oserror: 0.8,
    networkerror: 0.9, timeouterror: 0.9, connectionerror: 0.9,

    // Code-level issues
    undefined: 0.7, null: 0.6, invalid: 0.7, unexpected: 0.6,
    unhandled: 0.8, uncaught: 0.8, missing: 0.7, notfound: 0.8,
    denied: 0.7, forbidden: 0.7, unauthorized: 0.7, timeout: 0.7, refused: 0.8,

    // Soft signals
    warning: 0.4, warn: 0.4, deprecated: 0.3, notice: 0.2, info: 0.1, debug: 0.1,

    // System / environment
    permission: 0.7, eacces: 0.8, enoent: 0.8, econnrefused: 0.9, eaddrinuse: 0.8,
    enotdir: 0.7, emfile: 0.7, enomem: 0.7,
    segfault: 0.9, sigsegv: 0.9,

    // Dependency / build
    "module not found": 1.0, "cannot find": 0.9, "not found": 0.9, "not installed": 0.8, "missing dependency": 0.9,
    "build failed": 0.9, "compilation failed": 0.9, "npm err": 0.9, "yarn error": 0.9,

    // Database / API
    "connection refused": 0.9, "no such host": 0.9, "dns lookup": 0.7, "query failed": 0.8,
    "constraint violation": 0.8, "duplicate key": 0.7,

    // Process
    "exit code": 0.6, "killed": 0.7, "segmentation fault": 0.9, "illegal instruction": 0.9,
    "floating point exception": 0.9,

    // Network
    "network unreachable": 0.8, "host unreachable": 0.8, "no route": 0.7, offline: 0.6, socket: 0.5,

    // Generic failures
    fail: 0.8, broken: 0.7, corrupted: 0.8, malformed: 0.7, incomplete: 0.6,

    // system/shell error 
    "not recognized": 1.0, "permission denied": 1.0, "no such file or directory": 1.0,
    "command not found": 1.0, "no route to host": 1.0, "unknown host": 1.0,
    "server not found": 1.0, "address already in use": 1.0,

};


function normalize(stderr: string): string {
    return stderr
        .toLowerCase()
        .replace(ANSI_REGEX, "")
        .replace(CONTROL_CHAR_REGEX, "")
        .replace(SPINNER_REGEX, "")
        .replace(/\n\s*\n/g, "\n")
        .trim();
}


const keyWordPatterns = Object.entries(heuristicWords).map(([keyword, weight]) => ({
    keyword,
    weight,
    wordBoundary: new RegExp(`\\b${keyword}\\b`, "i"),
    subString: new RegExp(keyword, "i"),
}))


const softSignalLayer = (n: string) => {

    const matched: string[] = [];
    let score = 0;
    let count = 0;

    // reuse compiled pattern
    for (const { keyword, weight, wordBoundary, subString } of keyWordPatterns) {
        if (wordBoundary.test(n) || subString.test(n)) {
            matched.push(keyword);
            score += weight
            count++
        }
    }

    const confidence = score > 0 ? score / count : 0;

    return {
        softSignalScore: score,
        matchedKeyword: matched,
        confidence: confidence
    }
}

export const classifyStderr = (chunk: string) => {
    const Signal = [];
    const n = normalize(chunk)
    const softSignalObj: softSignal = softSignalLayer(n)
    Signal.push(softSignalObj)

    return Signal
}







export const parseError = async (stderr: string) => {
    const n = normalize(stderr)
    if (!n) {
        return {
            content: n,
            eventType: "IGNORE"
        } as unknown as parsedError
    }
    const Error_pattern = [
        "error", "failed", "exception", "fatal", "panic", "traceback", "undefined", "cannot", "unable", "referenceerror:"
    ]
    const hasErrorPattern = Error_pattern.some((pattern) => n.includes(pattern));


    const IsFailure = exitCode !== 0;


    if (IsFailure) {
        return {
            content: n,
            eventType: "ERROR"
        } as unknown as parsedError
    } else if (hasErrorPattern) {
        return {
            content: n,
            eventType: "WARNING"
        } as unknown as parsedError
    } else {
        return {
            content: n,
            eventType: "IGNORE"
        } as unknown as parsedError
    }
}

export const parseDevResponse = (res: string): devResponse => {
    try {
        const jsonMatch = res.match(/```json\s*([\s\S]*?)\s*```/);
        const contentToParse = (jsonMatch && jsonMatch[1]) || res;

        const firstBrace = contentToParse.indexOf('{');
        const lastBrace = contentToParse.lastIndexOf('}');

        if (firstBrace === -1 || lastBrace === -1) {
            throw new Error("No JSON object found in response");
        }

        const jsonString = contentToParse.substring(firstBrace, lastBrace + 1);
        const parsed = JSON.parse(jsonString);

        return {
            explanation: parsed.explanation || "No explanation provided.",
            rootCause: parsed.rootCause || parsed.rootcause || "No root cause identified.",
            fix: parsed.fix || "No fix suggested.",
            prevention: parsed.prevention || "No prevention steps suggested.",
            confidence: parsed.confidence || "Unknown",
            confidenceReason: parsed.confidenceReason || parsed["confidence reason"] || ""
        };
    } catch (error) {
        return {
            explanation: res,
            rootCause: "Failed to parse AI response as JSON.",
            fix: "Refer to the raw response below.",
            prevention: "N/A",
            confidence: "Low",
            confidenceReason: `Parsing error: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}