import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn} from "typeorm";
import type { Relation } from "typeorm";
import { Workspace } from "./Workspace.js";   
import { Device } from "./Device.js";          

@Entity("workspace_devices")
export class WorkspaceDevice {
    @PrimaryColumn("text")
    workspace_id!: string;

    @PrimaryColumn("text")
    device_id!: string;

    @Column("text")
    path!: string;

    @ManyToOne(() => Workspace, (workspace) => workspace.workspace_devices)
    @JoinColumn({ name: "workspace_id" })
    workspace!: Relation<Workspace>;     

    @ManyToOne(() => Device, (device) => device.workspace_devices)
    @JoinColumn({ name: "device_id" })
    device!: Relation<Device>;
}