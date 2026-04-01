import {
  Column,
  Entity,
  PrimaryColumn,
} from "@xtaskjs/typeorm";

@Entity("user_projections")
export class UserProjectionEntity {
  @PrimaryColumn({ type: "varchar", length: 80 })
  id!: string;

  @Column({ type: "varchar", length: 120 })
  displayName!: string;

  @Column({ type: "varchar", length: 180 })
  email!: string;

  @Column({ type: "varchar", length: 40 })
  status!: string;

  @Column({ type: "datetime" })
  registeredAt!: Date;

  @Column({ type: "datetime", nullable: true })
  verifiedAt?: Date | null;

  @Column({ type: "int", default: 0 })
  version!: number;
}