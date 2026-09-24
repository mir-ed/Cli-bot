import { Entity, PrimaryColumn, Column, OneToMany, OneToOne, JoinColumn } from "typeorm";
import type { Relation } from "typeorm";
import {User} from "./User.js"

@Entity("user_config_preferences")
export class UserConfigPreferences {
    @PrimaryColumn("text")
    config_id!: string;

    @Column("text", {unique : true})
    user_id!: string;

    @Column("text")
    ai_provider!: string;

    @Column("text")
    ai_model!: string;

    @Column("text")
    ai_configurations!: string;

    @Column("text")
    permission_settings!: string;

    @Column("text")
    terminal_preferences!: string;

    @Column("text")
    notification_preferences!: string;

    @Column("text")
    interface_preferences!: string;

    @Column("text")
    updated_at!: string;

    @OneToOne( () => User, (user)=> user.config)
    @JoinColumn({name : "user_id"})
    user!: Relation<User>;
}