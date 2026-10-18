import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    Unique,
    Index,
} from "typeorm";
import type { Relation } from "typeorm";
import { Event } from "../../database/entities/Event.js";


// 1. OUTBOX
// One row per event that needs to be dispatched.

@Entity("outbox")
export class Outbox {
    @PrimaryGeneratedColumn("uuid")
    outbox_id!: string;

    @Column("text", { unique: true })
    event_id!: string;

    @ManyToOne(() => Event, { onDelete: "CASCADE" })
    @JoinColumn({ name: "event_id" })
    event!: Relation<Event>;

    // "pending" | "dispatched" | "failed"
    @Column("text")
    status!: string;

    @Column("text")
    created_at!: string;

    @Column("text", { nullable: true })
    dispatched_at!: string | null;

    @Column("text", { nullable: true })
    error!: string | null;
}


// 2. DISPATCH
// One row per (event, handler) pair.
// The unique constraint prevents duplicate jobs being enqueued.

@Entity("dispatches")
@Unique(["event_id", "handler_id"])
export class Dispatch {
    @PrimaryGeneratedColumn("uuid")
    dispatch_id!: string;

    @Column("text")
    event_id!: string;

    @ManyToOne(() => Event, { onDelete: "CASCADE" })
    @JoinColumn({ name: "event_id" })
    event!: Relation<Event>;

    // The handler registered in Cli-bot's Event Registry.
    @Column("text")
    handler_id!: string;

    // "pending" | "enqueued" | "completed" | "failed"
    @Column("text")
    status!: string;

    // Filled after LiteQ accepts the job.
    @Column("text", { nullable: true })
    job_id!: string | null;

    @Column("text")
    created_at!: string;

    @Column("text", { nullable: true })
    enqueued_at!: string | null;

    @Column("text", { nullable: true })
    completed_at!: string | null;

    @Column("text", { nullable: true })
    error!: string | null;
}