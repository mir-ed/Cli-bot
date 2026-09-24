import { Entity, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn} from "typeorm";
import { Workspace } from "./Workspace.js";
import { Device } from "./Device.js";
import { Input } from "./Input.js";
import { SessionStatus } from "../enums/enum.js";

@Entity("sessions")
export class Session {
    @PrimaryColumn("text")
    session_id!: string;

    @Column("text")
    workspace_id!: string;

    @Column("text")
    device_id!: string;

    @Column("text")
    started_at!: string;

    @Column("text", { nullable: true })
    ended_at!: string | null;

    @Column({
        type: "text",
        enum: SessionStatus,
    })
    status!: SessionStatus;

    @ManyToOne(() => Workspace, (workspace) => workspace.sessions)
    @JoinColumn({ name: "workspace_id" })
    workspace!: Workspace;

    @ManyToOne(() => Device, (device) => device.sessions)
    @JoinColumn({ name: "device_id" })
    device!: Device;

    @OneToMany(() => Input, (input) => input.session)
    inputs!: Input[];
}
