import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "@xtaskjs/typeorm";

@Entity("users")
export class UserWriteEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 120 })
  displayName!: string;

  @Column({ type: "varchar", length: 180, unique: true })
  email!: string;

  @CreateDateColumn({ type: "timestamp" })
  createdAt!: Date;
}