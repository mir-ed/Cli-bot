import { describe, expect, it } from "vitest";
import { isEmptyCommand, confirmCmd, getRuntimeLanguage } from "../src/utils/parser"

describe("isEmptyCommand", () => {
    it("returns true when input is an empty string", () => {
        expect(isEmptyCommand(" ")).toBe(true)
    })

    it("returns true when input is cli-bot", () => {
        expect(isEmptyCommand("cli-bot")).toBe(true)
    })

    it("returns false when input is just a single word command with no argument", () => {
        expect(isEmptyCommand("python")).toBe(false)
    })

    it("returns false when input contains a command", () => {
        expect(isEmptyCommand("python main.py")).toBe(false)
    })
})


describe("Command Handling", () => {
    it("returns the command if it is found in command registry", () => {
        expect(confirmCmd("npm")).toEqual({
            status: "valid",
            command: "npm"
        })
    })

    describe("command doesn't exist in the command registry", () => {


        it("returns suggestion when levenshtein distance is within threshold", () => {
            expect(confirmCmd("puthon")).toEqual({
                status: "suggestion",
                command: "puthon",
                suggestion: "python",

            })
        })


        it("returns invalid when levenshtein distance exceeds threshold", () => {
            expect(confirmCmd("puter")).toEqual({
                status: "invalid",
                command: "puter"
            })
        })
    })

})

describe("Runtime and language detection", () => {
    it("returns the runtime and language of the command if it is present in command registry", () => {
        expect(getRuntimeLanguage("python")).toEqual({
            runtime: "cpython",
            language: "python"
        })
    })

    it("return 'infer from error' signal when command is not present in command register", () => {
        expect(getRuntimeLanguage("puter")).toEqual({
            runtime: "infer from error",
            language: "infer from error"
        })
    })

})