import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface IsExistsValidationArguments extends ValidationArguments {
  constraints: [string, string?]; // [modelName, columnName?]
}

@Injectable()
@ValidatorConstraint({ name: 'isExists', async: true })
export class IsExistsConstraint implements ValidatorConstraintInterface {
  constructor(private prisma: PrismaService) {}

  async validate(
    value: any,
    args: IsExistsValidationArguments,
  ): Promise<boolean> {
    if (!value) return true; // Let @IsNotEmpty handle empty values

    const [modelName, columnName = 'id'] = args.constraints;

    try {
      const model = (this.prisma as any)[modelName];
      if (!model) return false;

      const existing = await model.findFirst({
        where: { [columnName]: value },
      });

      return !!existing;
    } catch {
      return false;
    }
  }

  defaultMessage(args: IsExistsValidationArguments): string {
    const [modelName, columnName = 'id'] = args.constraints;
    return `${modelName} with this ${columnName} does not exist`;
  }
}

export function IsExists(
  modelName: string,
  columnName?: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [modelName, columnName],
      validator: IsExistsConstraint,
    });
  };
}
