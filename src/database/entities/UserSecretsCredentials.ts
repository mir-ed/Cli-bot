import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn} from "typeorm";
import {User} from "./User.js";
import type { Relation } from "typeorm";
import { credentialType, credentialStatus } from "../enums/enum.js";

@Entity("user_secrets_credentials")
export class UserSecretsCredentials {
    @PrimaryGeneratedColumn("uuid")
    credential_id!: string;

    @Column("text")
    user_id!: string;

    @Column({
        type : "text",
        enum : credentialType
    })
    credential_type!: credentialType;

    @Column("text")
    provider!: string;

    @Column("text")
    credential_name!: string;

    @Column("text")
    credential_value!: string;

    @Column({
        type: "text",
        enum: credentialStatus
    })
    status!: credentialStatus;

    @Column("text")
    created_at!: string;

    @Column("text")
    updated_at!: string;

    @Column("text", { nullable: true })
    expires_at!: string | null;

    @ManyToOne(()=> User, (user) => user.credential)
    @JoinColumn({name : "user_id"})
    user!: Relation<User>;
}