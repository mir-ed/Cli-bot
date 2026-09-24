import {
    Entity, PrimaryColumn, Column, OneToOne,
    OneToMany,
    JoinColumn,
} from "typeorm";

import { Request } from "./Request.js";
import { ProcessOutput } from "./ProcessOutput.js";

import { ProcessState } from "../enums/enum.js"

@Entity("processes")
export class Process {
    @PrimaryColumn("text")
    process_id!: string;

    @Column("text")
    correlation_id!: string;

    @Column("text", { unique: true })
    request_id!: string;

    @Column("integer")
    pid!: number;

    @Column("text")
    command!: string;

    @Column("text")
    arguments!: string;

    @Column({
        type: "text",
        enum: ProcessState,
    })
    current_state!: ProcessState;


    @Column("integer", { nullable: true })
    parent_pid!: number | null;

    @Column("text")
    start_time!: string;

    @Column("text", { nullable: true })
    end_time!: string | null;

    @Column("integer", { nullable: true })
    exit_code!: number | null;


    @OneToOne(() => Request, (request) => request.process)
    @JoinColumn({ name: "request_id" })
    request!: Request;

    @OneToMany(
        () => ProcessOutput,
        (output) => output.process
    )
    outputs!: ProcessOutput[];
}




