import {
    Entity, PrimaryColumn, Column,
    OneToOne,
    JoinColumn, } from "typeorm";
    import type { Relation } from "typeorm";

import { AIResponse } from "./AIResponse.js";
import { ActionStatus } from "../enums/enum.js";

@Entity("action_proposals")
export class ActionProposal {
    @PrimaryColumn("text")
    action_id!: string;

    @Column("text", { unique: true })
    ai_output_id!: string;

    @Column("text")
    correlation_id!: string;

    @Column("text")
    action_content!: string;

    @Column({
        type: "text",
        enum: ActionStatus,
    })
    status!: ActionStatus;

    @Column("text")
    created_at!: string;

    @Column("text", { nullable: true })
    approved_at!: string | null;


    @OneToOne(
        () => AIResponse,
        (response) => response.action_proposal
    )
    @JoinColumn({ name: "ai_output_id" })
    ai_response!: Relation<AIResponse>;
}
