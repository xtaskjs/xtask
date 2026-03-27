import { Column, Entity, PrimaryColumn } from "@xtaskjs/typeorm";

@Entity("user_projection")
export class UserProjectionEntity {
  @PrimaryColumn()
  id!: number;

  @Column({ type: "varchar", length: 120 })
  displayName!: string;

  @Column({ type: "varchar", length: 180 })
  email!: string;

  @Column({ type: "timestamp" })
  createdAt!: Date;

  @Column({ type: "varchar", length: 24 })
  status!: string;
}