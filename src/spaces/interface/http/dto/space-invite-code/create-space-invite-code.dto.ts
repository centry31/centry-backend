import { Type } from 'class-transformer';
import { IsDate, IsInt, IsPositive, Min } from 'class-validator';

export class CreateSpaceInviteCodeDto {
	@IsInt({ message: 'Количество использований должно быть целым числом' })
	@IsPositive({ message: 'Количество использований должно быть больше нуля' })
	@Min(1, { message: 'Минимум одно использование' })
	maxUses: number;

	@Type(() => Date)
	@IsDate({ message: 'Некорректный формат даты истечения' })
	expiresAt: Date;
}
