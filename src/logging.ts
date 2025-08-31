import { logLevel } from "./parameters.js";
import signale from "signale";

const LOGGER = new signale.Signale({
	disabled: false,
	interactive: false,
	logLevel: logLevel,
	scope: "rbxtsas",
	secrets: [],
	stream: process.stdout,
});

export default LOGGER;
