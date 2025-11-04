
import { IsNotEmpty, IsNumber, Min } from 'class-validator'

export class ReserveDto {
  @IsNotEmpty()
  batchId: string;

  @IsNotEmpty()
  orderItemId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  quantity: number;
}
