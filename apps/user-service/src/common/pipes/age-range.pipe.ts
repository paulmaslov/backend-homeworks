import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";

// минимальная форма, которую пайп умеет проверять - так он не привязан
// к конкретному dto и подойдет к любому запросу с диапазоном возраста
interface AgeRange {
    readonly ageFrom: number;
    readonly ageTo: number;
}

@Injectable()
export class AgeRangePipe implements PipeTransform<AgeRange, AgeRange> {
    transform(value: AgeRange): AgeRange {
        if (value.ageFrom > value.ageTo) {
            throw new BadRequestException(
                "ageTo must not be less than ageFrom",
            );
        }

        return value;
    }
}
