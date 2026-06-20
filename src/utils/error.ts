/**
 * src/utils/error.ts
 * Error formatting and stack trace cleanup
 */

import type { CommandMeta } from "./types.js";
export const errorClassifications = [
    // ─── Runtime / Type Errors ────────────────────────────────────────────────
    {
        type: "runtime",
        keywords: [
            // JavaScript / TypeScript
            { word: "referenceerror", weight: 0.95 },
            { word: "typeerror", weight: 0.95 },
            { word: "is not a function", weight: 0.9 },
            { word: "cannot read property", weight: 0.9 },
            // Python
            { word: "nameerror", weight: 0.95 },
            { word: "attributeerror", weight: 0.95 },
            { word: "valueerror", weight: 0.9 },
            { word: "indexerror", weight: 0.9 },
            { word: "keyerror", weight: 0.9 },
            { word: "typeerror", weight: 0.95 },
            // Java / Kotlin / JVM
            { word: "nullpointerexception", weight: 0.95 },
            { word: "classcastexception", weight: 0.9 },
            { word: "arrayindexoutofboundsexception", weight: 0.9 },
            { word: "illegalargumentexception", weight: 0.85 },
            { word: "illegalstateexception", weight: 0.85 },
            { word: "nosuchmethoderror", weight: 0.9 },
            // C# / .NET
            { word: "nullreferenceexception", weight: 0.95 },
            { word: "invalidcastexception", weight: 0.9 },
            { word: "invalidoperationexception", weight: 0.85 },
            { word: "indexoutofrangeexception", weight: 0.9 },
            // Ruby
            { word: "nomethoderror", weight: 0.95 },
            { word: "undefined method", weight: 0.9 },
            { word: "undefined local variable", weight: 0.9 },
            // Go
            { word: "nil pointer dereference", weight: 0.95 },
            { word: "index out of range", weight: 0.9 },
            { word: "interface conversion", weight: 0.85 },
            // Rust
            { word: "called `option::unwrap()` on a `none` value", weight: 0.95 },
            { word: "called `result::unwrap()` on an `err` value", weight: 0.95 },
            { word: "index out of bounds", weight: 0.9 },
            // PHP
            { word: "undefined variable", weight: 0.9 },
            { word: "undefined index", weight: 0.9 },
            { word: "call to undefined function", weight: 0.9 },
            // General
            { word: "undefined", weight: 0.75 },
            { word: "null", weight: 0.6 },
            { word: "unhandled", weight: 0.8 },
            { word: "uncaught", weight: 0.85 },
            { word: "exception", weight: 0.75 }
        ]
    },

    // ─── Syntax Errors ────────────────────────────────────────────────────────
    {
        type: "syntax",
        keywords: [
            // General
            { word: "syntaxerror", weight: 0.95 },
            { word: "parseerror", weight: 0.9 },
            { word: "unexpected token", weight: 0.95 },
            { word: "unexpected end of input", weight: 0.9 },
            { word: "invalid syntax", weight: 0.9 },
            { word: "parse error", weight: 0.9 },
            // Python
            { word: "indentationerror", weight: 0.95 },
            { word: "taberror", weight: 0.9 },
            { word: "expected an indented block", weight: 0.9 },
            // Ruby
            { word: "syntax error, unexpected", weight: 0.95 },
            // Rust / C / C++
            { word: "expected `;`", weight: 0.9 },
            { word: "expected `{`", weight: 0.9 },
            { word: "mismatched types", weight: 0.85 },
            // Java
            { word: "illegal start of expression", weight: 0.9 },
            { word: "reached end of file while parsing", weight: 0.9 },
            // SQL
            { word: "syntax error at or near", weight: 0.9 },
            { word: "you have an error in your sql syntax", weight: 0.95 }
        ]
    },

    // ─── Dependency / Module Errors ───────────────────────────────────────────
    {
        type: "dependency",
        keywords: [
            // Node / JS
            { word: "module not found", weight: 0.95 },
            { word: "cannot find module", weight: 0.95 },
            { word: "require is not defined", weight: 0.8 },
            // Python
            { word: "modulenotfounderror", weight: 0.95 },
            { word: "importerror", weight: 0.9 },
            { word: "no module named", weight: 0.95 },
            // Ruby
            { word: "loaderror", weight: 0.9 },
            { word: "cannot load such file", weight: 0.95 },
            // Go
            { word: "cannot find package", weight: 0.95 },
            { word: "missing go.sum entry", weight: 0.9 },
            // Rust
            { word: "error[e0432]: unresolved import", weight: 0.95 },
            { word: "error[e0433]: failed to resolve", weight: 0.95 },
            // Java / Maven / Gradle
            { word: "package does not exist", weight: 0.9 },
            { word: "cannot find symbol", weight: 0.85 },
            { word: "could not resolve dependencies", weight: 0.9 },
            // PHP / Composer
            { word: "class not found", weight: 0.9 },
            { word: "your requirements could not be resolved", weight: 0.9 },
            // General
            { word: "cannot resolve", weight: 0.9 },
            { word: "not installed", weight: 0.85 },
            { word: "missing dependency", weight: 0.9 }
        ]
    },

    // ─── Build / Compilation Errors ───────────────────────────────────────────
    {
        type: "build",
        keywords: [
            // General
            { word: "build failed", weight: 0.95 },
            { word: "compilation failed", weight: 0.95 },
            { word: "compile error", weight: 0.9 },
            // JS / TS tooling
            { word: "webpack error", weight: 0.9 },
            { word: "vite error", weight: 0.9 },
            { word: "tsc error", weight: 0.9 },
            { word: "npm err", weight: 0.9 },
            { word: "yarn error", weight: 0.9 },
            { word: "pnpm error", weight: 0.9 },
            // Rust
            { word: "error[e", weight: 0.85 }, // rustc error codes
            { word: "aborting due to previous error", weight: 0.95 },
            // Java / Kotlin / Gradle / Maven
            { word: "build error", weight: 0.9 },
            { word: "execution failed for task", weight: 0.9 },
            { word: "could not compile", weight: 0.9 },
            // C / C++ / Make
            { word: "make: ***", weight: 0.9 },
            { word: "ld returned", weight: 0.9 },
            { word: "linker error", weight: 0.9 },
            { word: "undefined reference to", weight: 0.9 },
            // Python
            { word: "extension module failed to build", weight: 0.9 },
            // Go
            { word: "build constraints exclude all go files", weight: 0.9 },
            // Ruby / Bundler
            { word: "bundler: failed to load command", weight: 0.9 },
            // .NET / MSBuild
            { word: "msbuild error", weight: 0.9 },
            { word: "csc error", weight: 0.9 }
        ]
    },

    // ─── Type / Compiler Errors ───────────────────────────────────────────────
    {
        type: "type_error",
        keywords: [
            // TypeScript
            { word: "ts(", weight: 0.85 },
            { word: "type error", weight: 0.85 },
            { word: "is not assignable to type", weight: 0.95 },
            { word: "property does not exist on type", weight: 0.95 },
            // Rust
            { word: "mismatched types", weight: 0.9 },
            { word: "expected struct", weight: 0.8 },
            // Java / Kotlin
            { word: "incompatible types", weight: 0.9 },
            { word: "required:", weight: 0.6 },
            { word: "found:", weight: 0.5 },
            // Go
            { word: "cannot use", weight: 0.8 },
            { word: "as type", weight: 0.7 },
            // Haskell / ML-family
            { word: "couldn't match expected type", weight: 0.95 },
            { word: "no instance for", weight: 0.85 }
        ]
    },

    // ─── Permission Errors ────────────────────────────────────────────────────
    {
        type: "permission",
        keywords: [
            { word: "eacces", weight: 0.95 },
            { word: "eperm", weight: 0.95 },
            { word: "permission denied", weight: 0.95 },
            { word: "operation not permitted", weight: 0.95 },
            { word: "access denied", weight: 0.9 },
            { word: "forbidden", weight: 0.8 },
            { word: "unauthorized", weight: 0.8 },
            { word: "requires root", weight: 0.9 },
            { word: "must be run as administrator", weight: 0.9 }
        ]
    },

    // ─── Filesystem Errors ────────────────────────────────────────────────────
    {
        type: "filesystem",
        keywords: [
            { word: "enoent", weight: 0.95 },
            { word: "no such file", weight: 0.95 },
            { word: "file not found", weight: 0.95 },
            { word: "directory not found", weight: 0.9 },
            { word: "not a directory", weight: 0.85 },
            { word: "is a directory", weight: 0.8 },
            { word: "command not found", weight: 0.8 },
            { word: "not recognized as an internal or external command", weight: 0.9 },
            { word: "filenotfounderror", weight: 0.95 },  // Python
            { word: "isadirectoryerror", weight: 0.9 },   // Python
            { word: "notadirectoryerror", weight: 0.9 },  // Python
            { word: "no such file or directory", weight: 0.95 }
        ]
    },

    // ─── Connection Errors ────────────────────────────────────────────────────
    {
        type: "connection",
        keywords: [
            { word: "econnrefused", weight: 0.95 },
            { word: "eaddrinuse", weight: 0.95 },
            { word: "address already in use", weight: 0.95 },
            { word: "connection refused", weight: 0.95 },
            { word: "socket hang up", weight: 0.9 },
            { word: "connection reset", weight: 0.9 },
            { word: "port already in use", weight: 0.9 },
            { word: "broken pipe", weight: 0.85 },
            { word: "connectionrefusederror", weight: 0.95 }, // Python
            { word: "connectionreseterror", weight: 0.9 },    // Python
            { word: "connectionerror", weight: 0.85 }         // Python / general
        ]
    },

    // ─── Network Errors ───────────────────────────────────────────────────────
    {
        type: "network",
        keywords: [
            { word: "network unreachable", weight: 0.95 },
            { word: "host unreachable", weight: 0.95 },
            { word: "no route to host", weight: 0.95 },
            { word: "dns lookup", weight: 0.85 },
            { word: "server not found", weight: 0.9 },
            { word: "unknown host", weight: 0.9 },
            { word: "network error", weight: 0.9 },
            { word: "name or service not known", weight: 0.9 },  // Linux DNS
            { word: "nodename nor servname provided", weight: 0.9 }, // macOS DNS
            { word: "temporary failure in name resolution", weight: 0.9 }
        ]
    },

    // ─── Timeout Errors ───────────────────────────────────────────────────────
    {
        type: "timeout",
        keywords: [
            { word: "timeout", weight: 0.9 },
            { word: "timed out", weight: 0.95 },
            { word: "request timeout", weight: 0.95 },
            { word: "dns lookup timeout", weight: 0.85 },
            { word: "read timeout", weight: 0.9 },
            { word: "connect timeout", weight: 0.9 },
            { word: "deadline exceeded", weight: 0.95 },      // gRPC / Go
            { word: "context deadline exceeded", weight: 0.95 }, // Go
            { word: "timeoutexpired", weight: 0.95 },         // Python (DB)
            { word: "gatewaytimedout", weight: 0.9 }
        ]
    },

    // ─── Database Errors ──────────────────────────────────────────────────────
    {
        type: "database",
        keywords: [
            { word: "query failed", weight: 0.85 },
            { word: "constraint violation", weight: 0.9 },
            { word: "duplicate key", weight: 0.9 },
            { word: "unique constraint", weight: 0.9 },
            { word: "foreign key constraint", weight: 0.9 },
            { word: "connection pool", weight: 0.8 },
            { word: "deadlock", weight: 0.95 },
            { word: "transaction aborted", weight: 0.9 },
            { word: "relation does not exist", weight: 0.9 }, // PostgreSQL
            { word: "table doesn't exist", weight: 0.9 },     // MySQL
            { word: "no such table", weight: 0.9 },           // SQLite
            { word: "operationalerror", weight: 0.8 },        // Python DB-API
            { word: "integrityerror", weight: 0.9 },          // Python DB-API
            { word: "could not connect to server", weight: 0.9 }
        ]
    },

    // ─── Crash / Memory Errors ────────────────────────────────────────────────
    {
        type: "crash",
        keywords: [
            { word: "segfault", weight: 0.95 },
            { word: "sigsegv", weight: 0.95 },
            { word: "segmentation fault", weight: 0.95 },
            { word: "bus error", weight: 0.9 },
            { word: "sigbus", weight: 0.9 },
            { word: "stack overflow", weight: 0.95 },
            { word: "stackoverflow", weight: 0.9 },           // Java
            { word: "panic", weight: 0.9 },                   // Go / Rust
            { word: "abort", weight: 0.85 },
            { word: "killed", weight: 0.8 },
            { word: "out of memory", weight: 0.95 },
            { word: "oom", weight: 0.9 },
            { word: "outofmemoryerror", weight: 0.95 },       // Java
            { word: "memoryerror", weight: 0.95 },            // Python
            { word: "heap space", weight: 0.9 },              // Java
            { word: "gc overhead limit exceeded", weight: 0.9 }, // Java
            { word: "fatal error: runtime: out of memory", weight: 0.95 } // Go
        ]
    },

    // ─── Warnings ─────────────────────────────────────────────────────────────
    {
        type: "warning",
        keywords: [
            { word: "warning", weight: 0.9 },
            { word: "warn", weight: 0.9 },
            { word: "deprecated", weight: 0.85 },
            { word: "deprecationwarning", weight: 0.9 },
            { word: "pendingdeprecationwarning", weight: 0.85 },
            { word: "userwarning", weight: 0.85 },            // Python
            { word: "notice", weight: 0.4 }
        ]
    },

    // ─── Authentication / Authorization ───────────────────────────────────────
    {
        type: "auth",
        keywords: [
            { word: "authentication failed", weight: 0.95 },
            { word: "invalid credentials", weight: 0.95 },
            { word: "token expired", weight: 0.9 },
            { word: "invalid token", weight: 0.9 },
            { word: "jwt", weight: 0.7 },
            { word: "signature verification failed", weight: 0.9 },
            { word: "api key", weight: 0.7 },
            { word: "invalid api key", weight: 0.95 },
            { word: "permission denied (publickey)", weight: 0.95 }, // SSH
            { word: "publickey authentication failed", weight: 0.95 },
            { word: "bad credentials", weight: 0.9 }
        ]
    },

    // ─── Version / Compatibility Errors ──────────────────────────────────────
    {
        type: "version",
        keywords: [
            { word: "version mismatch", weight: 0.9 },
            { word: "incompatible version", weight: 0.9 },
            { word: "requires python", weight: 0.85 },
            { word: "requires node", weight: 0.85 },
            { word: "unsupported python version", weight: 0.9 },
            { word: "engine mismatch", weight: 0.9 },
            { word: "api version", weight: 0.7 },
            { word: "breaking change", weight: 0.8 },
            { word: "deprecated api", weight: 0.8 }
        ]
    },

    // ─── Git Errors ───────────────────────────────────────────────────────────
    {
        type: "git",
        keywords: [
            { word: "merge conflict", weight: 0.95 },
            { word: "rebase failed", weight: 0.9 },
            { word: "Repository not found", weight: 0.95 },
            { word: "authentication failed", weight: 0.9 },
            { word: "permission denied (publickey)", weight: 0.95 },
            { word: "rejected", weight: 0.7 },
            { word: "non-fast-forward", weight: 0.9 },
            { word: "cannot lock ref", weight: 0.9 },
            { word: "your local changes", weight: 0.8 }
        ]
    },

    // ─── Container / Orchestration Errors ────────────────────────────────────
    {
        type: "container",
        keywords: [
            { word: "docker error", weight: 0.9 },
            { word: "container failed", weight: 0.9 },
            { word: "image not found", weight: 0.9 },
            { word: "cannot connect to the docker daemon", weight: 0.95 },
            { word: "no space left on device", weight: 0.9 },
            { word: "oci runtime error", weight: 0.9 },
            { word: "crashloopbackoff", weight: 0.95 },       // Kubernetes
            { word: "imagepullbackoff", weight: 0.95 },       // Kubernetes
            { word: "oomkilled", weight: 0.95 },              // Kubernetes
            { word: "evicted", weight: 0.8 },                 // Kubernetes
            { word: "pod failed", weight: 0.85 }              // Kubernetes
        ]
    },

    // ─── HTTP Errors ──────────────────────────────────────────────────────────
    {
        type: "http",
        keywords: [
            { word: "500 internal server error", weight: 0.95 },
            { word: "502 bad gateway", weight: 0.9 },
            { word: "503 service unavailable", weight: 0.9 },
            { word: "504 gateway timeout", weight: 0.9 },
            { word: "404 not found", weight: 0.9 },
            { word: "401 unauthorized", weight: 0.9 },
            { word: "403 forbidden", weight: 0.9 },
            { word: "400 bad request", weight: 0.85 },
            { word: "429 too many requests", weight: 0.9 },
            { word: "bad gateway", weight: 0.9 },
            { word: "service unavailable", weight: 0.85 }
        ]
    },

    // ─── SSL / TLS Errors ─────────────────────────────────────────────────────
    {
        type: "ssl",
        keywords: [
            { word: "ssl error", weight: 0.9 },
            { word: "tls handshake", weight: 0.9 },
            { word: "certificate verify failed", weight: 0.95 },
            { word: "self signed certificate", weight: 0.9 },
            { word: "certificate has expired", weight: 0.95 },
            { word: "ssl: certificate_verify_failed", weight: 0.95 }, // Python
            { word: "unable to verify the first certificate", weight: 0.9 },
            { word: "unknown ca", weight: 0.85 },
            { word: "handshake failure", weight: 0.9 }
        ]
    },

    // ─── Concurrency / Race Condition Errors ──────────────────────────────────
    {
        type: "concurrency",
        keywords: [
            { word: "deadlock", weight: 0.95 },
            { word: "race condition", weight: 0.9 },
            { word: "data race", weight: 0.95 },              // Go
            { word: "concurrent modification", weight: 0.9 }, // Java
            { word: "lock timeout", weight: 0.85 },
            { word: "mutex", weight: 0.7 },
            { word: "semaphore", weight: 0.65 },
            { word: "livelock", weight: 0.9 },
            { word: "thread panic", weight: 0.9 }            // Rust
        ]
    },

    // ─── Environment / Configuration Errors ──────────────────────────────────
    {
        type: "environment",
        keywords: [
            { word: "environment variable", weight: 0.75 },
            { word: "env var", weight: 0.75 },
            { word: "not set", weight: 0.5 },
            { word: "missing required env", weight: 0.9 },
            { word: "invalid configuration", weight: 0.85 },
            { word: "config error", weight: 0.85 },
            { word: "invalid yaml", weight: 0.9 },
            { word: "invalid json", weight: 0.9 },
            { word: "invalid toml", weight: 0.9 },
            { word: "failed to parse config", weight: 0.9 }
        ]
    }
];


