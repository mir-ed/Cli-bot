import { Entity, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn, Unique} from "typeorm";
import { User } from "./User.js";
import { WorkspaceDevice } from "./WorkspaceDevice.js";
import { Session } from "./Session.js";

@Entity("workspaces")
@Unique(["owner_id", "workspace_name"])
export class Workspace {
    @PrimaryColumn("text")
    workspace_id!: string;

    @Column("text")
    owner_id!: string;

    @Column("text")
    workspace_name!: string;

    @Column("text")
    workspace_description!: string;

    @Column("text")
    created_at!: string;


    @ManyToOne(() => User, (user) => user.workspace)
    @JoinColumn({ name: "owner_id" })
    owner!: User;


    @OneToMany(() => WorkspaceDevice, (workspaceDevice) => workspaceDevice.workspace)
    workspace_devices !: WorkspaceDevice[]

    @OneToMany(() => Session, (session) => session.workspace)
    sessions!: Session[];
}