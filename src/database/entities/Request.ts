import {
    Entity, PrimaryColumn, Column, ManyToOne,
    OneToOne,
    JoinColumn, } from "typeorm";

import { Input } from "./Input.js";
import { Process } from "./Process.js";
import { AIResponse } from "./AIResponse.js";

import { RequestType, ResquestStatus } from "../enums/enum.js";


@Entity("requests")
export class Request {
    @PrimaryColumn("text")
    request_id!: string;

    @Column("text")
    correlation_id!: string;

    @Column("text")
    input_id!: string;

    @Column("text")
    classification_outcome!: string;

    @Column("text", { nullable: true })
    context!: string | null;

    @Column({
        type: "text",
        enum: RequestType,
    })
    request_type!: RequestType;

    @Column({
        type: "text",
        enum: ResquestStatus,
    })
    status!: ResquestStatus;


    @Column("text")
    created_at!: string;

    @Column("text", { nullable: true })
    completed_at!: string | null;

    @ManyToOne(() => Input, (input) => input.requests)
    @JoinColumn({ name: "input_id" })
    input!: Input;

    @OneToOne(() => Process, (process) => process.request)
    process!: Process;

    @OneToOne(() => AIResponse, (response) => response.request)
    ai_response!: AIResponse;
}





