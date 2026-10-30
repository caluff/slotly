import { productionConfigErrors } from "../lib/production-config.ts";

const errors = productionConfigErrors(process.env);
if (errors.length) {
  console.error("Configuración de producción rechazada:\n" + errors.map(error => "- " + error).join("\n"));
  process.exitCode = 1;
} else console.log("Configuración comprobada; ninguna credencial se imprime.");