export const heuristicWords = {
    // ─── High Severity — Explicit Errors ────────────────────────────────────
    error: 1.0, exception: 1.0, failed: 0.9, failure: 0.9,
    fatal: 0.9, crash: 0.8, panic: 0.9, abort: 0.8, died: 0.8,
    critical: 0.9, severe: 0.8, alert: 0.7,

    // ─── Error Type Names (single-word / camelCase / concatenated) ──────────
    // JS / TS
    referenceerror: 1.0, typeerror: 1.0, syntaxerror: 1.0, rangeerror: 1.0,
    urierror: 0.9, evalerror: 0.9,
    // General / cross-language
    parseerror: 0.9, assertionerror: 0.9,
    // Python
    ioerror: 0.9, oserror: 0.8, valueerror: 0.9, runtimeerror: 0.9,
    nameerror: 0.9, attributeerror: 0.9, importerror: 0.9, keyerror: 0.9,
    indexerror: 0.9, stopiteration: 0.7, recursionerror: 0.9,
    memoryerror: 0.95, filenotfounderror: 0.95, permissionerror: 0.9,
    zerodivisionerror: 0.9, overflowerror: 0.9, unicodedecodeerror: 0.85,
    unicodeencodeerror: 0.85, timeouterror: 0.9,
    // Java / JVM
    nullpointerexception: 1.0, classcastexception: 0.9, stackoverflowerror: 0.95,
    outofmemoryerror: 0.95, arrayindexoutofboundsexception: 0.9,
    illegalargumentexception: 0.85, illegalstateexception: 0.85,
    classnotfoundexception: 0.9, nosuchmethodexception: 0.9,
    concurrentmodificationexception: 0.9,
    // C# / .NET
    nullreferenceexception: 1.0, invalidcastexception: 0.9,
    invalidoperationexception: 0.85, indexoutofrangeexception: 0.9,
    stackoverflowexception: 0.95, outofmemoryexception: 0.95,
    // Ruby
    nomethoderror: 0.95, loadererror: 0.9, argumenterror: 0.85,
    // Go / Rust (surfaced as text)
    networkerror: 0.9, connectionerror: 0.9,

    // ─── Code-Level Issue Words ──────────────────────────────────────────────
    undefined: 0.7, null: 0.6, invalid: 0.7, unexpected: 0.6,
    unhandled: 0.8, uncaught: 0.8, missing: 0.7, notfound: 0.8,
    denied: 0.7, forbidden: 0.7, unauthorized: 0.7, timeout: 0.7, refused: 0.8,
    unreachable: 0.7, unsupported: 0.7, unresolved: 0.8, unrecognized: 0.7,

    // ─── Soft Signals ────────────────────────────────────────────────────────
    warning: 0.2, warn: 0.4, deprecated: 0.3, notice: 0.2, info: 0.1, debug: 0.1,
    hint: 0.1, suggestion: 0.1,

    // ─── System / OS / POSIX Error Codes ────────────────────────────────────
    eacces: 0.8, enoent: 0.8, econnrefused: 0.9, eaddrinuse: 0.8,
    enotdir: 0.7, emfile: 0.7, enomem: 0.8, eperm: 0.8,
    econnreset: 0.85, etimedout: 0.85, eexist: 0.75, enotempty: 0.7,
    ebusy: 0.7, ebadf: 0.75, epipe: 0.75, ehostunreach: 0.85,
    enetunreach: 0.85, enotconn: 0.8,
    // Windows system error names
    "access is denied": 1.0,
    "the system cannot find": 0.95,

    // ─── Crash / Signal / Process ────────────────────────────────────────────
    segfault: 0.9, sigsegv: 0.9, sigbus: 0.85, sigabrt: 0.85, sigkill: 0.85,
    sigterm: 0.6, oom: 0.9,
    "segmentation fault": 0.9, "bus error": 0.85, "illegal instruction": 0.9,
    "floating point exception": 0.9, "stack overflow": 0.9,
    "exit code": 0.6, "killed": 0.7, "core dumped": 0.95,
    "aborted (core dumped)": 0.95,
    // Go / Rust runtime panics
    "goroutine": 0.5, "the application panicked": 0.95,

    // ─── Memory ──────────────────────────────────────────────────────────────
    "out of memory": 0.95, "heap space": 0.9,
    "gc overhead limit exceeded": 0.9, "cannot allocate memory": 0.95,
    "bad alloc": 0.95,                          // C++ std::bad_alloc
    "memory corruption": 0.95, "use after free": 0.95, "double free": 0.95,
    "buffer overflow": 0.95, "stack smashing detected": 0.95,  // C/C++

    // ─── Dependency / Module / Build ────────────────────────────────────────
    "module not found": 1.0, "cannot find module": 1.0,
    "no module named": 1.0,                     // Python
    "cannot load such file": 1.0,               // Ruby
    "cannot find package": 0.95,                // Go
    "package does not exist": 0.9,              // Java
    "could not resolve": 0.9, "cannot resolve": 0.9,
    "not installed": 0.8, "missing dependency": 0.9,
    "unresolved import": 0.9,                   // Rust
    "cannot find": 0.9, "not found": 0.9,
    "build failed": 0.9, "compilation failed": 0.9, "compile error": 0.9,
    "linker error": 0.9, "undefined reference to": 0.9,  // C/C++
    "aborting due to previous error": 0.95,     // Rust
    "npm err": 0.9, "yarn error": 0.9, "pnpm error": 0.9,
    "make: ***": 0.9, "ld returned": 0.9,       // C/C++ make/ld
    "execution failed for task": 0.9,           // Gradle
    "msbuild error": 0.9,                       // .NET

    // ─── Database ────────────────────────────────────────────────────────────
    "query failed": 0.8, "constraint violation": 0.8, "duplicate key": 0.7,
    "unique constraint": 0.85, "foreign key constraint": 0.85,
    "relation does not exist": 0.9,             // PostgreSQL
    "table doesn't exist": 0.9,                 // MySQL
    "no such table": 0.9,                       // SQLite
    "transaction aborted": 0.85, "deadlock": 0.9, "deadlock detected": 0.95,
    "connection pool": 0.75, "too many connections": 0.85,
    "could not connect to server": 0.9,         // PostgreSQL

    // ─── Network / DNS ───────────────────────────────────────────────────────
    "connection refused": 0.9, "connection reset": 0.85,
    "network unreachable": 0.85, "host unreachable": 0.85,
    "no route to host": 0.9, "no route": 0.7,
    "no such host": 0.9, "unknown host": 1.0,
    "name or service not known": 0.9,           // Linux DNS
    "nodename nor servname provided": 0.9,      // macOS DNS
    "temporary failure in name resolution": 0.9,
    "dns lookup": 0.7, "dns lookup failed": 0.9,
    "server not found": 1.0, "socket hang up": 0.85,
    offline: 0.6, socket: 0.5,

    // ─── Timeout ─────────────────────────────────────────────────────────────
    "timed out": 0.9, "request timeout": 0.9, "read timeout": 0.85,
    "connect timeout": 0.85, "deadline exceeded": 0.95,     // gRPC / Go
    "context deadline exceeded": 0.95,          // Go
    "operation timed out": 0.9,                 // macOS / curl

    // ─── HTTP ─────────────────────────────────────────────────────────────────
    "400 bad request": 0.8, "401 unauthorized": 0.9, "403 forbidden": 0.9,
    "404 not found": 0.85, "409 conflict": 0.8, "429 too many requests": 0.9,
    "500 internal server error": 0.95, "502 bad gateway": 0.9,
    "503 service unavailable": 0.9, "504 gateway timeout": 0.9,
    "bad gateway": 0.9, "service unavailable": 0.85,

    // ─── SSL / TLS ───────────────────────────────────────────────────────────
    "certificate verify failed": 0.95, "ssl handshake failed": 0.9,
    "tls handshake": 0.85, "certificate has expired": 0.95,
    "self signed certificate": 0.85, "unable to verify the first certificate": 0.9,
    "unknown ca": 0.85, "handshake failure": 0.85,

    // ─── Authentication ──────────────────────────────────────────────────────
    "authentication failed": 0.9, "invalid credentials": 0.9,
    "token expired": 0.85, "invalid token": 0.85,
    "signature verification failed": 0.9, "invalid api key": 0.95,
    "bad credentials": 0.85,
    "permission denied (publickey)": 0.95,      // SSH

    // ─── Git ─────────────────────────────────────────────────────────────────
    "merge conflict": 0.9, "rebase failed": 0.85, "not a git repository": 0.95,
    "non-fast-forward": 0.85, "cannot lock ref": 0.85,

    // ─── Container / Orchestration ───────────────────────────────────────────
    "cannot connect to the docker daemon": 0.95,
    "image not found": 0.85, "container failed": 0.85, "no space left on device": 0.9,
    crashloopbackoff: 0.95, imagepullbackoff: 0.95, oomkilled: 0.95,

    // ─── Permission / Filesystem ─────────────────────────────────────────────
    "permission denied": 1.0, "operation not permitted": 0.95,
    "access denied": 0.9, "no such file or directory": 1.0,
    "file not found": 0.95, "directory not found": 0.9,
    "command not found": 1.0, "not recognized": 1.0,
    "address already in use": 1.0,

    // ─── Concurrency ─────────────────────────────────────────────────────────
    "race condition": 0.9, "data race": 0.95,   // Go race detector
    "concurrent modification": 0.9,             // Java
    "lock timeout": 0.8, livelock: 0.85,

    // ─── Environment / Configuration ─────────────────────────────────────────
    "invalid configuration": 0.8, "config error": 0.8,
    "invalid yaml": 0.85, "invalid json": 0.85, "invalid toml": 0.85,
    "failed to parse config": 0.9,
    "environment variable": 0.6, "missing required env": 0.85,

    // ─── Generic Failure Words ────────────────────────────────────────────────
    fail: 0.8, broken: 0.7, corrupted: 0.8, malformed: 0.7,
    incomplete: 0.6, rejected: 0.75, terminated: 0.7,
};

