import { Entity, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { WorkspaceDevice } from "./WorkspaceDevice.js";
import { User } from "./User.js";
import { Session } from "./Session.js";
import { OSname, SynchronizationState } from "../enums/enum.js";

@Entity("devices")
export class Device {
    @PrimaryColumn("text")
    device_id!: string;

    @Column("text")
    owner_id!: string;

    @Column("text")
    device_name!: string;

    @Column("text")
    device_label!: string;

    @Column({
        type: "text",
        enum: OSname
    })
    os_name!: OSname;

    @Column("text")
    os_version!: string;

    @Column("text")
    os_build!: string;

    @Column("text")
    architecture!: string;

    @Column("text")
    device_model!: string;

    @Column("text")
    device_manufacturer!: string;

    @Column("text")
    hostname!: string;

    @Column("text")
    app_version!: string;

    @Column("text", { unique: true })
    installation_id!: string;

    @Column({
        type: "text",
        enum: SynchronizationState
    })
    synchronization_state!: SynchronizationState;

    @Column("text")
    updated_at!: string;

    @Column("text")
    last_seen!: string;

    @Column("text")
    created_at!: string;

    @ManyToOne( ()=> User, (user)=> user.devices)
    @JoinColumn({ name: "owner_id"})
    owner!: User;


    @OneToMany( ()=>WorkspaceDevice, (workspaceDevice)=>workspaceDevice.device)
    workspace_devices !: WorkspaceDevice[]

    @OneToMany(()=>Session, (session)=> session.device)
    sessions!: Session[];
}