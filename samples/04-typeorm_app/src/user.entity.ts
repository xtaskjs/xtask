import { Column, Entity, PrimaryGeneratedColumn } from "@xtaskjs/typeorm";

@Entity("users")
export class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 120 })
  name!: string;
}
