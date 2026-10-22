export const durationError = "Elige al menos 15 minutos, en pasos de 5.";
export function validServiceDuration(value: number) {
  return Number.isSafeInteger(value) && value >= 15 && value % 5 === 0;
}
