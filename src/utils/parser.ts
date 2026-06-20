/**
 * src/utils/parser.ts
 * Input parsing and normalization
 */



import type { parsedInput, parsedError, devResponse, softSignal, analysis, CommandMeta, confirmCmdType } from "../utils/types.js"
import { exitCode } from "process";

import { heuristicWords, errorClassifications, strongSignalPatterns, commandRegistry } from "./error.js";
import { distance, closest } from "fastest-levenshtein";



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






function normalize(stderr: string): string {
    return stderr
        .toLowerCase()
        .replace(ANSI_REGEX, "")
        .replace(CONTROL_CHAR_REGEX, "")
        .replace(SPINNER_REGEX, "")
        .replace(/\n\s*\n/g, "\n")
        .trim();
}




function escapeRegex(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const keyWordPatterns = Object.entries(heuristicWords).map(([keyword, weight]) => ({
    keyword,
    weight,
    wordBoundary: keyword.includes(" ")
        ? new RegExp(escapeRegex(keyword), "i")
        : new RegExp(`\\b${keyword}\\b`, "i"),
    subString: keyword.includes(" ")
        ? new RegExp(escapeRegex(keyword), "i")
        : new RegExp(keyword, "i"),
}))


// also this 
const keywordIndex = new Map();

for (const category of errorClassifications) {
    const type = category.type;

    for (const { word, weight } of category.keywords) {
        const existing = keywordIndex.get(word) || [];

        existing.push({ type, weight });

        keywordIndex.set(word, existing);
    }
}

const strongSignalLayer = (n: string) => {
    for (const pattern of strongSignalPatterns) {
        const match = n.match(pattern);
        const result = match ? match[0] : null;
        if (result) {
            return {
                type: "regex",
                MatchRegex: result,
                confidence: 0.9
            }
        }
    }
    return {
        type: "regex",
        MatchRegex: null,
        confidence: 0
    }
}

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

    const confidence = score > 0 ? Math.min(1, Math.log1p(score) * 0.7 + Math.log1p(count) * 0.3) : 0;

    return {
        type: "heuristic",
        softSignalScore: score,
        matchedKeyword: matched,
        confidence: confidence
    }
}

// study this
const errorTypeClassifier = (n: string) => {
    const scores = Object.create(null);

    for (const [keyword, rules] of keywordIndex) {
        if (n.includes(keyword)) {
            for (const rule of rules) {
                scores[rule.type] =
                    (scores[rule.type] || 0) + rule.weight;
            }
        }
    }

    const total = Number(Object.values(scores).reduce((a: any, b: any) => {
        return a + b
    }, 0));

    for (const key in scores) {
        scores[key] = scores[key] / total;
    }

    return scores;
};

export const classifyStderr = (chunk: string) => {


    const Signal = [];
    const n = normalize(chunk)
    const strongSignal = strongSignalLayer(n);
    const softSignalObj: softSignal = softSignalLayer(n)
    const ErrorType = errorTypeClassifier(n)


    Signal.push(strongSignal, softSignalObj, ErrorType)


    const WEIGHTS = {
        regex: 0.5,
        type: 0.3,
        heuristic: softSignalObj.matchedKeyword.includes("warning")
            ? 0.1
            : 0.2,
    };


    let typeScore = Number(Object.values(ErrorType).reduce((a: any, b: any) => {
        return a + b
    }, 0));
    //console.log(typeScore);


    const finalScore =
        strongSignal.confidence * WEIGHTS.regex +
        typeScore * WEIGHTS.type +
        softSignalObj.confidence * WEIGHTS.heuristic;

    const analysis: analysis = {
        finalScore: finalScore,
        confidenceLevel:
            finalScore < 0.4
                ? "low"
                : finalScore < 0.75
                    ? "medium"
                    : "high",
        topSignals: [
            `regex: ${strongSignal.MatchRegex}`,
            `heuristic: ${softSignalObj.matchedKeyword}`
        ],
        typeGuess: ErrorType

        // }

    }

    return {
        analysis: analysis,
        n: n
    }
}







// export const parseError = async (stderr: string) => {
//     const n = normalize(stderr)
//     if (!n) {
//         return {
//             content: n,
//             eventType: "IGNORE"
//         } as unknown as parsedError
//     }
//     const Error_pattern = [
//         "error", "failed", "exception", "fatal", "panic", "traceback", "undefined", "cannot", "unable", "referenceerror:"
//     ]
//     const hasErrorPattern = Error_pattern.some((pattern) => n.includes(pattern));


//     const IsFailure = exitCode !== 0;


//     if (IsFailure) {
//         return {
//             content: n,
//             eventType: "ERROR"
//         } as unknown as parsedError
//     } else if (hasErrorPattern) {
//         return {
//             content: n,
//             eventType: "WARNING"
//         } as unknown as parsedError
//     } else {
//         return {
//             content: n,
//             eventType: "IGNORE"
//         } as unknown as parsedError
//     }
// }

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


export const isEmptyCommand = (input: string) => {
    if (input.trim() === "cli-bot") {
        return true
    }
    return input.trim().length === 0
}

const cmds = commandRegistry.map(cmd => cmd.command)

export const confirmCmd = (cmd: string): confirmCmdType => {
    const c = cmd.trim().toLowerCase()
    const conatinsCmd = cmds.some(commands => commands === c)
    if (conatinsCmd) {
        return {
            status: "valid",
            command: cmd,

        }
    }

    const candidate = closest(c, cmds)
    const score = distance(c, candidate)

    if (score <= 2) {
        return {
            status: "suggestion",
            command: cmd,
            suggestion: candidate,
        }
    }



    return {
        status: "invalid",
        command: cmd
    }

}


export const getRuntimeLanguage = (cmd: string) => {
    const res = commandRegistry.find(command => command.command === cmd)
    if (!res) {
        return {
            runtime: "infer from error",
            language: "infer from error"
        }
    }

    return {
        runtime: res.runtime,
        language: res.language
    }

}
