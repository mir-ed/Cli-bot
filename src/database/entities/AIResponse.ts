import {
    Entity, PrimaryColumn, Column,
    OneToOne,
    JoinColumn, } from "typeorm";


import { Request } from "./Request.js";
import { ActionProposal } from "./ActionProposal.js";

import { AIResponseType } from "../enums/enum.js";

@Entity("ai_responses")
export class AIResponse {
    @PrimaryColumn("text")
    id!: string;

    @Column("text", { unique: true })
    request_id!: string;

    @Column({
        type: "text",
        enum: AIResponseType,
    })
    request_type!: AIResponseType;


    @Column("text")
    provider!: string;

    @Column("text")
    model!: string;

    @Column("text")
    response_content!: string;

    @Column("integer")
    duration!: number;

    @Column("text")
    created_at!: string;

    @OneToOne(() => Request, (request) => request.ai_response)
    @JoinColumn({ name: "request_id" })
    request!: Request;

    @OneToOne(
        () => ActionProposal,
        (proposal) => proposal.ai_response
    )
    action_proposal!: ActionProposal;
}
