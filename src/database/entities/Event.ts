import { Entity, PrimaryColumn, Column , PrimaryGeneratedColumn} from "typeorm";
import type { Relation } from "typeorm";

@Entity("events")
export class Event {
    @PrimaryGeneratedColumn("uuid")
    event_id!: string;

    @Column("text")
    correlation_id!: string;

    @Column("integer")
    sequence_number!: number;

    @Column("text")
    event_type!: string;

    @Column("text")
    entity_type!: string;

    @Column("text")
    entity_id!: string;

    @Column("text")
    data!: string;

    @Column("text")
    source_component!: string;

    @Column("text")
    created_at!: string;
}