export const strongSignalPatterns = [
    // ─── Stack Trace Frames ──────────────────────────────────────────────────
    /at\s+\S+\s+\(/,                                      // JS/TS/Java/Kotlin/C#: "at Module.<anonymous> ("
    /at\s+java\./i,                                        // Java stdlib frame
    /at\s+kotlin\./i,                                      // Kotlin stdlib frame
    /at\s+android\./i,                                     // Android
    /at\s+com\./i,                                         // Java/Kotlin user code
    /at\s+org\./i,                                         // Java/Kotlin user code
    /\s+at\s+0x[0-9a-fA-F]+/,                             // C/C++/Rust raw address frames
    /\s+#\d+\s+0x[0-9a-fA-F]+/,                           // GDB / LLDB backtrace: "#0 0x..."
    /File\s+"[^"]+",\s+line\s+\d+/,                       // Python traceback
    /^\s+at\s+.+\(.+:\d+:\d+\)/m,                         // JS/TS with file:line:col
    /^\s+File\s+".+",\s+line\s+\d+,\s+in\s+/m,           // Python traceback inner frames
    /^\s+from\s+.+:\d+:\s+/m,                             // Ruby backtrace
    /\S+\.rb:\d+:in\s+`/,                                 // Ruby: "foo.rb:10:in `bar'"
    /\S+\.py[co]?\(\d+\)/,                                 // Python compiled frame
    /^\s+-+>\s+\d+\|/m,                                   // Rails / Ruby highlighted line
    /\S+\.(go):\d+/,                                      // Go: "main.go:42"
    /\S+\.(rs):\d+:\d+/,                                  // Rust: "src/main.rs:10:5"
    /\S+\.(cpp|cc|cxx|c|h):\d+:\d*:?\s/,                 // C/C++: "foo.cpp:10:3: error"
    /\S+\.(php):\d+/,                                     // PHP stack frame
    /\S+\.(cs):\d+/,                                      // C#: "Foo.cs:42"
    /\s+at\s+\S+\s+in\s+\S+:line\s+\d+/i,               // .NET: "at Foo() in Bar.cs:line 42"

    // ─── Traceback / Backtrace Headers ───────────────────────────────────────
    /Traceback\s+\(most recent call last\)/i,              // Python
    /Traceback\s+\(innermost last\)/i,                     // Python (older)
    /^Caused by:/m,                                        // Java / Kotlin chained exceptions
    /^During handling of the above exception/m,            // Python chained exceptions
    /^The above exception was the direct cause/m,          // Python chained exceptions
    /stack backtrace:/i,                                   // Rust panic
    /note: run with `RUST_BACKTRACE/,                      // Rust backtrace hint

    // ─── Panic / Thread Crash ────────────────────────────────────────────────
    /thread\s+'[^']+'\s+panicked/i,                        // Rust: thread 'main' panicked
    /goroutine\s+\d+\s+\[/,                               // Go goroutine dump
    /panic:\s+/i,                                          // Go / Rust panic message
    /^panic\b/im,                                          // Go bare "panic" line
    /fatal goroutine/i,                                    // Go runtime fatal
    /runtime error:/i,                                     // Go runtime error
    /^fatal:\s+/im,                                        // General fatal prefix
    /^FATAL\s+/m,                                          // Log-level FATAL

    // ─── Error / Exception Line Starters ─────────────────────────────────────
    /^Error:\s+/im,
    /^Exception:\s+/im,
    /^Fatal:\s+/im,
    /^Panic:\s+/im,
    /^Error\s+/m,
    /^Unhandled\s+exception/im,                            // .NET / Java
    /^Unhandled\s+rejection/im,                            // Node.js promise
    /^Uncaught\s+/im,                                      // Browser / Node.js
    /^EXCEPTION:\s+/m,                                     // Spring / Java frameworks
    /^\s*\^\s*$/m,                                         // Python/JS caret pointing to error column

    // ─── JavaScript / TypeScript ─────────────────────────────────────────────
    /ReferenceError/i,
    /TypeError/i,
    /SyntaxError/i,
    /RangeError/i,
    /URIError/i,
    /EvalError/i,
    /AggregateError/i,

    // ─── Python ──────────────────────────────────────────────────────────────
    /ValueError/,
    /KeyError/,
    /AttributeError/,
    /ImportError/,
    /ModuleNotFoundError/,
    /IndentationError/,
    /ZeroDivisionError/,
    /IndexError/,
    /NameError/,
    /RuntimeError/,
    /RecursionError/,
    /MemoryError/,
    /OverflowError/,
    /OSError/,
    /IOError/,
    /FileNotFoundError/,
    /PermissionError/,
    /TimeoutError/,
    /UnicodeDecodeError/,
    /UnicodeEncodeError/,
    /StopIteration/,
    /AssertionError/,
    /NotImplementedError/,
    /SystemExit/,

    // ─── Rust ─────────────────────────────────────────────────────────────────
    /thread\s+'[^']+'\s+panicked/i,
    /called\s+`Option::unwrap\(\)`\s+on\s+a\s+`None`\s+value/,
    /called\s+`Result::unwrap\(\)`\s+on\s+an\s+`Err`\s+value/,
    /attempt to .+ with overflow/i,                        // Rust integer overflow
    /attempt to divide by zero/i,
    /index out of bounds/i,
    /already borrowed/i,                                   // Rust borrow checker (runtime)
    /error\[E\d{4}\]/,                                     // Rust compiler error codes: E0308 etc.
    /aborting due to \d+ previous error/i,

    // ─── Go ───────────────────────────────────────────────────────────────────
    /goroutine\s+\d+\s+\[/,
    /runtime error:\s+/i,
    /invalid memory address or nil pointer dereference/i,
    /concurrent map (read and map write|writes)/i,
    /send on closed channel/i,
    /index out of range\s+\[\d+\]/i,
    /slice bounds out of range/i,
    /interface conversion:\s+/i,
    /cannot use .+ as type/i,

    // ─── Java / Kotlin / JVM ─────────────────────────────────────────────────
    /NullPointerException/,
    /ArrayIndexOutOfBoundsException/,
    /ClassNotFoundException/,
    /ClassCastException/,
    /StackOverflowError/,
    /OutOfMemoryError/,
    /IllegalArgumentException/,
    /IllegalStateException/,
    /UnsupportedOperationException/,
    /ConcurrentModificationException/,
    /NumberFormatException/,
    /NoSuchMethodException/,
    /NoSuchMethodError/,
    /ExceptionInInitializerError/,
    /java\.lang\.\w+Exception/,                            // Any java.lang exception
    /java\.lang\.\w+Error/,                                // Any java.lang error
    /Exception in thread\s+"[^"]+"/,                       // JVM thread exception header
    /Process finished with exit code [^0]/,                // IntelliJ / JVM non-zero exit

    // ─── C# / .NET ───────────────────────────────────────────────────────────
    /NullReferenceException/,
    /InvalidCastException/,
    /InvalidOperationException/,
    /IndexOutOfRangeException/,
    /StackOverflowException/,
    /OutOfMemoryException/,
    /ArgumentNullException/,
    /ArgumentOutOfRangeException/,
    /NotImplementedException/,
    /UnhandledException/,
    /System\.\w+Exception/,                                // Any System.* exception
    /Unhandled exception\. System\./i,                     // .NET runtime crash header

    // ─── Ruby ─────────────────────────────────────────────────────────────────
    /NoMethodError/,
    /NameError/,
    /ArgumentError/,
    /RuntimeError/,
    /LoadError/,
    /SyntaxError/,
    /TypeError/,
    /ZeroDivisionError/,
    /Errno::[A-Z]+/,                                       // Ruby POSIX errors: Errno::ENOENT
    /\S+\.rb:\d+:in\s+`/,                                 // Ruby backtrace frame
    /bundler:\s+failed/i,                                  // Bundler errors

    // ─── PHP ──────────────────────────────────────────────────────────────────
    /^(Fatal|Parse|Warning|Notice)\s+error:/im,            // PHP error types
    /PHP\s+(Fatal|Parse|Warning|Notice)\s+error/i,
    /Uncaught\s+\w+Exception/i,                            // PHP uncaught exceptions
    /Call\s+to\s+undefined\s+(function|method)/i,
    /Class\s+['"]?\w+['"]?\s+not\s+found/i,
    /on line\s+\d+/i,                                      // PHP error suffix
    /Stack trace:/,                                        // PHP stack trace header

    // ─── C / C++ ──────────────────────────────────────────────────────────────
    /\S+\.(cpp|cc|cxx|c|h):\d+:\d*:?\s*(error|warning|note):/i,
    /undefined reference to\s+`/i,                         // Linker error
    /multiple definition of\s+`/i,                         // Linker error
    /ld\s+returned\s+\d+\s+exit\s+status/i,               // Linker fatal
    /make:\s+\*\*\*/i,                                     // Make failure
    /collect2:\s+error/i,                                  // GCC linker wrapper
    /clang:\s+error:/i,
    /: error:/i,                                           // Generic compiler error suffix
    /terminate called after throwing/i,                    // C++ std::terminate
    /terminate called without an active exception/i,
    /what\(\):\s+/,                                        // C++ exception.what()
    /double free or corruption/i,
    /free\(\): invalid pointer/i,
    /malloc: error/i,                                      // macOS malloc errors
    /ASAN:\s+/i,                                           // AddressSanitizer
    /heap-buffer-overflow/i,
    /use-after-free/i,
    /stack-buffer-overflow/i,

    // ─── POSIX / OS Error Codes ───────────────────────────────────────────────
    /\bEACCES\b/,
    /\bENOENT\b/,
    /\bECONNREFUSED\b/,
    /\bEADDRINUSE\b/,
    /\bEPERM\b/,
    /\bENOTDIR\b/,
    /\bECONNRESET\b/,
    /\bETIMEDOUT\b/,
    /\bENOMEM\b/,
    /\bEEXIST\b/,
    /\bEPIPE\b/,
    /\bEBUSY\b/,
    /\bEBADF\b/,
    /\bEHOSTUNREACH\b/,
    /\bENETUNREACH\b/,
    /\bEMFILE\b/,

    // ─── Signals / Process Exit ───────────────────────────────────────────────
    /segmentation\s+fault/i,
    /\bSIGSEGV\b/,
    /\bSIGABRT\b/,
    /\bSIGBUS\b/,
    /\bSIGFPE\b/,
    /\bSIGILL\b/,
    /\bSIGKILL\b/,
    /signal\s+\d+/i,
    /killed/i,
    /exit\s+code\s+[^0]\d*/i,                             // Non-zero exit code
    /exit\s+status\s+[^0]\d*/i,                           // Non-zero exit status
    /core\s+dumped/i,
    /abort(?:ed)?\s*\(core\s+dumped\)/i,
    /bus\s+error/i,

    // ─── Build / Compilation ─────────────────────────────────────────────────
    /build\s+failed/i,
    /compilation\s+failed/i,
    /compile\s+error/i,
    /cargo\s+(build|test|run)\s+.*failed/i,               // Rust/Cargo
    /go\s+build\b/i,                                      // Go build error
    /javac.*error/i,                                      // Java compiler
    /kotlinc.*error/i,                                    // Kotlin compiler
    /tsc.*error/i,                                        // TypeScript compiler
    /npm\s+err/i,
    /yarn\s+error/i,
    /pnpm\s+err/i,
    /pip.*error/i,
    /bundler.*error/i,                                    // Ruby Bundler
    /could not compile\s+`/i,                             // Rust: "could not compile `foo`"
    /error\s+during\s+collection/i,                      // pytest collection error

    // ─── Dependency / Module ─────────────────────────────────────────────────
    /module\s+not\s+found/i,
    /cannot\s+find\s+module/i,
    /no\s+module\s+named\s+['"`]/i,                       // Python
    /cannot\s+load\s+such\s+file/i,                       // Ruby
    /cannot\s+find\s+package/i,                           // Go
    /package\s+\S+\s+does\s+not\s+exist/i,               // Java
    /cannot\s+find/i,
    /not\s+found/i,

    // ─── Database ─────────────────────────────────────────────────────────────
    /relation\s+"\S+"\s+does\s+not\s+exist/i,            // PostgreSQL
    /Table\s+'\S+'\s+doesn't\s+exist/i,                  // MySQL
    /no\s+such\s+table:\s+/i,                             // SQLite
    /duplicate\s+key\s+value\s+violates/i,                // PostgreSQL unique constraint
    /deadlock\s+detected/i,
    /could\s+not\s+connect\s+to\s+server/i,              // PostgreSQL

    // ─── Network / TLS ────────────────────────────────────────────────────────
    /connection\s+refused/i,
    /connection\s+reset\s+by\s+peer/i,
    /no\s+route\s+to\s+host/i,
    /network\s+is\s+unreachable/i,
    /name\s+or\s+service\s+not\s+known/i,                // Linux DNS failure
    /temporary\s+failure\s+in\s+name\s+resolution/i,
    /certificate\s+verify\s+failed/i,
    /ssl\s+handshake\s+failed/i,
    /tls\s+handshake\s+timeout/i,

    // ─── Container / Kubernetes ───────────────────────────────────────────────
    /cannot\s+connect\s+to\s+the\s+docker\s+daemon/i,
    /OOMKilled/,
    /CrashLoopBackOff/,
    /ImagePullBackOff/,
    /Error\s+response\s+from\s+daemon/i,

    // ─── Generic High-Signal Patterns ────────────────────────────────────────
    /fatal\s+error/i,
    /internal\s+error/i,
    /unexpected\s+error/i,
    /unrecoverable\s+error/i,
    /assertion\s+failed/i,
    /assertion\s+error/i,
    /invariant\s+violation/i,
    /illegal\s+instruction/i,
    /floating\s+point\s+exception/i,
];




