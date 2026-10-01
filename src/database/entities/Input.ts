import {
    Entity, PrimaryColumn, Column, ManyToOne,
    OneToMany,
    JoinColumn,PrimaryGeneratedColumn } from "typeorm";
import type { Relation } from "typeorm";

import { Session } from "./Session.js";
import { Request } from "./Request.js";

@Entity("inputs")
export class Input {
    @PrimaryGeneratedColumn("uuid")
    input_id!: string;

    @Column("text")
    session_id!: string;

    @Column("text")
    correlation_id!: string;

    @Column("text")
    message!: string;

    @Column("text")
    created_at!: string;


    @ManyToOne(() => Session, (session) => session.inputs)
    @JoinColumn({ name: "session_id" })
    session!: Relation<Session>;

    @OneToMany(() => Request, (request) => request.input)
    requests!: Relation<Request[]>;
}


