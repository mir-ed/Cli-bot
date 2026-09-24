import { Entity, PrimaryColumn, Column, OneToMany, OneToOne } from "typeorm";
import {Device} from "./Device.js";
import {Workspace} from "./Workspace.js";
import { UserConfigPreferences } from "./UserConfigPreferences.js";
import { UserSecretsCredentials } from "./UserSecretsCredentials.js";

@Entity("users")
export class User {
    @PrimaryColumn("text")
    user_id!: string;

    @Column("text")
    username!: string;

    @Column("text")
    user_description!: string;

    @OneToMany(()=> Device, (device) => device.owner)
    devices!: Device[];

    @OneToMany (()=>Workspace, (workspace)=>workspace.owner)
    workspace!: Workspace[];

    @OneToOne ( ()=> UserConfigPreferences, (config)=> config.user)
    config!: UserConfigPreferences[];

    @OneToMany ( ()=> UserSecretsCredentials, (credential)=> credential.user)
    credential!: UserSecretsCredentials[];
}