export const commandRegistry: CommandMeta[] = [
    // JavaScript / TypeScript / Node ecosystem
    { command: "node", language: "javascript", runtime: "node" },
    { command: "npm", language: "javascript", runtime: "node" },
    { command: "npx", language: "javascript", runtime: "node" },
    { command: "yarn", language: "javascript", runtime: "node" },
    { command: "pnpm", language: "javascript", runtime: "node" },
    { command: "bun", language: "javascript", runtime: "bun" },
    { command: "deno", language: "typescript", runtime: "deno" },
    { command: "tsc", language: "typescript", runtime: "node" },
    { command: "vite", language: "javascript", runtime: "node" },
    { command: "webpack", language: "javascript", runtime: "node" },

    // Python
    { command: "python", language: "python", runtime: "cpython" },
    { command: "python3", language: "python", runtime: "cpython" },
    { command: "pip", language: "python", runtime: "cpython" },
    { command: "pip3", language: "python", runtime: "cpython" },
    { command: "poetry", language: "python", runtime: "cpython" },
    { command: "pipenv", language: "python", runtime: "cpython" },
    { command: "conda", language: "python", runtime: "anaconda" },

    // Java / JVM
    { command: "java", language: "java", runtime: "jvm" },
    { command: "javac", language: "java", runtime: "jvm" },
    { command: "mvn", language: "java", runtime: "jvm" },
    { command: "gradle", language: "java", runtime: "jvm" },
    { command: "kotlin", language: "kotlin", runtime: "jvm" },
    { command: "kotlinc", language: "kotlin", runtime: "jvm" },

    // Go
    { command: "go", language: "go", runtime: "go" },

    // Rust
    { command: "cargo", language: "rust", runtime: "rust" },
    { command: "rustc", language: "rust", runtime: "rust" },
    { command: "rustup", language: "rust", runtime: "rust" },

    // Ruby
    { command: "ruby", language: "ruby", runtime: "mri" },
    { command: "gem", language: "ruby", runtime: "mri" },
    { command: "bundle", language: "ruby", runtime: "mri" },
    { command: "rails", language: "ruby", runtime: "mri" },

    // PHP
    { command: "php", language: "php", runtime: "php" },
    { command: "composer", language: "php", runtime: "php" },
    { command: "artisan", language: "php", runtime: "php" },

    // C / C++
    { command: "gcc", language: "c", runtime: null },
    { command: "g++", language: "cpp", runtime: null },
    { command: "clang", language: "c", runtime: null },
    { command: "make", language: null, runtime: null },
    { command: "cmake", language: null, runtime: null },

    // C#
    { command: "dotnet", language: "csharp", runtime: "dotnet" },

    // Swift
    { command: "swift", language: "swift", runtime: "swift" },

    // Version control
    { command: "git", language: null, runtime: null },
    { command: "svn", language: null, runtime: null },
    { command: "hg", language: null, runtime: null },

    // Containers / orchestration / infra
    { command: "docker", language: null, runtime: "docker" },
    { command: "docker-compose", language: null, runtime: "docker" },
    { command: "kubectl", language: null, runtime: "kubernetes" },
    { command: "helm", language: null, runtime: "kubernetes" },
    { command: "terraform", language: null, runtime: null },
    { command: "ansible", language: null, runtime: null },

    // Databases / CLIs
    { command: "psql", language: "sql", runtime: "postgresql" },
    { command: "mysql", language: "sql", runtime: "mysql" },
    { command: "mongosh", language: "javascript", runtime: "mongodb" },
    { command: "redis-cli", language: null, runtime: "redis" },
    { command: "sqlite3", language: "sql", runtime: "sqlite" },

    // Package/version managers (general/system)
    { command: "brew", language: null, runtime: null },
    { command: "apt", language: null, runtime: null },
    { command: "choco", language: null, runtime: null },

    // Cloud CLIs
    { command: "aws", language: null, runtime: null },
    { command: "gcloud", language: null, runtime: null },
    { command: "az", language: null, runtime: null },
];

