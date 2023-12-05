import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsOneOfOptions(property: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isOneOfOptions',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          return Array.isArray(relatedValue) && relatedValue.includes(value);
        },
      },
    });
  };
}
