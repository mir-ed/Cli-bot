import {
    Entity, PrimaryColumn, Column,
    OneToOne,
    ManyToOne,
    JoinColumn,
} from "typeorm";

import type { Relation } from "typeorm";
import { Process } from "./Process.js";
import { StreamType } from "../enums/enum.js";



@Entity("process_outputs")
export class ProcessOutput {
    @PrimaryColumn("text")
    output_id!: string;

    @Column("text")
    process_id!: string;

    @Column({
        type: "text",
        enum: StreamType,
    })
    stream_type!: StreamType;

    @Column("text")
    main_content!: string;

    @Column("text")
    correlation_id!: string;

    @Column("text")
    created_at!: string;

    @ManyToOne(() => Process, (process) => process.outputs)
    @JoinColumn({ name: "process_id" })
    process!: Relation<Process>;
}

