import readline from "node:readline";

let rlRef: readline.Interface | null = null;

export function setRl(rl: readline.Interface) {
    rlRef = rl;
}

export function printAsync(text: string) {
    if (!rlRef) {
        console.log(text);
        return;
    }
    readline.cursorTo(process.stdout, 0);
    readline.clearLine(process.stdout, 0);   
    console.log(text);                       
    rlRef.prompt(true);                     
}